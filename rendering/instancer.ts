import shader from "./shaders/instance.wgsl"
import computeShader from "./shaders/compute.wgsl"
import floorShader from "./shaders/floor.wgsl"
import vertShader from "./shaders/vert.wgsl"
import fragShader from "./shaders/frag.wgsl"
import toonShader from "./shaders/toonFrag.wgsl"
import skyBoxShader from "./shaders/skybox.wgsl"
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

    // Skybox Buffers
    skyBoxPosBuffer: GPUBuffer;
    skyBoxIdxBuffer: GPUBuffer;
    skyBoxTexCoordBuffer: GPUBuffer;
    skyBoxTexIdBuffer: GPUBuffer;
    
    // Bind Groups
    bindGroup: GPUBindGroup;
    floorBindGroup: GPUBindGroup;
    grassBindGroup: GPUBindGroup;
    skyBoxBindGroup: GPUBindGroup;
    computeBindGroup: GPUBindGroup;
    
    // Pipelines
    genericPipeline: GPURenderPipeline;
    grassPipeline: GPURenderPipeline;
    floorPipeline: GPURenderPipeline;
    skyBoxPipeline: GPURenderPipeline
    computePipeline: GPUComputePipeline;
    
    numInstances: number;
    forces: vec3;
    timeData:  Float32Array
    instanceBufferSize: number;

    // Depth and Color Textures
    depthTexture!: GPUTexture;
    colorTexture!: GPUTexture;  

    skyBoxTextureView: GPUTextureView;

    // MSAA
    samples: number = 4

    constructor(canvas: HTMLCanvasElement){
        this.canvas = canvas;
        this.presentationSize[0] = canvas.clientWidth;
        this.presentationSize[1] = canvas.clientHeight;
        this.camera = new Camera(Math.PI / 4, canvas.width, canvas.height, 
        0.1, 1000.0, [0, 5, -10], [0, -0.3, 1]);
        this.forces = new Float32Array(4);
        this.timeData = new Float32Array(1);
    }

    async init(){
        await this.setupDevice();

        this.createAssets();

        await this.mesh.createTexture(this.device, "./marbleThingy.jpg");

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
        await this.setupSkyBox();

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

    async setupSkyBox(){
        var positions =  new Float32Array([
            -30, 30, 30,  -30,-30, 30,   30,-30, 30,   30, 30, 30,    // front
            -30, 30,-30,  -30,-30,-30,   30,-30,-30,   30, 30,-30,    // back
             30,-30, 30,   30,-30,-30,   30, 30,-30,   30, 30, 30,    // left
            -30,-30, 30,  -30,-30,-30,  -30, 30,-30,  -30, 30, 30,    // right
            -30,-30,-30,  -30,-30, 30,   30,-30, 30,   30,-30,-30,    // bottom
            -30, 30,-30,  -30, 30, 30,   30, 30, 30,   30, 30,-30 ]); // top
        
        this.skyBoxPosBuffer = this.device.createBuffer({
            size:  positions.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.skyBoxPosBuffer,  0, positions);
        
        //Skybox Face Vertex Coordinates
        var indices = new Uint32Array([
            0, 1, 2,    0, 2, 3,   
            4, 5, 6,    4, 6, 7,
            8, 9, 10,   8, 10,11,  
            12,13,14, 	12,14,15,
            16,17,18,   16,18,19,  
            20,21,22,   20,22,23 ]);
        
        this.skyBoxIdxBuffer = this.device.createBuffer({
            size:  indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.skyBoxIdxBuffer ,  0, indices  );
        
        //Skybox UV coordinates 
        var texCoords  = new Float32Array([
            0,0, 0,1, 1,1,  1,0, 
            1,0, 1,1, 0,1,  0,0, 
          
            0,1, 1,1, 1,0, 0,0,
            1,1, 0,1, 0,0, 1,0,
          
            0,0, 1,0, 1,1,  0,1, 
            0,1, 1,1, 1,0, 0,0 ]);
            
        this.skyBoxTexCoordBuffer = this.device.createBuffer({
            size:  texCoords.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.skyBoxTexCoordBuffer, 0, texCoords);
        
        //Skybox texture indices
        var texIds = new Int32Array([
            0, 0, 0, 0, // front
            1, 1, 1, 1, // back
            2, 2, 2, 2, // right
            3, 3, 3, 3, // left
            4, 4, 4, 4, // up
            5, 5, 5, 5  // down
        ]);

        this.skyBoxTexIdBuffer = this.device.createBuffer({
            size:  texIds.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        
        this.device.queue.writeBuffer(this.skyBoxTexIdBuffer, 0, texIds);

        /** Is it texture time? I think it's texture time. **/
        //Writing Texture Data to a Texture
        let imgs = [ './blueSky.jpg', 
                    './blueSky.jpg',
                    './blueSky.jpg',
                    './blueSky.jpg',
                    './blueSky.jpg',
                    './blueSky.jpg'
                ]; 
        
        const skyTexture = this.device.createTexture({
            size: [1024, 1024, 6],
            format: this.format,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
        })

        let skyTextureData = new Uint8Array( 6 * 1024 * 1024 * 4);

        // scale/stretch all images 
        for (let i=0; i<imgs.length; i++)
        {
          const img = document.createElement("img");
          img.crossOrigin = "Anonymous";
          img.src = imgs[i];
          await img.decode();
        
          const imageCanvas = document.createElement('canvas');
          imageCanvas.width =  1024; // img width;
          imageCanvas.height = 1024; // img height;
          const imageCanvasContext = imageCanvas.getContext('2d');
          imageCanvasContext.drawImage(img, 0, 0, imageCanvas.width, imageCanvas.height);
          const imageData = imageCanvasContext.getImageData(0, 0, 1024, 1024);
        
          for (let x=0; x<1024*1024*4; x++)
          {
             skyTextureData[1024*1024*4*i + x] = imageData.data[ x ];
          }
        }

        this.device.queue.writeTexture(
            { texture: skyTexture },
            skyTextureData,
            {   offset     :  0,
                bytesPerRow:  1024* 4, // width * 4 (4 bytes per float)
                rowsPerImage: 1024     // height
             },
            [ 1024  ,  1024,  6  ]   );
        
        this.skyBoxTextureView = skyTexture.createView({
            format: this.format,
            dimension: '2d-array',
            aspect: 'all',
            arrayLayerCount: 6
        });

        //Skybox Specific Texture Sampler
        let textureSampler = this.device.createSampler({
            minFilter: "linear",
            magFilter: "linear"
        });
        /** End SkyBox buffers & textures **/
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

        this.mesh.scaleMesh(vec3.fromValues(2.0, 4.0, 2.0));

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
                    visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
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

        const skyBoxBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, 
                    visibility: GPUShaderStage.VERTEX, 
                    buffer: {}
                },
                {
                    binding: 1, 
                    visibility: GPUShaderStage.FRAGMENT, 
                    sampler: {}
                },
                {
                    binding: 2, 
                    visibility: GPUShaderStage.FRAGMENT, 
                    texture: {
                        sampleType: "float",
                        viewDimension: "2d-array"
                    }
                }
            ]
        });

        this.skyBoxBindGroup = this.device.createBindGroup({
            layout: skyBoxBindGroupLayout,
            entries: [
                {
                    binding: 0, 
                    resource: {
                        buffer: this.vertBuffer
                    }
                },
                {
                    binding: 1, 
                    resource: sampler
                },
                {
                    binding: 2, 
                    resource: this.skyBoxTextureView
                }
            ]
        });

        const skyBoxPipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [skyBoxBindGroupLayout]
        });


        this.skyBoxPipeline = this.device.createRenderPipeline({
            layout: skyBoxPipelineLayout,
            vertex: {
                module: this.device.createShaderModule({
                    code: skyBoxShader
                }),
                entryPoint: 'vs_main',
                buffers: [
                    { 
                        arrayStride: 12, 
                        attributes: [{ 
                            shaderLocation: 0,
                            format: "float32x3",
                            offset: 0  
                        }]        
                    },
                    { 
                        arrayStride: 8,  
                        attributes: [{ 
                            shaderLocation: 1,
                            format: "float32x2",
                            offset: 0  
                        }]        
                    },
                    { 
                        arrayStride: 4,  
                        attributes: [{ 
                            shaderLocation: 2,                   
                            format: "sint32", 
                            offset: 0  
                        }]        
                    }]
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: skyBoxShader
                }),
                entryPoint: 'fs_main',
                targets: [{
                    format: this.format
                }]
            },
            primitive: { 
                topology  : 'triangle-list',
                frontFace : "ccw",
                cullMode  : 'none',
                stripIndexFormat: undefined 
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

    resetVertBuffer(mesh: Mesh) {
        this.vertBuffer = this.vertBuffer = this.device.createBuffer({
            size: 64 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.makePipeline();

        var model : mat4 = mesh.getModelMatrix();
        var normal : mat4 = mat4.create();
        mat4.invert(normal, model);
        mat4.transpose(normal, normal);

        this.device.queue.writeBuffer(this.vertBuffer,   0,    <ArrayBuffer>model);
        this.device.queue.writeBuffer(this.vertBuffer,   64,   <ArrayBuffer>this.camera.view());
        this.device.queue.writeBuffer(this.vertBuffer,   128,  <ArrayBuffer>this.camera.project());  
        this.device.queue.writeBuffer(this.vertBuffer,   192,  <ArrayBuffer>normal);
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

        var lightVec : vec4 = vec4.fromValues(0.0, -5.0, 0.0, 1.0);

        var lightPos = new Float32Array(4);
        lightPos[0] = lightVec[0]; lightPos[1] = lightVec[1]; lightPos[2] = lightVec[2];lightPos[3] = lightVec[3];

        var eyeVec : vec4 = vec4.fromValues(this.camera.eye[0], this.camera.eye[1], this.camera.eye[2], 1.0);
        var viewProj : mat4 = mat4.create();
        // mat4.identity(viewProj);
        // mat4.mul(viewProj, this.mesh.getModelMatrix(), viewProj);
        // mat4.mul(viewProj, this.camera.view(), viewProj);
        // mat4.mul(viewProj, this.camera.project(), viewProj);
        // vec4.transformMat4(eyeVec, eyeVec, viewProj);
        eyeVec = vec4.fromValues(0.0, 0.0, 0.0, 0.0);
        var eyePos : Float32Array = new Float32Array(4);
        eyePos[0] = eyeVec[0]; eyePos[1] = eyeVec[1]; eyePos[2] = eyeVec[2];
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

        var model : mat4 = this.floor.getModelMatrix();
        var normal : mat4 = mat4.create();
        mat4.invert(normal, model);
        mat4.transpose(normal, normal);

        this.device.queue.writeBuffer(this.vertBuffer,   0,    <ArrayBuffer>model);
        this.device.queue.writeBuffer(this.vertBuffer,   192,  <ArrayBuffer>normal);

        //Rendering Skybox
        renderPass.setPipeline(this.skyBoxPipeline);
        renderPass.setBindGroup(0, this.skyBoxBindGroup);
        renderPass.setVertexBuffer(0, this.skyBoxPosBuffer);
        renderPass.setVertexBuffer(1, this.skyBoxTexCoordBuffer);
        renderPass.setVertexBuffer(2, this.skyBoxTexIdBuffer);
        renderPass.setIndexBuffer(this.skyBoxIdxBuffer, 'uint32');
        renderPass.drawIndexed(36, 1, 0, 0);


        // DRAWING FLOOR
        this.resetVertBuffer(this.floor);
        renderPass.setPipeline(this.floorPipeline);
        renderPass.setBindGroup(0, this.floorBindGroup);
        renderPass.setVertexBuffer(0, this.floor.buffer);
        renderPass.draw(this.floor.idxCount, 1, 0, 0);

        // DRAWING GRASS
        this.resetVertBuffer(this.blade);
        renderPass.setPipeline(this.grassPipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.setBindGroup(1, this.grassBindGroup);
        renderPass.setVertexBuffer(0, this.blade.buffer);
        renderPass.draw(this.blade.idxCount, this.numInstances, 0, 0);

        this.resetVertBuffer(this.mesh);
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