import shader from "./shaders/compute.wgsl"
import instance from "./shaders/instance.wgsl"

export class Computer {
    canvas: HTMLCanvasElement;
    
    // Device/Context objects
    adapter: GPUAdapter; 
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;

    // Pipeline objects
    c_bindGroup: GPUBindGroup;
    c_pipeline: GPUComputePipeline;

    renderPipeline: GPURenderPipeline;

    //Assets (?)
    color_buffer: GPUTexture;
    color_buffer_view: GPUTextureView;
    sampler: GPUSampler;

    // Time
    time: number = 0
    timeStep: number = 0.01

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    async initialize() {
        await this.setupDevice();

        await this.makePipeline();

        this.compute();
    }

    async setupDevice() {
        //Adapter around Physical GPU
        this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();
        
        //Wrapper around GPU functionality
        this.device = <GPUDevice> await this.adapter?.requestDevice();
        
        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });
    }

    async makePipeline() {
        const spriteShaderModule = this.device.createShaderModule({ code: instance });
        this.renderPipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: spriteShaderModule,
                entryPoint: 'vert_main',
                buffers: [
                    {
                      // instanced particles buffer
                      arrayStride: 4 * 4,
                      stepMode: 'instance',
                      attributes: [
                        {
                          // instance position
                          shaderLocation: 0,
                          offset: 0,
                          format: 'float32x2',
                        },
                        {
                          // instance velocity
                          shaderLocation: 1,
                          offset: 2 * 4,
                          format: 'float32x2',
                        },
                      ],
                    },
                    {
                      // vertex buffer
                      arrayStride: 2 * 4,
                      stepMode: 'vertex',
                      attributes: [
                        {
                          // vertex positions
                          shaderLocation: 2,
                          offset: 0,
                          format: 'float32x2',
                        },
                      ],
                    },
                  ],
                },
                fragment: {
                  module: spriteShaderModule,
                  entryPoint: 'frag_main',
                  targets: [
                    {
                      format: navigator.gpu.getPreferredCanvasFormat,
                    },
                  ],
                },
                primitive: {
                  topology: 'triangle-list',
                },
            });
        
        this.c_pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: shader,
                }),
                entryPoint: 'main',
            },
        });
    }

    createAssets(): void {
        
    }

    compute(): void {
        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();

        const compute_pass : GPUComputePassEncoder = commandEncoder.beginComputePass();
        compute_pass.setPipeline(this.c_pipeline);
        compute_pass.setBindGroup(0, this.c_bindGroup);
        compute_pass.dispatchWorkgroups(this.canvas.width, this.canvas.height, 1);
        compute_pass.end();

        this.device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(this.compute);
    }
}
