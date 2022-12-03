import { useEffect, useRef } from "react";
import { Renderer } from "../rendering/renderer";
import { Instancer } from "../rendering/instancer";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef) {
      const renderer : Renderer = new Renderer(canvasRef.current);
      renderer.initialize();
    }
    if (canvasRef2){
      const instancer: Instancer = new Instancer(canvasRef2.current);
      instancer.init();
      //instancer.frame();
    }
    

  }, [canvasRef]);

  return <div>
      <h1>Hello triangle</h1>
      <canvas width="800" height="600" ref={canvasRef2}/>
      <canvas width="800" height="600" ref={canvasRef}/>
  </div>;
}
