import { Renderer } from "./renderer";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const renderer : Renderer = new Renderer(canvas);

renderer.initialize();