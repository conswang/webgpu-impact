import shader from "./shaders/instance.wgsl"
import computeShader from "./shaders/compute.wgsl"
import floorShader from "./shaders/floor.wgsl"
import vertShader from "./shaders/vert.wgsl"
import fragShader from "./shaders/frag.wgsl"
import toonShader from "./shaders/toonFrag.wgsl"
import { Mesh } from "./types/mesh";
import { Camera } from "./types/camera";
import { VertexLayout } from "./types/mesh";
import { buffer } from "stream/consumers";
import internal from "stream";
import { vec3, vec4, mat4 } from "gl-matrix";
import { cp } from "fs";
import { Console } from "console";
import { inputs } from "./types/inputs"

export class Instancer {
    canvas: HTMLCanvasElement;
    presentationSize: Array<number> = new Array<number>(2)

    // Device/Context objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;
    
    // Assets
    camera: Camera;
    blade: Mesh;
    floor: Mesh;
    mesh: Mesh;

    // Vertex shader uniform buffer
    vertBuffer: GPUBuffer;

    // Fragment shader uniform buffer
    fragBuffer: GPUBuffer;
    
    // Grass Positions
    instanceBuffer: GPUBuffer;
    
    // Grass tip offset from position
    tipBuffer: GPUBuffer;
    
    // Contains tip offset information in a uniform
    uniformTipBuffer: GPUBuffer;
    
    // Timestamp
    timeBuffer: GPUBuffer;
    
    // Bind Groups
    bindGroup: GPUBindGroup;
    floorBindGroup: GPUBindGroup;
    grassBindGroup: GPUBindGroup;
    computeBindGroup: GPUBindGroup;
    
    // Pipelines
    genericPipeline: GPURenderPipeline;
    grassPipeline: GPURenderPipeline;
    floorPipeline: GPURenderPipeline;
    computePipeline: GPUComputePipeline;
    
    numInstances: number;
    forces: vec3;
    timeData:  Float32Array
    instanceBufferSize: number;

    // Depth and Color Textures
    depthTexture!: GPUTexture;
    colorTexture!: GPUTexture;  

    // MSAA
    samples: number = 4

    constructor(canvas: HTMLCanvasElement){
        this.canvas = canvas;
        this.presentationSize[0] = canvas.clientWidth;
        this.presentationSize[1] = canvas.clientHeight;
        this.camera = new Camera(Math.PI / 4, canvas.width, canvas.height, 
        0.1, 1000.0, [0, 5, -20], [0, -0.1, 1]);
        this.forces = new Float32Array(4);
        this.timeData = new Float32Array(1);
    }

    async init(){
        await this.setupDevice();

        this.createAssets();

        await this.mesh.createTexture(this.device, "https://imgs.smoothradio.com/images/191589?width=1200&crop=1_1&signature=KHg-WnaLlH9KsZwE-qYgxTkaSpU=");

        this.depthTexture = this.device.createTexture({
            size: this.presentationSize,
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.samples
        });
        
        this.colorTexture = this.device.createTexture({
            size: this.presentationSize,
            sampleCount: this.samples,
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        await this.setup();

        await this.makePipeline();

        requestAnimationFrame(this.frame);
    }

    async setup(){
        /**** Shader Modules ****/
        const compShader = this.device.createShaderModule({
            code: computeShader
        });
        
        /**** Writing Buffers ****/
        //Camera Buffer
        this.vertBuffer = this.device.createBuffer({
            size: 64 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.fragBuffer = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        
        //Time Buffer
        this.timeBuffer = this.device.createBuffer({
            size: 16384, // 4, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
          
        this.timeData[0] = 0.0;

        //Instance Data Buffer
        this.numInstances = 1000;
        let fieldWidth = 10;

        let instanceData = new Float32Array(4*this.numInstances);

        for (let i=0; i < instanceData.length / 4; i++){
            instanceData[i*4] = 1 * (Math.random()-.5)*fieldWidth*2;
            instanceData[i*4+1] = 0.0;
            instanceData[i*4+2] = 1 * (Math.random()-.5)*fieldWidth*2;
        }
        
        this.instanceBufferSize = ((instanceData.byteLength + 3) & ~3); 
        this.instanceBuffer = this.device.createBuffer({
            size: this.instanceBufferSize, // 4*3*numInstances, // 128 isntances of vec3
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST 
          });
          
        this.device.queue.writeBuffer(this.instanceBuffer,   
                                      0,   
                                      instanceData.buffer,
                                      instanceData.byteOffset,
                                      instanceData.byteLength);
        
        //TipPos Buffer
        let tipPosData = new Float32Array(4*this.numInstances)
        for (let i=0; i < tipPosData.length / 4; i++){
            tipPosData[i*4] = 0.0;
            tipPosData[i*4+1] = Math.random()*1;
            tipPosData[i*4+2] = 0.0;
            tipPosData[i*4+3] = 1.0;
        }

        const initTipPos = this.device.createBuffer({
            size: ((instanceData.byteLength + 3) & ~3), // 4*3*numInstances, // 128 isntances of vec3
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST |  GPUBufferUsage.COPY_SRC
          });

        this.device.queue.writeBuffer(initTipPos,   0,    tipPosData);
        
        for (let i=0; i < tipPosData.length / 4; i++){
            tipPosData[i*4] = Math.random()*2;
            tipPosData[i*4+2] = Math.random()*2;
        }

        this.tipBuffer = this.device.createBuffer({
            size: ((instanceData.byteLength + 3) & ~3), // 4*3*numInstances, // 128 isntances of vec3
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST |  GPUBufferUsage.COPY_SRC
          });
        
        this.device.queue.writeBuffer(this.tipBuffer,   0,    tipPosData);
        this.tipBuffer.unmap();
        
        /**** COMPUTE PIPELINE SETUP SHIT ****/
        /**** Binding Groups ****/
        const computeBindGroupLayout = this.device.createBindGroupLayout({
            entries: [ 
                    {binding: 0, visibility: GPUShaderStage.COMPUTE,
                                              buffer: {}  },
                    {binding: 1, visibility: GPUShaderStage.COMPUTE,
                                              buffer: {type: 'storage'}},
                    {binding: 2, visibility: GPUShaderStage.COMPUTE,
                                              buffer: {}},
                    {binding: 3, visibility: GPUShaderStage.COMPUTE,
                                              buffer: {}}
                   ]
        });

        this.computeBindGroup = this.device.createBindGroup({
            layout: computeBindGroupLayout,
            entries: [
                    {
                        binding: 0, 
                        resource: {
                            buffer: this.instanceBuffer
                        }
                    },
                    {
                        binding: 1, 
                        resource: {
                            buffer: this.tipBuffer
                        }
                    },
                    {
                        binding: 2, 
                        resource: {
                            buffer: this.timeBuffer
                        }
                    },
                    {
                        binding: 3, 
                        resource: {
                            buffer: initTipPos
                        }
                    }
            ]
        })

        /**** Pipelines ****/
        //Pipeline Layout
        const computePipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [computeBindGroupLayout]
        });

        //Pipeline Creation
        this.computePipeline = this.device.createComputePipeline({
            layout: computePipelineLayout,
            compute: {
                module: compShader,
                entryPoint: "cp_main"
            }
        });

        this.uniformTipBuffer = this.device.createBuffer({
            size: this.instanceBufferSize,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.UNIFORM
        });
    }

    async setupDevice() {
        await this.secureAdapter();
        if (!this.adapter) return false;
        while(!this.device) {
            await this.secureAdapter();
            if (!this.adapter) return false;
        }

        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format = "bgra8unorm";

        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });
    }

    async secureAdapter() {
        if (!this.adapter){
            this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();
            if (!this.adapter) return null;
        }
        this.device = await this.adapter.requestDevice();
        this.device.lost.then((info) => {
            console.error("Device was lost.", info);
            this.setupDevice();
        })
    }

    createAssets() {
        this.blade = new Mesh({col: true, nor: false, uv: false});
        this.floor = new Mesh({col: true, nor: false, uv: false});
        this.mesh = new Mesh({col: false, nor: true, uv: true});

        this.blade.createBlade();
        this.floor.createPlane();
        this.mesh.createCube();

        this.blade.configureBuffer(this.device);
        this.floor.configureBuffer(this.device);
        this.mesh.configureBuffer(this.device);
    }

    async makePipeline() {
        const floorBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {}
                }
            ]
        });

        //Group Bindings
        this.floorBindGroup = this.device.createBindGroup({
            layout: floorBindGroupLayout,
            entries: [
                {binding: 0, resource: {buffer: this.vertBuffer}}
            ]
        });

        /**** Pipelines ****/
        //Pipeline Layout
        const floorShaderModule = this.device.createShaderModule({
            code: floorShader
        });

        //Pipeline Creation
        this.floorPipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({
                    bindGroupLayouts: [floorBindGroupLayout]
                }),
            vertex: {
                module: floorShaderModule,
                entryPoint: 'vs_main',
                buffers: [this.floor.bufferLayout]
            },
            fragment: {
                module: floorShaderModule,
                entryPoint: 'fs_main',
                targets: [{
                    format: this.format
                }]
            },
            primitive: {
                topology: "triangle-list"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            },
            multisample: {
                count: this.samples
            }
        });

        const sceneUniformBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, 
                    visibility: GPUShaderStage.VERTEX, 
                    buffer: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 4, 
                    visibility: GPUShaderStage.VERTEX, 
                    buffer: {}
                }
            ]
        });

        const sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });

        //Group Bindings
        this.bindGroup = this.device.createBindGroup({
            layout: sceneUniformBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.vertBuffer,
                        size: 64 * 4,
                        offset: 0
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.fragBuffer,
                        size: 32,
                        offset: 0
                    }
                },
                {
                    binding: 2,
                    resource: sampler
                },
                {
                    binding: 3,
                    resource: this.mesh.texture!.createView()
                },
                {
                    binding: 4, 
                    resource: {
                        buffer: this.instanceBuffer
                    }
                },
            ]
        });

        //Group 1 - UpdatedData
        const grassBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {}
                }
            ]
        });

        //Group Bindings
        this.grassBindGroup = this.device.createBindGroup({
            layout: grassBindGroupLayout,
            entries: [
                {binding: 0, resource: {buffer: this.uniformTipBuffer}}
            ]
        });

        /**** Pipelines ****/
        //Pipeline Layout
        const grassPipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [sceneUniformBindGroupLayout, grassBindGroupLayout]
        });

        const instanceShader = this.device.createShaderModule({
            code: shader
        });

        //Pipeline Creation
        this.grassPipeline = this.device.createRenderPipeline({
            layout: grassPipelineLayout,
            vertex: {
                module: instanceShader,
                entryPoint: 'vs_main',
                buffers: [this.blade.bufferLayout]
            },
            fragment: {
                module: instanceShader,
                entryPoint: 'fs_main',
                targets: [{
                    format: this.format
                }]
            },
            primitive: {
                topology: "triangle-list"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            },
            multisample: {
                count: this.samples
            }
        });

        const genericPipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [sceneUniformBindGroupLayout]
        });

        this.genericPipeline = this.device.createRenderPipeline({
            layout: genericPipelineLayout,
            vertex: {
                module: this.device.createShaderModule({
                    code: vertShader
                }),
                entryPoint: "vs_main",
                buffers: [this.mesh.bufferLayout]
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: toonShader
                }),
                entryPoint: "fs_main",
                targets: [{
                    format: this.format
                }]
            },
            primitive: {
                topology: "triangle-list"
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: "less",
                format: "depth24plus"
            },
            multisample: {
                count: this.samples
            }
        });
    }

    frame = () => {
        this.camera.updateAttributes(inputs, 0.1);

        this.mesh.rotateMesh();

        this.render();
        
        requestAnimationFrame(this.frame);
    }

    render() {
        this.device.queue.writeBuffer(this.vertBuffer,   64,   <ArrayBuffer>this.camera.view());
        this.device.queue.writeBuffer(this.vertBuffer,   128,  <ArrayBuffer>this.camera.project());

        var lightPos = new Float32Array(4);
        lightPos[0] = 5.0; lightPos[1] = 5.0; lightPos[2] = 0.0;lightPos[3] =  1.0;

        var eyePos: Float32Array = new Float32Array(4);
        eyePos[0] = this.camera.eye[0]; eyePos[1] = this.camera.eye[1]; eyePos[2] = this.camera.eye[2];
        eyePos[3] =  1.0;

        this.device.queue.writeBuffer(this.fragBuffer, 0, <ArrayBuffer>lightPos);
        this.device.queue.writeBuffer(this.fragBuffer, 16, <ArrayBuffer>eyePos);

        this.device.queue.writeBuffer(this.timeBuffer,   0,    this.timeData );

        /**** Compute Step ****/
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
        //const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(64);
        computePass.end();
        
        commandEncoder.copyBufferToBuffer(
            this.tipBuffer, // source buffer
            0,                  // source offset
            this.uniformTipBuffer,         // destination buffer
            0,                  // destination offset
            16000 // size
        );

        this.device.queue.submit([commandEncoder.finish()]);

        /**** Render Step ****/
        const commandEncoder0 : GPUCommandEncoder = this.device.createCommandEncoder();
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        const view = this.colorTexture.createView();

        const renderPass : GPURenderPassEncoder = commandEncoder0.beginRenderPass({
            colorAttachments : [{
                view : this.samples == 4 ? view : textureView,
                resolveTarget: this.samples == 4 ? textureView : undefined,
                clearValue : {r : 0.1, g : 0.6, b : 0.8, a : 1.0},
                loadOp : 'clear',
                storeOp : 'store'
            }], 
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
          })

          // DRAWING FLOOR
          var model : mat4 = this.floor.getModelMatrix();
          var normal : mat4 = mat4.create();
          mat4.invert(normal, model);
          mat4.transpose(normal, normal);

          this.device.queue.writeBuffer(this.vertBuffer,   0,    <ArrayBuffer>model);
          this.device.queue.writeBuffer(this.vertBuffer,   192,  <ArrayBuffer>normal);
  
          renderPass.setPipeline(this.floorPipeline);
          renderPass.setBindGroup(0, this.floorBindGroup);
          renderPass.setVertexBuffer(0, this.floor.buffer);
          renderPass.draw(this.floor.idxCount, 1, 0, 0);

          var model : mat4 = this.blade.getModelMatrix();
          var normal : mat4 = mat4.create();
          mat4.invert(normal, model);
          mat4.transpose(normal, normal);

          // DRAWING GRASS
          this.device.queue.writeBuffer(this.vertBuffer,   0,    <ArrayBuffer>model);
          this.device.queue.writeBuffer(this.vertBuffer,   192,  <ArrayBuffer>normal);

          renderPass.setPipeline(this.grassPipeline);
          renderPass.setBindGroup(0, this.bindGroup);
          renderPass.setBindGroup(1, this.grassBindGroup);
          renderPass.setVertexBuffer(0, this.blade.buffer);
          renderPass.draw(this.blade.idxCount, this.numInstances, 0, 0);

        //   var model : mat4 = this.mesh.getModelMatrix();
        //   var normal : mat4 = mat4.create();
        //   mat4.invert(normal, model);
        //   mat4.transpose(normal, normal);

        //   this.device.queue.writeBuffer(this.vertBuffer,   0,    <ArrayBuffer>model);
        //   this.device.queue.writeBuffer(this.vertBuffer,   192,  <ArrayBuffer>normal);

          renderPass.setPipeline(this.genericPipeline);
          renderPass.setBindGroup(0, this.bindGroup);
          renderPass.setVertexBuffer(0, this.mesh.buffer);
          renderPass.draw(this.mesh.idxCount, 1, 0, 0);  

          renderPass.end();
          this.device.queue.submit([commandEncoder0.finish()]);
          this.timeData[0] += 0.01;
          this.device.queue.writeBuffer(this.timeBuffer,   0,    this.timeData );
    }
}