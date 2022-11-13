import { throws } from "assert";
import { vec3 } from "gl-matrix"

export class TriangleMesh {
    buffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout

    positions: Array<vec3> = new Array()
    colors: Array<vec3> = new Array()
    vertDataVBO!: Float32Array

    constructor(device: GPUDevice) {
        // x y r g b
        this.populateVBO();
        
        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        const descriptor: GPUBufferDescriptor = {
            size: this.vertDataVBO.byteLength,
            usage: usage,
            mappedAtCreation: true
        }

        this.buffer = device.createBuffer(descriptor);
        new Float32Array(this.buffer.getMappedRange()).set(verts);
        this.buffer.unmap();

        this.bufferLayout = {
            arrayStride: 24,
            attributes: [
                {
                    shaderLocation: 0,
                    format: "float32x3",
                    offset: 0
                },
                {
                    shaderLocation: 1,
                    format: "float32x3",
                    offset: 12
                }
            ]
        }
    }

    populateVBO() {
        // TODO: change from harcoding to using this.positions, this.colors
        this.vertDataVBO = new Float32Array(
            [
                0.0, 0.0, 0.5, 1.0, 0.0, 0.0,
                0.0, -0.5, -0.5, 0.0, 1.0, 0.0,
                0.0, 0.5, -0.5, 0.0, 0.0, 1.0
            ]
        )
    }
}