// import shader from "./shaders/shaders.wgsl"
import vertShader from "./shaders/vert.wgsl"
import fragShader from "./shaders/frag.wgsl"
import toonShader from "./shaders/toonFrag.wgsl"
import outlineShader from "./shaders/outline.wgsl"
import { Mesh } from "./types/mesh";
import { Camera } from "./types/camera";
import { mat4, vec4 } from "gl-matrix"
import { threadId } from "worker_threads";
import { Light } from "./types/light";
import { inputs } from "./types/inputs";

export class Renderer {
    canvas: HTMLCanvasElement;
    size: Array<number> = new Array<number>(2)
    
    // Device/Context objects
    adapter!: GPUAdapter; 
    device!: GPUDevice;
    context!: GPUCanvasContext;
    format!: GPUTextureFormat;

    // Pipeline objects
    vertBuffer!: GPUBuffer;
    fragBuffer!: GPUBuffer;
    bindGroup!: GPUBindGroup;
    pipeline!: GPURenderPipeline;

    // Depth and Color Textures
    depthTexture!: GPUTexture;
    colorTexture!: GPUTexture;

    // Assets
    mesh!: Mesh;
    camera: Camera;
    light!: Light;

    // Time
    time: number = 0
    timeStep: number = 0.01

    // MSAA
    samples: number = 4

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.size[0] = canvas.clientWidth;
        this.size[1] = canvas.clientHeight;
        this.camera = new Camera(Math.PI / 4, canvas.width, canvas.height, 
            0.1, 50.0, [0, 0, -5], [0, 0, 0], [0, 1, 0]);
        this.light = new Light([1.0, 2.0, 0.0], [1.0, 1.0, 1.0]);
    }

    async initialize() {
        await this.setupDevice();

        this.createAssets();

        await this.mesh.createTexture(this.device, "https://imgs.smoothradio.com/images/191589?width=1200&crop=1_1&signature=KHg-WnaLlH9KsZwE-qYgxTkaSpU=");

        await this.makePipeline();

        requestAnimationFrame(this.frame);
    }

    waitForTexture() {
        if(typeof this.mesh.texture !== "undefined") {
            //variable exists, do what you want
            if (this.mesh.texture){
                console.log("Texture Loaded");
            } else {
                console.log("Texture Not Loaded");
            }
        }
        else {
            setTimeout(this.waitForTexture, 250);
        }
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

    // To resolve GPU Lost Connection error
    // Source: https://github.com/gpuweb/gpuweb/blob/main/design/ErrorHandling.md
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

    async makePipeline() {
        this.vertBuffer = this.device.createBuffer({
            size: 64 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.fragBuffer = this.device.createBuffer({
            size: 32,
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
                }
            ]
        });
        const sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });

        console.log("TEXTURE NEEDED");

        await this.waitForTexture();

        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
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
                    resource: this.mesh.texture!.texture!.createView()
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

        this.depthTexture = this.device.createTexture({
            size: this.size,
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            sampleCount: this.samples
        });
        
        this.colorTexture = this.device.createTexture({
            size: this.size,
            sampleCount: this.samples,
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    createAssets() {
        this.mesh = new Mesh(this.device);
    }

    frame = () => {
        this.camera.updateAttributes(inputs, 0.1);
        this.mesh.rotateMesh();
        this.render();
        requestAnimationFrame(this.frame);
        this.time += this.timeStep;
    }

    render() {
        // Passing in the transformation matrices to the uniform buffer
        var model : mat4 = this.mesh.getModelMatrix();
        var normal : mat4 = mat4.create();
        mat4.invert(normal, model);
        mat4.transpose(normal, normal);

        this.device.queue.writeBuffer(this.vertBuffer, 0, <ArrayBuffer>model);
        this.device.queue.writeBuffer(this.vertBuffer, 64, <ArrayBuffer>this.camera.view());
        this.device.queue.writeBuffer(this.vertBuffer, 128, <ArrayBuffer>this.camera.project());
        this.device.queue.writeBuffer(this.vertBuffer, 192, <ArrayBuffer>normal);

        let lightPos: Float32Array = new Float32Array(4);
        lightPos[0] = this.light.pos[0]; lightPos[1] = this.light.pos[1]; lightPos[2] = this.light.pos[2];
        lightPos[3] =  1.0;
        let eyePos: Float32Array = new Float32Array(4);
        eyePos[0] = this.camera.eye[0]; eyePos[1] = this.camera.eye[1]; eyePos[2] = this.camera.eye[2];
        eyePos[3] =  1.0;

        this.device.queue.writeBuffer(this.fragBuffer, 0, <ArrayBuffer>lightPos);
        this.device.queue.writeBuffer(this.fragBuffer, 16, <ArrayBuffer>eyePos);
        
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();
        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();
        const view = this.colorTexture.createView();

        const renderPass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments : [{
                view : this.samples == 4 ? view : textureView,
                resolveTarget: this.samples == 4 ? textureView : undefined,
                clearValue : {r : 0.5, g : 0.0, b : 0.25, a : 1.0},
                loadOp : "clear",
                storeOp : "store"
            }], 
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
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
    }
}