import { useEffect, useRef } from "react";
import { Renderer } from "../rendering/renderer";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef) {
      const renderer : Renderer = new Renderer(canvasRef.current);
      renderer.initialize();
    }
  }, [canvasRef]);

  return <div>
      <h1>Hello triangle</h1>
      <canvas width="800" height="600" ref={canvasRef}/>
  </div>;
}
