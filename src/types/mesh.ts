import { throws } from "assert";
import { vec3 } from "gl-matrix"

interface Vertex {
    pos : vec3
    col : vec3
}

export class Mesh {
    buffer: GPUBuffer
    idxBuffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout

    vertCount: number = 0
    idxCount: number = 0
    positions: Array<vec3> = new Array<vec3>()
    colors: Array<vec3> = new Array<vec3>()
    faces: Array<Face> = new Array<Face>()
    vertDataVBO!: Float32Array
    idxDataVBO!: Uint32Array

    constructor(device: GPUDevice) {
        // x y r g b
        let verts : Array<Vertex> = new Array<Vertex>();
        verts.push({pos: [0.0, -0.5, -0.5], col: [0.0, 1.0, 0.0]});
        verts.push({pos: [0.0, 0.0, 0.5], col: [1.0, 0.0, 0.0]});
        verts.push({pos: [0.0, 0.5, -0.5], col: [0.0, 0.0, 1.0]});
        verts.push({pos: [0.0, 0.25, -1.0], col: [0.0, 1.0, 1.0]});
        verts.push({pos: [0.0, -0.25, -1.0], col: [1.0, 1.0, 0.0]});
        
        this.addFace(verts);

        this.populateVBO();

        // Create Vertex Data VBO
        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        const descriptor: GPUBufferDescriptor = {
            size: this.vertDataVBO.byteLength,
            usage: usage,
            mappedAtCreation: true
        }

        this.buffer = device.createBuffer(descriptor);
        new Float32Array(this.buffer.getMappedRange()).set(this.vertDataVBO);
        this.buffer.unmap();

        // Create Index Data VBO
        const idxUsage: GPUBufferUsageFlags = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;
        const idxDescriptor: GPUBufferDescriptor = {
            size: this.idxDataVBO.byteLength,
            usage: idxUsage,
            mappedAtCreation: true
        }

        this.idxBuffer = device.createBuffer(idxDescriptor);
        new Uint32Array(this.idxBuffer.getMappedRange()).set(this.idxDataVBO);
        this.idxBuffer.unmap();

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

    addFace(verts: Array<Vertex>, col?: vec3) {
        let indices : Array<number> = new Array<number>();
        for (let i = 0; i < verts.length; i++){
            indices.push(this.vertCount);
            this.addVertex(verts[i]);
        }
        if (col) {
            this.faces.push(new Face(indices, col));
        } else {
            this.faces.push(new Face(indices));
        }
    }

    populateVBO() {
        var verts : Array<number> = new Array<number>();
        var indices : Array<number> = new Array<number>();

        // Adding Vertices
        for (var i = 0; i < this.vertCount; i++){
            verts.push(this.positions[i][0]);
            verts.push(this.positions[i][1]);
            verts.push(this.positions[i][2]);
            verts.push(this.colors[i][0]);
            verts.push(this.colors[i][1]);
            verts.push(this.colors[i][2]);
        }

        // Adding indices
        for (let i = 0; i < this.faces.length; i++){
            const currFace : Face = this.faces[i];

            // Fan out method per face
            for (let j = 0; j < currFace.vertCount - 2; j++){
                indices.push(0);
                indices.push(j + 1);
                indices.push(j + 2);

                console.log("Adding Triangle")
                console.log([0, j + 1, j + 2]);
                console.log([currFace.verts[0], currFace.verts[j + 1], 
                    currFace.verts[j + 2]]);
            }
        }


        this.vertDataVBO = new Float32Array(verts);
        this.idxDataVBO = new Uint32Array(indices);

        this.idxCount = indices.length;
    }
}

class Face {
    vertCount: number = 0
    verts: Array<number> = new Array()
    color: vec3 | undefined

    constructor(verts: Array<number>, col?: vec3) {
        for (let i = 0; i < verts.length; i++){
            this.verts.push(verts[i]);
        }
        if (col) {
            this.color = col;
        }
        this.vertCount = verts.length;
    }

    addVertex(idx: number) {
        this.verts.push(idx);
        this.vertCount++;
    }
}