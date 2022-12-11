import { vec2, vec3, mat4 } from "gl-matrix"

export class Light {
    pos: vec3 = vec3.create()
    col: vec3 = vec3.create()

    intensity!: number;

    constructor(pos: vec3, col: vec3){
        this.pos = pos;
        this.col = col;
    }
}