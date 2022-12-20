import { throws } from "assert";
import { vec3, vec2, mat4 } from "gl-matrix"
import { Texture } from "./texture";

interface Vertex {
    pos : vec3
    nor? : vec3
    col? : vec3
    uv? : vec2
}

export interface VertexLayout {
    nor : boolean
    col : boolean
    uv : boolean
}

export class Mesh {
    buffer: GPUBuffer
    bufferLayout: GPUVertexBufferLayout

    vertCount: number = 0
    idxCount: number = 0
    faces: Array<Face> = new Array<Face>()
    verts: Array<Vertex> = new Array<Vertex>()
    texture?: Texture;

    layout: VertexLayout;
    vertDataVBO!: Float32Array;
    idxDataVBO!: Uint32Array;

    translate: vec3 = vec3.create()
    rotate: vec3 = vec3.create()

    constructor(layout: VertexLayout) {
        this.layout = layout;
    }

    rotateMesh() {
        // vec3.rotateY(this.rotate, this.rotate, [0, 0, 0], 0.01);
        this.rotate[1] += 0.01;
    }

    async createTexture(device: GPUDevice, filePath: string) {
        this.texture = new Texture(filePath);
        await this.texture.create(device);
    }

    configureBuffer(device: GPUDevice) {
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

        var bufferAttributes = [{
            shaderLocation: 0,
            format: 'float32x3',
            offset: 0
        }];

        var offset : number = 12;
        var shaderLocation : number = 1;
        
        if (this.layout.nor) {
            bufferAttributes.push(
                {
                    shaderLocation: shaderLocation,
                    format: 'float32x3',
                    offset: offset
                }
            );
            offset += 12;
            shaderLocation++;
        }

        if (this.layout.col) {
            bufferAttributes.push(
                {
                    shaderLocation: shaderLocation,
                    format: 'float32x3',
                    offset: offset
                }
            );
            offset += 12;
            shaderLocation++;
        }

        if (this.layout.uv) {
            bufferAttributes.push(
                {
                    shaderLocation: shaderLocation,
                    format: 'float32x2',
                    offset: offset
                }
            );
            offset += 8;
            shaderLocation++;
        }

        this.bufferLayout = {
            arrayStride: offset,
            attributes: bufferAttributes,
        }
    }

    addVertex(vert: Vertex) {
        console.log("adding vertex");
        console.log(vert.pos);
        console.log(vert.col);
        this.verts.push(vert);
        this.vertCount++;
    }

    addFace(verts: Array<Vertex>, col?: vec3) {
        let indices : Array<number> = new Array<number>();
        for (let i = 0; i < verts.length; i++){
            indices.push(this.vertCount);
            this.addVertex(verts[i]);
        }
        this.faces.push(new Face(indices));
    }

    addFaceIndices(indices: Array<number>, col?: vec3) {
        this.faces.push(new Face(indices));
    }

    populateVBO() {
        var verts : Array<number> = new Array<number>();

        for (let i = 0; i < this.faces.length; i++){
            const currFace : Face = this.faces[i];

            // Fan out method per face
            for (let j = 0; j < currFace.vertCount - 2; j++){
                const v1 : Vertex = this.verts[currFace.verts[0]];
                const v2 : Vertex = this.verts[currFace.verts[j + 1]];
                const v3 : Vertex = this.verts[currFace.verts[j + 2]];

                // Vert 0
                verts.push(v1.pos[0]);
                verts.push(v1.pos[1]);
                verts.push(v1.pos[2]);

                if (this.layout.nor) {
                    verts.push(v1.nor[0]);
                    verts.push(v1.nor[1]);
                    verts.push(v1.nor[2]);
                }

                if (this.layout.col) {
                    verts.push(v1.col[0]);
                    verts.push(v1.col[1]);
                    verts.push(v1.col[2]);
                }

                if (this.layout.uv) {
                    verts.push(v1.uv[0]);
                    verts.push(v1.uv[1]);
                }

                // Vert j + 1
                verts.push(v2.pos[0]);
                verts.push(v2.pos[1]);
                verts.push(v2.pos[2]);

                if (this.layout.nor) {
                    verts.push(v2.nor[0]);
                    verts.push(v2.nor[1]);
                    verts.push(v2.nor[2]);
                }

                if (this.layout.col) {
                    verts.push(v2.col[0]);
                    verts.push(v2.col[1]);
                    verts.push(v2.col[2]);
                }

                if (this.layout.uv) {
                    verts.push(v2.uv[0]);
                    verts.push(v2.uv[1]);
                }
                                
                // Vert j + 2
                verts.push(v3.pos[0]);
                verts.push(v3.pos[1]);
                verts.push(v3.pos[2]);

                if (this.layout.nor) {
                    verts.push(v3.nor[0]);
                    verts.push(v3.nor[1]);
                    verts.push(v3.nor[2]);
                }

                if (this.layout.col) {
                    verts.push(v3.col[0]);
                    verts.push(v3.col[1]);
                    verts.push(v3.col[2]);
                }

                if (this.layout.uv) {
                    verts.push(v3.uv[0]);
                    verts.push(v3.uv[1]);
                }

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

    getModelMatrix() : mat4 {
        let model : mat4 = mat4.create();
        mat4.rotate(model, model, this.rotate[0], [1, 0, 0]);
        mat4.rotate(model, model, this.rotate[1], [0, 1, 0]);
        mat4.rotate(model, model, this.rotate[2], [0, 0, 1]);
        mat4.translate(model, model, this.translate);
        return model;
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

        this.addFace(f0, [1.0, 0.0, 0.0]);
        this.addFace(f1, [0.0, 1.0, 0.0]);
        this.addFace(f2, [0.0, 0.0, 1.0]);
        this.addFace(f3, [1.0, 0.0, 1.0]);
        this.addFace(f4, [1.0, 1.0, 0.0]);
        this.addFace(f5, [0.0, 1.0, 1.0]);
    }

    createBlade() {
        let f0 : Array<Vertex> = new Array<Vertex>();
        f0.push({pos: [-0.1, -1.0, 0.0], col: [0, 1.0, 0.0]});
        f0.push({pos: [0.0, 1.0, 0.0], col: [.1, -1.0, 0.0]});
        f0.push({pos: [.1, -1.0, 0.0], col: [-.1, -1.0, 0.0]});

        this.addFace(f0, [0.2, 0.7, 0.4]);
    }

    createPlane() {
        let f0 : Array<Vertex> = new Array<Vertex>();
        f0.push({pos: [-10.0, -1.0, 10.0], nor: [0.0, -1.0, 0.0], col: [0., 1, 0.]});
        f0.push({pos: [10.0, -1.0, 10.0], nor: [0.0, -1.0, 0.0], col: [0., 1, 0.]});
        f0.push({pos: [10.0, -1.0, -10.0], nor: [0.0, -1.0, 0.0], col: [0., 1, 0.]});
        f0.push({pos: [-10.0, -1.0, -10.0], nor: [0.0, -1.0, 0.0], col: [0., 1, 0.]});

        this.addFace(f0, [0.2, 0.7, 0.4]);
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