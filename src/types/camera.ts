import { time } from "console";
import { vec2, vec3, vec4, mat4, quat } from "gl-matrix"
import { KeyboardInputs } from "./inputs";
import { eyetext, reftext, looktext, uptext, righttext } from "../main";
import { stringify } from "querystring";

export class Camera {
    fovy: number;
    aspect: vec2;
    nearClip: number;
    farClip: number;

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

        vec3.cross(this.right, up, this.look);
        vec3.normalize(this.right, this.right);
    }

    updateAttributes(inputs : KeyboardInputs, timeStep : number) {
        let factor : number = timeStep * 0.1;
        if (inputs.up) {
            var rotate : vec4 = vec4.create();
            quat.setAxisAngle(rotate, this.right, factor);
            vec3.transformQuat(this.up, this.up, rotate);
            vec3.transformQuat(this.look, this.look, rotate);
        }
        if (inputs.down) {
            var rotate : vec4 = vec4.create();
            quat.setAxisAngle(rotate, this.right, -factor);
            vec3.transformQuat(this.up, this.up, rotate);
            vec3.transformQuat(this.look, this.look, rotate);
        }
        if (inputs.left) {
            var rotate : vec4 = vec4.create();
            quat.setAxisAngle(rotate, this.up, factor);
            vec3.transformQuat(this.right, this.right, rotate);
            vec3.transformQuat(this.look, this.look, rotate);
        }
        if (inputs.right) {
            var rotate : vec4 = vec4.create();
            quat.setAxisAngle(rotate, this.up, -factor);
            vec3.transformQuat(this.right, this.right, rotate);
            vec3.transformQuat(this.look, this.look, rotate);
        }
        if (inputs.w) {
            let scaledLook : vec3 = vec3.create();
            vec3.scale(scaledLook, this.look, timeStep);
            vec3.add(this.eye, this.eye, scaledLook);
            vec3.add(this.ref, this.eye, this.look);
        }
        if (inputs.d) {
            let scaledRight : vec3 = vec3.create();
            vec3.scale(scaledRight, this.right, timeStep);
            vec3.subtract(this.eye, this.eye, scaledRight);
            vec3.add(this.ref, this.eye, this.look);
        }
        if (inputs.s) {
            let scaledLook : vec3 = vec3.create();
            vec3.scale(scaledLook, this.look, timeStep);
            vec3.subtract(this.eye, this.eye, scaledLook);
            vec3.add(this.ref, this.eye, this.look);
        }
        if (inputs.a) {
            let scaledRight : vec3 = vec3.create();
            vec3.scale(scaledRight, this.right, timeStep);
            vec3.add(this.eye, this.eye, scaledRight);
            vec3.add(this.ref, this.eye, this.look);
        }
        if (inputs.e) {
            let scaledUp : vec3 = vec3.create();
            vec3.set(scaledUp, 0, timeStep, 0);
            vec3.add(this.eye, this.eye, scaledUp);
            vec3.add(this.ref, this.eye, this.look);
        }
        if (inputs.q) {
            let scaledUp : vec3 = vec3.create();
            vec3.scale(scaledUp, this.up, timeStep);
            vec3.subtract(this.eye, this.eye, scaledUp);
            vec3.add(this.ref, this.eye, this.look);
        }
        eyetext.innerText = "EYE : " + String(this.eye[0]) + ", " + String(this.eye[1]) + ", " + String(this.eye[2]);
        reftext.innerText = "REF : " + String(this.ref[0]) + ", " + String(this.ref[1]) + ", " + String(this.ref[2]);
        looktext.innerText = "LOOK : " + String(this.look[0]) + ", " + String(this.look[1]) + ", " + String(this.look[2]);
        uptext.innerText = "UP : " + String(this.up[0]) + ", " + String(this.up[1]) + ", " + String(this.up[2]);
        righttext.innerText = "RIGHT : " + String(this.right[0]) + ", " + String(this.right[1]) + ", " + String(this.right[2]);
    }

    project() : mat4 {
        var projection : mat4 = mat4.create();
        mat4.perspective(projection, this.fovy, this.aspect[0] / this.aspect[1], 
            this.nearClip, this.farClip);
        return projection;
    }

    view() : mat4 {
        var view : mat4 = mat4.create();
        mat4.set(view, this.right[0], this.up[0], this.look[0], 0,
                        this.right[1], this.up[1], this.look[1], 0,
                        this.right[2], this.up[2], this.look[2], 0,
                        0, 0, 0, 1);
        mat4.translate(view, view, this.eye);
        // mat4.lookAt(view, this.eye, this.ref, this.up);
        return view;
    }

    // Model matrix pending the implementation of a rotation model
    model(val: number) : mat4 {
        var model : mat4 = mat4.create();
        mat4.rotate(model, model, val, [0, 0, 1]);
        return model;
    }
}