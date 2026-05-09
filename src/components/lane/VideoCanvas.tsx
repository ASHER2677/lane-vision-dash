import { useEffect, useRef } from "react";
import type { LaneSettings } from "./SettingsSidebar";

interface Props {
  src: string;
  settings: LaneSettings;
  onTelemetry: (t: { confidence: number; heading: number; speed: number }) => void;
}

export function VideoCanvas({ src, settings, onTelemetry }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let t = 0;

    const draw = () => {
      const w = (canvas.width = video.clientWidth || 1280);
      const h = (canvas.height = video.clientHeight || 720);
      ctx.clearRect(0, 0, w, h);

      t += 0.02;
      // sensitivity influences how "tight" the lines look
      const sens = settings.cannySensitivity / 255;
      const hough = settings.houghThreshold / 300;
      const sway = Math.sin(t) * 30 * (1 - hough);

      // Region of interest (trapezoid)
      const roiTop = h * 0.55;
      const roiBot = h * 0.95;
      const cx = w / 2 + sway;

      if (settings.showEdges) {
        // simulated edge map — faint cyan noise inside ROI
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - 60, roiTop);
        ctx.lineTo(cx + 60, roiTop);
        ctx.lineTo(w * 0.95, roiBot);
        ctx.lineTo(w * 0.05, roiBot);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = `rgba(120, 230, 255, ${0.04 + sens * 0.05})`;
        for (let i = 0; i < 220; i++) {
          const x = Math.random() * w;
          const y = roiTop + Math.random() * (roiBot - roiTop);
          ctx.fillRect(x, y, 1.5, 1.5);
        }
        ctx.restore();
      }

      if (settings.showOverlay) {
        // ROI outline
        ctx.strokeStyle = "rgba(120, 230, 255, 0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(cx - 60, roiTop);
        ctx.lineTo(cx + 60, roiTop);
        ctx.lineTo(w * 0.95, roiBot);
        ctx.lineTo(w * 0.05, roiBot);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Lane lines
        const drawLane = (xTop: number, xBot: number, glow: string, color: string) => {
          ctx.shadowBlur = 18;
          ctx.shadowColor = glow;
          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(xTop, roiTop);
          ctx.lineTo(xBot, roiBot);
          ctx.stroke();
          ctx.shadowBlur = 0;
        };
        drawLane(cx - 50, w * 0.1, "rgba(120,230,255,0.9)", "rgba(140,240,255,0.95)");
        drawLane(cx + 50, w * 0.9, "rgba(120,230,255,0.9)", "rgba(140,240,255,0.95)");

        // Lane fill
        ctx.fillStyle = "rgba(120, 230, 255, 0.08)";
        ctx.beginPath();
        ctx.moveTo(cx - 50, roiTop);
        ctx.lineTo(cx + 50, roiTop);
        ctx.lineTo(w * 0.9, roiBot);
        ctx.lineTo(w * 0.1, roiBot);
        ctx.closePath();
        ctx.fill();

        // Heading vector
        ctx.strokeStyle = "rgba(180, 255, 200, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w / 2, h * 0.92);
        ctx.lineTo(cx, h * 0.7);
        ctx.stroke();

        // Crosshair
        ctx.strokeStyle = "rgba(140,240,255,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 12, h * 0.92); ctx.lineTo(w / 2 + 12, h * 0.92);
        ctx.moveTo(w / 2, h * 0.92 - 12); ctx.lineTo(w / 2, h * 0.92 + 12);
        ctx.stroke();
      }

      // telemetry update (throttled by raf, smoothed feel)
      if (Math.floor(t * 10) % 3 === 0) {
        const confidence = Math.max(0, Math.min(100,
          70 + sens * 25 + hough * 10 - Math.abs(sway) * 0.4
        ));
        const heading = sway * 0.3;
        const speed = 60 + Math.sin(t * 0.5) * 8;
        onTelemetry({ confidence, heading, speed });
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const start = () => { rafRef.current = requestAnimationFrame(draw); };
    video.addEventListener("play", start);
    video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("play", start);
    };
  }, [src, settings, onTelemetry]);

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden hud-panel scanline">
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted
        playsInline
        autoPlay
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {/* corner brackets */}
      <div className="absolute inset-3 pointer-events-none">
        {["top-0 left-0 border-t-2 border-l-2",
          "top-0 right-0 border-t-2 border-r-2",
          "bottom-0 left-0 border-b-2 border-l-2",
          "bottom-0 right-0 border-b-2 border-r-2"].map((c, i) => (
          <div key={i} className={`absolute w-5 h-5 border-hud ${c}`} />
        ))}
      </div>
      <div className="absolute top-3 left-3 font-mono-hud text-[10px] tracking-widest text-hud hud-glow">
        ● REC · LANE.AI v2.4
      </div>
    </div>
  );
}
