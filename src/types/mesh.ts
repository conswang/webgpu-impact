import { throws } from "assert";
import { vec3 } from "gl-matrix"

interface Vertex {
    pos : vec3
    col : vec3
}

export class Mesh {
    buffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout

    vertCount: number = 0
    positions: Array<vec3> = new Array()
    colors: Array<vec3> = new Array()
    vertDataVBO!: Float32Array

    constructor(device: GPUDevice) {
        // x y r g b
        this.addVertex({pos: [0.0, 0.0, 0.5], col: [1.0, 0.0, 0.0]});
        this.addVertex({pos: [0.0, -0.5, -0.5], col: [0.0, 1.0, 0.0]});
        this.addVertex({pos: [0.0, 0.5, -0.5], col: [0.0, 0.0, 1.0]});        

        this.populateVBO();

        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        const descriptor: GPUBufferDescriptor = {
            size: this.vertDataVBO.byteLength,
            usage: usage,
            mappedAtCreation: true
        }

        this.buffer = device.createBuffer(descriptor);
        new Float32Array(this.buffer.getMappedRange()).set(this.vertDataVBO);
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

    addVertex(vert: Vertex) {
        console.log("adding vertex");
        console.log(vert.pos);
        console.log(vert.col);
        this.positions.push(vert.pos);
        this.colors.push(vert.col);
        this.vertCount++;
    }

    populateVBO() {
        var verts : Array<number> = new Array<number>();
        for (var i = 0; i < this.vertCount; i++){
            verts.push(this.positions[i][0]);
            verts.push(this.positions[i][1]);
            verts.push(this.positions[i][2]);
            verts.push(this.colors[i][0]);
            verts.push(this.colors[i][1]);
            verts.push(this.colors[i][2]);
        }
        this.vertDataVBO = new Float32Array(verts);
    }
}