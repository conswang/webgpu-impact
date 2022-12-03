import shader from "./shaders/instance.wgsl"
import { Mesh } from "./types/mesh";
import { Camera } from "./types/camera";
import { MeshType } from "./types/mesh";
import { buffer } from "stream/consumers";
import internal from "stream";

export class Instancer {
    viewport: HTMLCanvasElement;
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    presentationFormat: GPUTextureFormat;
    camera: Camera;
    blade: Mesh;
    uniBuf: GPUBuffer;
    instanceBuf: GPUBuffer;
    bindGroup: GPUBindGroup;
    pipeline: GPURenderPipeline;
    numInstances: number;

    constructor(canvas: HTMLCanvasElement){
        this.viewport = canvas;
        this.camera = new Camera(Math.PI / 4, canvas.width, canvas.height, 
        0.1, 1000.0, [0, 5, 40], [0, 0, 0], [0, 1, 0]);

    }

    async init(){
        console.log("I'm going to shoot up a fucking walmart");
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
        this.setup();
        this.frame();
    }

    async setup(){
        /**** Writing Buffers ****/
        //Camera Buffer
        this.uniBuf = this.device.createBuffer({
            size: 512,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.device.queue.writeBuffer(this.uniBuf,   0,    <ArrayBuffer>this.camera.model(0));
        this.device.queue.writeBuffer(this.uniBuf,   64,   <ArrayBuffer>this.camera.view());
        this.device.queue.writeBuffer(this.uniBuf,   128,  <ArrayBuffer>this.camera.project());

        //Instance Data Buffer
        this.numInstances = 1000;
        let fieldWidth = 10;

        let instanceData = new Float32Array(4*this.numInstances);
        


        for (let i=0; i < instanceData.length / 4; i++){
            instanceData[i*4] = -fieldWidth + Math.random()*fieldWidth*2;
            instanceData[i*4+1] = 0.0;
            instanceData[i*4+2] = fieldWidth + Math.random()*fieldWidth*2;
        }

        this.instanceBuf = this.device.createBuffer({
            size: ((instanceData.byteLength + 3) & ~3), // 4*3*numInstances, // 128 isntances of vec3
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
          });
          
        this.device.queue.writeBuffer(this.instanceBuf,   
                                      0,   
                                      instanceData.buffer,
                                      instanceData.byteOffset,
                                      instanceData.byteLength);
        
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
        
        /**** Shader Modules ****/
        const instanceShader = this.device.createShaderModule({
            code: shader
        });

        /**** Pipelines ****/
        //Pipeline Layout
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [sceneUniformBindGroupLayout]
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
    }

    async frame(){
        console.log("in minecraft");


        const depthTextureDesc: GPUTextureDescriptor = 
        {
            size: [this.viewport.width, this.viewport.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        };

        const depthTexture = this.device.createTexture(depthTextureDesc);
        
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        const renderPass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
              colorAttachments : [{
                  view : textureView,
                  clearValue : {r : 0.1, g : 0.1, b : 0.1, a : 1.0},
                  loadOp : 'clear',
                  storeOp : 'store'
              }], 
              depthStencilAttachment: {
                  view: depthTexture.createView(),
            
                  depthClearValue: 1.0,
                  depthLoadOp: 'clear',
                  depthStoreOp: 'store',
                },
          })

          renderPass.setPipeline(this.pipeline);
          renderPass.setBindGroup(0, this.bindGroup);
          renderPass.setVertexBuffer(0, this.blade.buffer);
          renderPass.draw(this.blade.idxCount, this.numInstances, 0, 0);
          renderPass.end();
          this.device.queue.submit([commandEncoder.finish()]);
    }
}