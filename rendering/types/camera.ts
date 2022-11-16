import { vec2, vec3, mat4 } from "gl-matrix"

export class Camera {
    fovy: number
    aspect: vec2
    nearClip: number
    farClip: number

    eye: vec3 = vec3.create()
    ref: vec3 = vec3.create()

    up: vec3 = vec3.create()
    right: vec3 = vec3.create()
    look: vec3 = vec3.create()

    constructor(fovy: number, w: number, h: number, nearClip: number,
        farClip: number, eye: vec3, ref: vec3, up: vec3) {
        
        this.fovy = fovy;
        this.aspect = vec2.fromValues(w, h);
        this.nearClip = nearClip;
        this.farClip = farClip;

        vec3.copy(this.eye, eye);
        vec3.copy(this.ref, ref);
        vec3.copy(this.up, up);
        vec3.normalize(this.up, this.up);
        
        vec3.subtract(this.look, ref, eye);
        vec3.normalize(this.look, this.look);

        vec3.cross(this.right, this.look, up);
        vec3.normalize(this.right, this.right);
    }

    project() : mat4 {
        var projection : mat4 = mat4.create();
        mat4.perspective(projection, this.fovy, this.aspect[0] / this.aspect[1], 
            this.nearClip, this.farClip);
        return projection;
    }

    view() : mat4 {
        var view : mat4 = mat4.create();
        mat4.lookAt(view, this.eye, this.ref, this.up);
        return view;
    }

    // Model matrix pending the implementation of a rotation model
    model(val: number) : mat4 {
        var model : mat4 = mat4.create();
        mat4.rotate(model, model, val, [0, 0, 1]);
        return model;
    }
}
