import { throws } from "assert";
import { vec3, vec2 } from "gl-matrix"

interface Vertex {
    pos : vec3
    col : vec3 | undefined
    uv : vec2 | undefined
}

export class Mesh {
    buffer: GPUBuffer
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
        this.createCube();

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
        this.colors.push(vert.col!);
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

    addFaceIndices(indices: Array<number>, col?: vec3) {
        if (col) {
            this.faces.push(new Face(indices, col));
        } else {
            this.faces.push(new Face(indices));
        }
    }

    populateVBO() {
        var verts : Array<number> = new Array<number>();

        for (let i = 0; i < this.faces.length; i++){
            const currFace : Face = this.faces[i];

            // Fan out method per face
            for (let j = 0; j < currFace.vertCount - 2; j++){
                const col1 : vec3 = (currFace.color != undefined) ? currFace.color! : this.colors[currFace.verts[0]];
                const col2 : vec3 = (currFace.color != undefined) ? currFace.color! : this.colors[currFace.verts[j + 1]];
                const col3 : vec3 = (currFace.color != undefined) ? currFace.color! : this.colors[currFace.verts[j + 2]];

                // Vert 0
                verts.push(this.positions[currFace.verts[0]][0]);
                verts.push(this.positions[currFace.verts[0]][1]);
                verts.push(this.positions[currFace.verts[0]][2]);
                verts.push(col1[0]);
                verts.push(col1[1]);
                verts.push(col1[2]);

                // Vert j + 1
                verts.push(this.positions[currFace.verts[j + 1]][0]);
                verts.push(this.positions[currFace.verts[j + 1]][1]);
                verts.push(this.positions[currFace.verts[j + 1]][2]);
                verts.push(col2[0]);
                verts.push(col2[1]);
                verts.push(col2[2]);
                                
                // Vert j + 2
                verts.push(this.positions[currFace.verts[j + 2]][0]);
                verts.push(this.positions[currFace.verts[j + 2]][1]);
                verts.push(this.positions[currFace.verts[j + 2]][2]);
                verts.push(col3[0]);
                verts.push(col3[1]);
                verts.push(col3[2]);

                this.idxCount += 3;
                console.log("Adding Triangle");
                console.log([0, j + 1, j + 2]);
                console.log([currFace.verts[0], currFace.verts[j + 1], 
                    currFace.verts[j + 2]]);
            }
        }

        this.vertDataVBO = new Float32Array(verts);
        console.log(this.vertCount);
        console.log(this.idxCount);
    }

    createCube() {
        let f0 : Array<Vertex> = new Array<Vertex>();
        f0.push({pos: [-1.0, -1.0, -1.0], col: [0.0, 1.0, 0.0], uv: undefined});
        f0.push({pos: [1.0, -1.0, -1.0], col: [1.0, 0.0, 0.0], uv: undefined});
        f0.push({pos: [1.0, 1.0, -1.0], col: [0.0, 0.0, 1.0], uv: undefined});
        f0.push({pos: [-1.0, 1.0, -1.0], col: [0.0, 1.0, 1.0], uv: undefined});

        let f1 : Array<Vertex> = new Array<Vertex>();
        f1.push({pos: [-1.0, -1.0, 1.0], col: [0.0, 1.0, 0.0], uv: undefined});
        f1.push({pos: [1.0, -1.0, 1.0], col: [1.0, 0.0, 0.0], uv: undefined});
        f1.push({pos: [1.0, 1.0, 1.0], col: [0.0, 0.0, 1.0], uv: undefined});
        f1.push({pos: [-1.0, 1.0, 1.0], col: [0.0, 1.0, 1.0], uv: undefined});

        let f2 : Array<Vertex> = new Array<Vertex>();
        f2.push({pos: [-1.0, -1.0, -1.0], col: [0.0, 1.0, 0.0], uv: undefined});
        f2.push({pos: [1.0, -1.0, -1.0], col: [1.0, 0.0, 0.0], uv: undefined});
        f2.push({pos: [1.0, -1.0, 1.0], col: [0.0, 0.0, 1.0], uv: undefined});
        f2.push({pos: [-1.0, -1.0, 1.0], col: [0.0, 1.0, 1.0], uv: undefined});

        let f3 : Array<Vertex> = new Array<Vertex>();
        f3.push({pos: [-1.0, 1.0, -1.0], col: [0.0, 1.0, 0.0], uv: undefined});
        f3.push({pos: [1.0, 1.0, -1.0], col: [1.0, 0.0, 0.0], uv: undefined});
        f3.push({pos: [1.0, 1.0, 1.0], col: [0.0, 0.0, 1.0], uv: undefined});
        f3.push({pos: [-1.0, 1.0, 1.0], col: [0.0, 1.0, 1.0], uv: undefined});

        let f4 : Array<Vertex> = new Array<Vertex>();
        f4.push({pos: [-1.0, -1.0, -1.0], col: [0.0, 1.0, 0.0], uv: undefined});
        f4.push({pos: [-1.0, 1.0, -1.0], col: [1.0, 0.0, 0.0], uv: undefined});
        f4.push({pos: [-1.0, 1.0, 1.0], col: [0.0, 0.0, 1.0], uv: undefined});
        f4.push({pos: [-1.0, -1.0, 1.0], col: [0.0, 1.0, 1.0], uv: undefined});

        let f5 : Array<Vertex> = new Array<Vertex>();
        f5.push({pos: [1.0, -1.0, -1.0], col: [0.0, 1.0, 0.0], uv: undefined});
        f5.push({pos: [1.0, 1.0, -1.0], col: [1.0, 0.0, 0.0], uv: undefined});
        f5.push({pos: [1.0, 1.0, 1.0], col: [0.0, 0.0, 1.0], uv: undefined});
        f5.push({pos: [1.0, -1.0, 1.0], col: [0.0, 1.0, 1.0], uv: undefined});

        this.addFace(f0, [1.0, 0.0, 0.0]);
        this.addFace(f1, [0.0, 1.0, 0.0]);
        this.addFace(f2, [0.0, 0.0, 1.0]);
        this.addFace(f3, [1.0, 0.0, 1.0]);
        this.addFace(f4, [1.0, 1.0, 0.0]);
        this.addFace(f5, [0.0, 1.0, 1.0]);
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
