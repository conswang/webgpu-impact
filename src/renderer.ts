import shader from "./shaders/shaders.wgsl"
import { Mesh } from "./types/mesh";
import { Camera } from "./types/camera";
import { mat4 } from "gl-matrix"
import { threadId } from "worker_threads";

export class Renderer {
    canvas: HTMLCanvasElement;
    size: Array<number> = new Array<number>(2)
    
    // Device/Context objects
    adapter!: GPUAdapter; 
    device!: GPUDevice;
    context!: GPUCanvasContext;
    format!: GPUTextureFormat;

    // Pipeline objects
    uniformBuffer!: GPUBuffer;
    bindGroup!: GPUBindGroup;
    pipeline!: GPURenderPipeline;

    // Assets
    mesh!: Mesh;
    camera: Camera;

    // Time
    time: number = 0
    timeStep: number = 0.01

    // MSAA
    samples: number = 1

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.size[0] = canvas.clientWidth;
        this.size[1] = canvas.clientHeight;
        this.camera = new Camera(Math.PI / 4, canvas.width, canvas.height, 
            0.1, 10.0, [-5, 0, 2], [0, 0, 0], [0, 0, 1]);
    }

    async initialize() {
        await this.setupDevice();

        this.createAssets();

        await this.makePipeline();

        requestAnimationFrame(this.render);
    }

    async setupDevice() {
        this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();
        this.device = <GPUDevice> await this.adapter?.requestDevice();
        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format = "bgra8unorm";

        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });
    }

    async makePipeline() {
        this.uniformBuffer = this.device.createBuffer({
            size: 64 * 3,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });


        //  Bind groups are used specifically for uniforms
        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,

                    // Buffer is nothing, but we're specifying that we're using
                    // a buffer resource here.
                    buffer: {}
                }
            ]
        });

        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                }
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        this.pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: this.device.createShaderModule({
                    code: shader
                }),
                entryPoint: "vs_main",
                buffers: [this.mesh.bufferLayout]
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: shader
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

    createAssets() {
        this.mesh = new Mesh(this.device);
    }

    render = () => {
        // Passing in the transformation matrices to the uniform buffer
        this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>this.camera.model(this.time));
        this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>this.camera.view());
        this.device.queue.writeBuffer(this.uniformBuffer, 128, <ArrayBuffer>this.camera.project());
        
        const depthTexture = this.device.createTexture({
            size: this.size,
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.samples
          });
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();

        const texture = this.device.createTexture({
            size: this.size,
            sampleCount: this.samples,
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        const view = texture.createView();

        const renderPass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments : [{
                view : this.samples == 4 ? view : textureView,
                resolveTarget: this.samples == 4 ? textureView : undefined,
                clearValue : {r : 0.5, g : 0.0, b : 0.25, a : 1.0},
                loadOp : "clear",
                storeOp : "store"
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
        renderPass.setVertexBuffer(0, this.mesh.buffer);
        renderPass.draw(this.mesh.idxCount, 1, 0, 0);
        renderPass.end();

        this.device.queue.submit([commandEncoder.finish()]);

        requestAnimationFrame(this.render);

        this.time += this.timeStep;
    }
}