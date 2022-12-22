import { useEffect, useRef } from "react";
import { Renderer } from "../rendering/renderer";
import { Instancer } from "../rendering/instancer";
import { inputs } from "../rendering/types/inputs";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef) {
      const renderer : Renderer = new Renderer(canvasRef.current);
      //renderer.initialize();
    }
    if (canvasRef2){
      const instancer: Instancer = new Instancer(canvasRef2.current);
      instancer.init();
      //instancer.frame();
    }

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

  }, [canvasRef]);
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

  return <div>
    <div>
      <h1>Hello triangle</h1>
      <canvas width="800" height="600" ref={canvasRef2}/>
      <canvas width="800" height="600" ref={canvasRef}/>
      {/* <p id="eye">eye : </p>
      <p id="ref">ref : </p>
      <p id="look">look : </p>
      <p id="up">up : </p>
      <p id="right">right : </p>
      <p id="light">light : </p> */}
  </div>
  <div id="camera-data">
    </div>
  </div>;
}
