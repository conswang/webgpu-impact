import shader from "./shaders/instance.wgsl"
import computeShader from "./shaders/compute.wgsl"
import floorShader from "./shaders/floor.wgsl"
import { Mesh } from "./types/grassMesh";
import { Camera } from "./types/camera";
import { MeshType } from "./types/grassMesh";
import { buffer } from "stream/consumers";
import internal from "stream";
import { vec3 } from "gl-matrix";
import { cp } from "fs";
import { Console } from "console";

export class Instancer {
    viewport: HTMLCanvasElement;
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    presentationFormat: GPUTextureFormat;
    camera: Camera;
    blade: Mesh;
    floor: Mesh;

    uniBuf: GPUBuffer;
    instanceBuf: GPUBuffer;
    tipBuf: GPUBuffer;
    forceBuf: GPUBuffer;
    readBuffer: GPUBuffer;
    uniBuffer: GPUBuffer;
    timeBuffer: GPUBuffer;
    
    bindGroup: GPUBindGroup;
    c_bindGroup: GPUBindGroup;
    
    pipeline: GPURenderPipeline;
    c_pipeline: GPUComputePipeline;
    
    numInstances: number;
    forces: vec3;
    timeData:  Float32Array

    size: number;
    depthTexture!: GPUTexture;  

    constructor(canvas: HTMLCanvasElement){
        this.viewport = canvas;
        this.camera = new Camera(Math.PI / 4, canvas.width, canvas.height, 
        0.1, 1000.0, [0, 7, 20], [0, 2, 0], [0, 1, 0]);
        this.forces = new Float32Array(4);
        this.timeData = new Float32Array(1);

    }

    async init(){
        this.adapter = await navigator.gpu.requestAdapter();
        this.device = await this.adapter.requestDevice();
        this.context = this.viewport.getContext("webgpu");
        this.presentationFormat = "bgra8unorm";
        const presentationSize = [this.viewport.width,
                            this.viewport.height]

        this.context.configure({
            device: this.device,
            format: this.presentationFormat,
            size: presentationSize
        });

        this.blade = new Mesh(this.device, MeshType.BLADE);
        this.floor = new Mesh(this.device, MeshType.PLANE);

        const depthTextureDesc: GPUTextureDescriptor = 
        {
            size: [this.viewport.width, this.viewport.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        };

        this.depthTexture = this.device.createTexture(depthTextureDesc);

        await this.setup();
        this.frame();
    }

    async setup(){
        /**** Shader Modules ****/
        const compShader = this.device.createShaderModule({
            code: computeShader
        });
        

        /**** Writing Buffers ****/
        //Camera Buffer
        this.uniBuf = this.device.createBuffer({
            size: 512,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.uniBuf,   0,    <ArrayBuffer>this.camera.model(0));
        this.device.queue.writeBuffer(this.uniBuf,   64,   <ArrayBuffer>this.camera.view());
        this.device.queue.writeBuffer(this.uniBuf,   128,  <ArrayBuffer>this.camera.project());
        
        //Force Buffer
        this.forceBuf = this.device.createBuffer({
            size: 256, //Fuck if I know what the proper size is
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        this.device.queue.writeBuffer(this.forceBuf, 0, <ArrayBuffer>this.forces)

        //Time Buffer
        this.timeBuffer = this.device.createBuffer({
            size: 16384, // 4, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
          });
          
          this.timeData[0] = 0.0;
          this.device.queue.writeBuffer(this.timeBuffer,   0,    this.timeData );
          

        //Instance Data Buffer
        this.numInstances = 1000;
        let fieldWidth = 10;

        let instanceData = new Float32Array(4*this.numInstances);

        for (let i=0; i < instanceData.length / 4; i++){
            instanceData[i*4] = 1 * (Math.random()-.5)*fieldWidth*2;
            instanceData[i*4+1] = 0.0;
            instanceData[i*4+2] = 1 * (Math.random()-.5)*fieldWidth*2;
        }
        
        this.size = ((instanceData.byteLength + 3) & ~3); 
        this.instanceBuf = this.device.createBuffer({
            size: this.size, // 4*3*numInstances, // 128 isntances of vec3
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST 
          });
          
        this.device.queue.writeBuffer(this.instanceBuf,   
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

        this.tipBuf = this.device.createBuffer({
            size: ((instanceData.byteLength + 3) & ~3), // 4*3*numInstances, // 128 isntances of vec3
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST |  GPUBufferUsage.COPY_SRC
          });
        
        this.device.queue.writeBuffer(this.tipBuf,   0,    tipPosData);
        this.tipBuf.unmap();
        
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

        this.c_bindGroup = this.device.createBindGroup({
            layout: computeBindGroupLayout,
            entries: [
                    {binding: 0, resource: {buffer: this.instanceBuf}},
                    {binding: 1, resource: {buffer: this.tipBuf}},
                    {binding: 2, resource: {buffer: this.timeBuffer}},
                    {binding: 3, resource: {buffer: initTipPos}}
            ]
        })

        /**** Pipelines ****/
        //Pipeline Layout
        const c_pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [computeBindGroupLayout]
        });

        //Pipeline Creation
        this.c_pipeline = this.device.createComputePipeline({
            layout: c_pipelineLayout,
            compute: {
                module: compShader,
                entryPoint: "cp_main"
            }
        });

        /*this.readBuffer = this.device.createBuffer({
            size: this.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        })
        await this.readBuffer.mapAsync(GPUMapMode.READ);
        const arrBuff = this.readBuffer.getMappedRange();
        console.log("Print out my buffer values please", new Float32Array(arrBuff));
        */

        this.uniBuffer = this.device.createBuffer({
            size: this.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.UNIFORM
        });
    }

    frame() {
        /**** Compute Step ****/
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(this.c_pipeline);
        computePass.setBindGroup(0, this.c_bindGroup);
        computePass.dispatchWorkgroups(64);
        computePass.end();

        // Encode commands for copying buffer to buffer.
        /*commandEncoder.copyBufferToBuffer(
            this.tipBuf, // source buffer
            0,                  // source offset
            this.readBuffer,         // destination buffer
            0,                  // destination offset
            16000 // size
        );*/
        
        const uniBuffer = this.device.createBuffer({
            size: this.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.UNIFORM
        })

        commandEncoder.copyBufferToBuffer(
            this.tipBuf, // source buffer
            0,                  // source offset
            this.uniBuffer,         // destination buffer
            0,                  // destination offset
            16000 // size
        );

        this.device.queue.submit([commandEncoder.finish()]);
        
        /**** Fuck you I'll make another group i don't give a fuck ****/
        
        const floorBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {}
                }
            ]
        });

        //Group Bindings
        const floorBindGroup = this.device.createBindGroup({
            layout: floorBindGroupLayout,
            entries: [
                {binding: 0, resource: {buffer: this.uniBuf}}
            ]
        });

        /**** Pipelines ****/
        //Pipeline Layout
        const floorPipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [floorBindGroupLayout]
        });

        const floorShaderModule = this.device.createShaderModule({
            code: floorShader
        });

        //Pipeline Creation
        const pipeline1 = this.device.createRenderPipeline({
            layout: floorPipelineLayout,
            vertex: {module: floorShaderModule,
                     entryPoint: 'vs_main',
                     buffers: [this.floor.bufferLayout]},
            fragment: {module: floorShaderModule,
                       entryPoint: 'fs_main',
                       targets: [{format: this.presentationFormat}]},
            primitive: {topology: "triangle-list"},
            depthStencil: {depthWriteEnabled: true,
                           depthCompare: "less",
                           format: "depth24plus"}
        });

        

        /**** RENDER PIPELINE SETUP SHIT ****/
        //Grass fuck you
        /**** Binding Groups ****/
        //Group 0 - Scene Uniforms
        //Layouts
        const sceneUniformBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {}
                },
                {
                    binding: 1, visibility: GPUShaderStage.VERTEX, buffer: {}
                }
            ]
        });

        //Group Bindings
        this.bindGroup = this.device.createBindGroup({
            layout: sceneUniformBindGroupLayout,
            entries: [
                {binding: 0, resource: {buffer: this.uniBuf}},
                {binding: 1, resource: {buffer: this.instanceBuf}}
            ]
        });

        //Group 1 - UpdatedData
        const tipBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {}
                }
            ]
        });

        //Group Bindings
        const tipBindGroup = this.device.createBindGroup({
            layout: tipBindGroupLayout,
            entries: [
                {binding: 0, resource: {buffer: this.uniBuffer}}
            ]
        });

        /**** Pipelines ****/
        //Pipeline Layout
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [sceneUniformBindGroupLayout, tipBindGroupLayout]
        });

        const instanceShader = this.device.createShaderModule({
            code: shader
        });

        //Pipeline Creation
        this.pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {module: instanceShader,
                     entryPoint: 'vs_main',
                     buffers: [this.blade.bufferLayout]},
            fragment: {module: instanceShader,
                       entryPoint: 'fs_main',
                       targets: [{format: this.presentationFormat}]},
            primitive: {topology: "triangle-list"},
            depthStencil: {depthWriteEnabled: true,
                           depthCompare: "less",
                           format: "depth24plus"}
        });

        /**** Render Step ****/
        const commandEncoder0 : GPUCommandEncoder = this.device.createCommandEncoder();
        const textureView0 : GPUTextureView = this.context.getCurrentTexture().createView();

        const renderPass0 : GPURenderPassEncoder = commandEncoder0.beginRenderPass({
              colorAttachments : [{
                  view : textureView0,
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

          
          renderPass0.setPipeline(pipeline1);
          renderPass0.setBindGroup(0, floorBindGroup);
          renderPass0.setVertexBuffer(0, this.floor.buffer);
          renderPass0.draw(this.floor.idxCount, 1, 0, 0);
          renderPass0.setPipeline(this.pipeline);
          renderPass0.setBindGroup(0, this.bindGroup);
          renderPass0.setBindGroup(1, tipBindGroup);
          renderPass0.setVertexBuffer(0, this.blade.buffer);
          renderPass0.draw(this.blade.idxCount, this.numInstances, 0, 0);
          renderPass0.end();
          this.device.queue.submit([commandEncoder0.finish()]);
          this.timeData[0] += 0.01;
          this.device.queue.writeBuffer(this.timeBuffer,   0,    this.timeData );
          requestAnimationFrame(() => this.frame());
    }
}