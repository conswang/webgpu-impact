import { useEffect, useRef } from "react";
import { Renderer } from "../rendering/renderer";
import { Instancer } from "../rendering/instancer";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef && canvasRef2) {
      const instancer = new Instancer(canvasRef.current);
      instancer.init();

      const renderer = new Renderer(canvasRef2.current);
      renderer.initialize();
    }

  }, [canvasRef, canvasRef2]);

  return <div>
      <canvas width="800" height="600" ref={canvasRef}/>
      <canvas width="800" height="600" ref={canvasRef2} style={{position: "relative", top: -600}}/>
  </div>;
}
