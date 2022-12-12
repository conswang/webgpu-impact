import { Renderer } from "./renderer";
import { inputs } from "./types/inputs";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const renderer : Renderer = new Renderer(canvas);

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

function onKeyDown(event : KeyboardEvent)
{
    if (event.key == 'ArrowUp')
    {
        inputs.up = true;
    }
    else if (event.key == 'ArrowDown')
    {
        inputs.down = true;
    }
    else if (event.key == 'ArrowLeft')
    {
        inputs.left = true;
    }
    else if (event.key == 'ArrowRight')
    {
        inputs.right = true;
    }
    else if (event.key == 'w')
    {
        inputs.w = true;
    }
    else if (event.key == 'a')
    {
        inputs.a = true;
    }
    else if (event.key == 's')
    {
        inputs.s = true;
    }
    else if (event.key == 'd')
    {
        inputs.d = true;
    }
    else if (event.key == 'q')
    {
        inputs.q = true;
    }
    else if (event.key == 'e')
    {
        inputs.e = true;
    }
    console.log(inputs)
}

function onKeyUp(event : KeyboardEvent)
{
    if (event.key == 'ArrowUp')
    {
        inputs.up = false;
    }
    else if (event.key == 'ArrowDown')
    {
        inputs.down = false;
    }
    else if (event.key == 'ArrowLeft')
    {
        inputs.left = false;
    }
    else if (event.key == 'ArrowRight')
    {
        inputs.right = false;
    }
    else if (event.key == 'w')
    {
        inputs.w = false;
    }
    else if (event.key == 'a')
    {
        inputs.a = false;
    }
    else if (event.key == 's')
    {
        inputs.s = false;
    }
    else if (event.key == 'd')
    {
        inputs.d = false;
    }
    else if (event.key == 'q')
    {
        inputs.q = false;
    }
    else if (event.key == 'e')
    {
        inputs.e = false;
    }
    console.log(inputs)
}


renderer.initialize();

export const eyetext : HTMLElement = <HTMLElement>document.getElementById("eye");
export const reftext : HTMLElement = <HTMLElement>document.getElementById("ref");
export const looktext : HTMLElement = <HTMLElement>document.getElementById("look");
export const uptext : HTMLElement = <HTMLElement>document.getElementById("up");
export const righttext : HTMLElement = <HTMLElement>document.getElementById("right");