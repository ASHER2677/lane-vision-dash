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
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    if (!workRef.current) workRef.current = document.createElement("canvas");
    const work = workRef.current;
    const wctx = work.getContext("2d", { willReadFrequently: true })!;

    let t = 0;
    let smoothLeft: { m: number; b: number } | null = null;
    let smoothRight: { m: number; b: number } | null = null;
    let smoothConf = 0;

    // Detect lane lines from video frame using brightness-edge scanning
    const detect = (W: number, H: number, s: LaneSettings) => {
      // downsample for speed
      const dw = 240;
      const dh = Math.round((dw * H) / W);
      work.width = dw;
      work.height = dh;
      try {
        wctx.drawImage(video, 0, 0, dw, dh);
      } catch {
        return null;
      }
      const img = wctx.getImageData(0, 0, dw, dh).data;

      // ROI: bottom trapezoid
      const roiTopY = Math.floor(dh * 0.58);
      const roiBotY = Math.floor(dh * 0.95);
      const cannyT = 20 + (s.cannySensitivity / 255) * 80; // edge threshold

      // For each scan row, find strongest left/right edges around image center
      const leftPts: { x: number; y: number }[] = [];
      const rightPts: { x: number; y: number }[] = [];

      for (let y = roiTopY; y < roiBotY; y += 2) {
        const rowOff = y * dw * 4;
        // grayscale row + simple |dx| gradient
        let prevG = 0;
        let bestLeftX = -1, bestLeftS = 0;
        let bestRightX = -1, bestRightS = 0;
        const cx = dw / 2;
        // restrict horizontal range based on perspective
        const k = (y - roiTopY) / Math.max(1, roiBotY - roiTopY);
        const halfWidth = dw * (0.08 + 0.42 * k); // narrow at top, wide at bottom
        const xMin = Math.max(2, Math.floor(cx - halfWidth));
        const xMax = Math.min(dw - 2, Math.ceil(cx + halfWidth));

        for (let x = xMin; x <= xMax; x++) {
          const i = rowOff + x * 4;
          const r = img[i], g = img[i + 1], b = img[i + 2];
          // weight bright/yellowish/whitish pixels (lane markings)
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const whiteness = Math.min(r, g, b);
          const yellowness = Math.min(r, g) - b;
          const marker = lum * 0.5 + whiteness * 0.5 + Math.max(0, yellowness) * 0.6;

          const dG = marker - prevG;
          prevG = marker;
          const mag = Math.abs(dG);

          if (mag > cannyT) {
            if (x < cx) {
              if (mag > bestLeftS) { bestLeftS = mag; bestLeftX = x; }
            } else {
              if (mag > bestRightS) { bestRightS = mag; bestRightX = x; }
            }
          }
        }
        if (bestLeftX > 0) leftPts.push({ x: bestLeftX, y });
        if (bestRightX > 0) rightPts.push({ x: bestRightX, y });
      }

      const minPts = Math.max(6, Math.round(s.houghThreshold / 12));
      const fit = (pts: { x: number; y: number }[]) => {
        if (pts.length < minPts) return null;
        // simple least-squares x = m*y + b
        let sx = 0, sy = 0, sxy = 0, syy = 0;
        for (const p of pts) { sx += p.x; sy += p.y; sxy += p.x * p.y; syy += p.y * p.y; }
        const n = pts.length;
        const denom = n * syy - sy * sy;
        if (Math.abs(denom) < 1e-6) return null;
        const m = (n * sxy - sx * sy) / denom;
        const b = (sx - m * sy) / n;
        return { m, b, n };
      };

      const left = fit(leftPts);
      const right = fit(rightPts);

      // sanity: slope direction
      const okLeft = left && left.m < -0.05 ? left : null;
      const okRight = right && right.m > 0.05 ? right : null;

      // confidence from point counts + symmetry
      const lc = okLeft ? Math.min(1, okLeft.n / 30) : 0;
      const rc = okRight ? Math.min(1, okRight.n / 30) : 0;
      const conf = (lc + rc) / 2;

      // map detection (downsampled coords) back to display coords
      const sxScale = W / dw;
      const syScale = H / dh;
      const toDisplay = (line: { m: number; b: number } | null) =>
        line ? { m: line.m * (sxScale / syScale), b: line.b * sxScale } : null;

      return {
        left: toDisplay(okLeft),
        right: toDisplay(okRight),
        conf,
        roiTop: roiTopY * syScale,
        roiBot: roiBotY * syScale,
      };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const smooth = (
      prev: { m: number; b: number } | null,
      next: { m: number; b: number } | null,
      a = 0.3
    ) => {
      if (!next) return prev;
      if (!prev) return next;
      return { m: lerp(prev.m, next.m, a), b: lerp(prev.b, next.b, a) };
    };

    const draw = () => {
      const s = settingsRef.current;
      const W = (canvas.width = video.clientWidth || video.videoWidth || 1280);
      const H = (canvas.height = video.clientHeight || video.videoHeight || 720);
      ctx.clearRect(0, 0, W, H);
      t += 0.02;

      let result: ReturnType<typeof detect> = null;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        result = detect(W, H, s);
      }

      const roiTop = result?.roiTop ?? H * 0.58;
      const roiBot = result?.roiBot ?? H * 0.95;

      if (result) {
        smoothLeft = smooth(smoothLeft, result.left);
        smoothRight = smooth(smoothRight, result.right);
        smoothConf = lerp(smoothConf, result.conf, 0.25);
      }

      // Edge map visualization (sample points along detected lines region)
      if (s.showEdges && result) {
        ctx.save();
        ctx.fillStyle = "rgba(120, 230, 255, 0.18)";
        const step = 6;
        for (let y = roiTop; y < roiBot; y += step) {
          if (smoothLeft) {
            const x = smoothLeft.m * y + smoothLeft.b;
            ctx.fillRect(x - 1, y - 1, 2, 2);
          }
          if (smoothRight) {
            const x = smoothRight.m * y + smoothRight.b;
            ctx.fillRect(x - 1, y - 1, 2, 2);
          }
        }
        ctx.restore();
      }

      if (s.showOverlay) {
        // ROI outline
        ctx.strokeStyle = "rgba(120, 230, 255, 0.22)";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        const cxTop = W / 2;
        ctx.beginPath();
        ctx.moveTo(cxTop - 60, roiTop);
        ctx.lineTo(cxTop + 60, roiTop);
        ctx.lineTo(W * 0.95, roiBot);
        ctx.lineTo(W * 0.05, roiBot);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        const lineX = (l: { m: number; b: number }, y: number) => l.m * y + l.b;

        // Lane fill
        if (smoothLeft && smoothRight) {
          ctx.fillStyle = "rgba(120, 230, 255, 0.10)";
          ctx.beginPath();
          ctx.moveTo(lineX(smoothLeft, roiTop), roiTop);
          ctx.lineTo(lineX(smoothRight, roiTop), roiTop);
          ctx.lineTo(lineX(smoothRight, roiBot), roiBot);
          ctx.lineTo(lineX(smoothLeft, roiBot), roiBot);
          ctx.closePath();
          ctx.fill();
        }

        // Lane lines
        const drawLane = (l: { m: number; b: number } | null) => {
          if (!l) return;
          ctx.shadowBlur = 18;
          ctx.shadowColor = "rgba(120,230,255,0.9)";
          ctx.strokeStyle = "rgba(140,240,255,0.95)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(lineX(l, roiTop), roiTop);
          ctx.lineTo(lineX(l, roiBot), roiBot);
          ctx.stroke();
          ctx.shadowBlur = 0;
        };
        drawLane(smoothLeft);
        drawLane(smoothRight);

        // Heading vector (from lane center)
        if (smoothLeft && smoothRight) {
          const cxBot = (lineX(smoothLeft, roiBot) + lineX(smoothRight, roiBot)) / 2;
          const cxTopL = (lineX(smoothLeft, roiTop) + lineX(smoothRight, roiTop)) / 2;
          ctx.strokeStyle = "rgba(180, 255, 200, 0.9)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cxBot, H * 0.95);
          ctx.lineTo(cxTopL, roiTop + 20);
          ctx.stroke();
        }

        // Crosshair
        ctx.strokeStyle = "rgba(140,240,255,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 12, H * 0.92); ctx.lineTo(W / 2 + 12, H * 0.92);
        ctx.moveTo(W / 2, H * 0.92 - 12); ctx.lineTo(W / 2, H * 0.92 + 12);
        ctx.stroke();
      }

      // telemetry
      if (Math.floor(t * 10) % 3 === 0) {
        let heading = 0;
        if (smoothLeft && smoothRight) {
          const yMid = (roiTop + roiBot) / 2;
          const cxLane = (smoothLeft.m * yMid + smoothLeft.b + smoothRight.m * yMid + smoothRight.b) / 2;
          heading = ((cxLane - W / 2) / W) * 30;
        }
        const speed = 60 + Math.sin(t * 0.5) * 8;
        onTelemetry({ confidence: smoothConf * 100, heading, speed });
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const start = () => { rafRef.current = requestAnimationFrame(draw); };
    video.addEventListener("play", start);
    video.addEventListener("loadeddata", start);
    video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("play", start);
      video.removeEventListener("loadeddata", start);
    };
  }, [src, onTelemetry]);

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
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
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
