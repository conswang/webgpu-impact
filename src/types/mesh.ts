import { throws } from "assert";
import { vec3, vec2 } from "gl-matrix"
import { Texture } from "./texture"
import { isArrayLiteralExpression } from "typescript";

interface Vertex {
    pos : vec3
    nor : vec3
    uv : vec2
}

export class Mesh {
    buffer: GPUBuffer;
    bufferLayout: GPUVertexBufferLayout;

    vertCount: number = 0
    idxCount: number = 0
    positions: Array<vec3> = new Array<vec3>()
    normals: Array<vec3> = new Array<vec3>()
    uvs: Array<vec2> = new Array<vec2>()
    faces: Array<Face> = new Array<Face>()
    texture: Texture | undefined = undefined

    vertDataVBO!: Float32Array;
    idxDataVBO!: Uint32Array;

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
            arrayStride: 32,
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
                },
                {
                    shaderLocation: 2,
                    format: "float32x2",
                    offset: 24
                }
            ]
        }
    }

    async createTexture(device: GPUDevice, filePath: string) {
        this.texture = new Texture(filePath);
        await this.texture.create(device);
    }

    addVertex(vert: Vertex) {
        console.log("adding vertex");
        console.log(vert.pos);
        console.log(vert.nor);
        console.log(vert.uv);
        this.positions.push(vert.pos);
        this.normals.push(vert.nor);
        this.uvs.push(vert.uv!);
        this.vertCount++;
    }

    addFace(verts: Array<Vertex>) {
        let indices : Array<number> = new Array<number>();
        for (let i = 0; i < verts.length; i++){
            indices.push(this.vertCount);
            this.addVertex(verts[i]);
        }
        this.faces.push(new Face(indices));
    }

    addFaceIndices(indices: Array<number>) {
        this.faces.push(new Face(indices));
    }

    populateVBO() {
        var verts : Array<number> = new Array<number>();

        for (let i = 0; i < this.faces.length; i++){
            const currFace : Face = this.faces[i];

            // Fan out method per face
            for (let j = 0; j < currFace.vertCount - 2; j++){
                const pos1 : vec3 = this.positions[currFace.verts[0]];
                const pos2 : vec3 = this.positions[currFace.verts[j + 1]];
                const pos3 : vec3 = this.positions[currFace.verts[j + 2]];

                const nor1 : vec3 = this.normals[currFace.verts[0]];
                const nor2 : vec3 = this.normals[currFace.verts[j + 1]];
                const nor3 : vec3 = this.normals[currFace.verts[j + 2]];

                const uv1 : vec2 = this.uvs[currFace.verts[0]];
                const uv2 : vec2 = this.uvs[currFace.verts[j + 1]];
                const uv3 : vec2 = this.uvs[currFace.verts[j + 2]];

                // Vert 0
                verts.push(pos1[0]);
                verts.push(pos1[1]);
                verts.push(pos1[2]);
                verts.push(nor1[0]);
                verts.push(nor1[1]);
                verts.push(nor1[2]);
                verts.push(uv1[0]);
                verts.push(uv1[1]);

                // Vert j + 1
                verts.push(pos2[0]);
                verts.push(pos2[1]);
                verts.push(pos2[2]);
                verts.push(nor2[0]);
                verts.push(nor2[1]);
                verts.push(nor2[2]);
                verts.push(uv2[0]);
                verts.push(uv2[1]);
                                
                // Vert j + 2
                verts.push(pos3[0]);
                verts.push(pos3[1]);
                verts.push(pos3[2]);
                verts.push(nor3[0]);
                verts.push(nor3[1]);
                verts.push(nor3[2]);
                verts.push(uv3[0]);
                verts.push(uv3[1]);

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
        f0.push({pos: [-1.0, -1.0, -1.0], nor: [0.0, 0.0, -1.0], uv: [0.0, 0.0]});
        f0.push({pos: [1.0, -1.0, -1.0], nor: [0.0, 0.0, -1.0], uv: [0.0, 1.0]});
        f0.push({pos: [1.0, 1.0, -1.0], nor: [0.0, 0.0, -1.0], uv: [1.0, 1.0]});
        f0.push({pos: [-1.0, 1.0, -1.0], nor: [0.0, 0.0, -1.0], uv: [1.0, 0.0]});

        let f1 : Array<Vertex> = new Array<Vertex>();
        f1.push({pos: [-1.0, -1.0, 1.0], nor: [0.0, 0.0, 1.0], uv: [0.0, 0.0]});
        f1.push({pos: [1.0, -1.0, 1.0], nor: [0.0, 0.0, 1.0], uv: [0.0, 1.0]});
        f1.push({pos: [1.0, 1.0, 1.0], nor: [0.0, 0.0, 1.0], uv: [1.0, 1.0]});
        f1.push({pos: [-1.0, 1.0, 1.0], nor: [0.0, 0.0, 1.0], uv: [1.0, 0.0]});

        let f2 : Array<Vertex> = new Array<Vertex>();
        f2.push({pos: [-1.0, -1.0, -1.0], nor: [0.0, -1.0, 0.0], uv: [0.0, 0.0]});
        f2.push({pos: [1.0, -1.0, -1.0], nor: [0.0, -1.0, 0.0], uv: [0.0, 1.0]});
        f2.push({pos: [1.0, -1.0, 1.0], nor: [0.0, -1.0, 0.0], uv: [1.0, 1.0]});
        f2.push({pos: [-1.0, -1.0, 1.0], nor: [0.0, -1.0, 0.0], uv: [1.0, 0.0]});

        let f3 : Array<Vertex> = new Array<Vertex>();
        f3.push({pos: [-1.0, 1.0, -1.0], nor: [0.0, 1.0, 0.0], uv: [0.0, 0.0]});
        f3.push({pos: [1.0, 1.0, -1.0], nor: [0.0, 1.0, 0.0], uv: [0.0, 1.0]});
        f3.push({pos: [1.0, 1.0, 1.0], nor: [0.0, 1.0, 0.0], uv: [1.0, 1.0]});
        f3.push({pos: [-1.0, 1.0, 1.0], nor: [0.0, 1.0, 0.0], uv: [1.0, 0.0]});

        let f4 : Array<Vertex> = new Array<Vertex>();
        f4.push({pos: [-1.0, -1.0, -1.0], nor: [-1.0, 0.0, 0.0], uv: [0.0, 0.0]});
        f4.push({pos: [-1.0, 1.0, -1.0], nor: [-1.0, 0.0, 0.0], uv: [0.0, 1.0]});
        f4.push({pos: [-1.0, 1.0, 1.0], nor: [-1.0, 0.0, 0.0], uv: [1.0, 1.0]});
        f4.push({pos: [-1.0, -1.0, 1.0], nor: [-1.0, 0.0, 0.0], uv: [1.0, 0.0]});

        let f5 : Array<Vertex> = new Array<Vertex>();
        f5.push({pos: [1.0, -1.0, -1.0], nor: [1.0, 0.0, 0.0], uv: [0.0, 0.0]});
        f5.push({pos: [1.0, 1.0, -1.0], nor: [1.0, 0.0, 0.0], uv: [0.0, 1.0]});
        f5.push({pos: [1.0, 1.0, 1.0], nor: [1.0, 0.0, 0.0], uv: [1.0, 1.0]});
        f5.push({pos: [1.0, -1.0, 1.0], nor: [1.0, 0.0, 0.0], uv: [1.0, 0.0]});

        this.addFace(f0);
        this.addFace(f1);
        this.addFace(f2);
        this.addFace(f3);
        this.addFace(f4);
        this.addFace(f5);
    }
}

class Face {
    vertCount: number = 0
    verts: Array<number> = new Array()

    constructor(verts: Array<number>) {
        for (let i = 0; i < verts.length; i++){
            this.verts.push(verts[i]);
        }
        this.vertCount = verts.length;
    }

    addVertex(idx: number) {
        this.verts.push(idx);
        this.vertCount++;
    }
}