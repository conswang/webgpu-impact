import { vec2, vec3, vec4, quat, mat4 } from "gl-matrix"

export class Light {
    pos: vec3 = vec3.create()
    col: vec3 = vec3.create()

    intensity!: number;

    constructor(pos: vec3, col: vec3){
        this.pos = pos;
        this.col = col;
    }

    rotateLight(step: number) {
        var rotate : vec4 = vec4.create();
        quat.setAxisAngle(rotate, [0, 1, 0], step);
        vec3.transformQuat(this.pos, this.pos, rotate);
    }
}