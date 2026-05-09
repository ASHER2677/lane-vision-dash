import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Dropzone } from "@/components/lane/Dropzone";
import { VideoCanvas } from "@/components/lane/VideoCanvas";
import { SettingsSidebar, type LaneSettings } from "@/components/lane/SettingsSidebar";
import { TelemetryWidget } from "@/components/lane/TelemetryWidget";
import { Compass, Gauge, Target, X } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<LaneSettings>({
    cannySensitivity: 130,
    houghThreshold: 80,
    showOverlay: true,
    showEdges: true,
  });
  const [telemetry, setTelemetry] = useState({ confidence: 0, heading: 0, speed: 0 });

  const handleFile = (file: File) => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
  };

  const handleSample = (url: string) => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoUrl(url);
  };

  const reset = () => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
  };


  const onTelemetry = useCallback(
    (t: { confidence: number; heading: number; speed: number }) => setTelemetry(t),
    []
  );

  const confidenceAccent =
    telemetry.confidence > 80 ? "success" : telemetry.confidence > 60 ? "primary" : "warn";

  return (
    <div className="min-h-screen w-full">
      {/* Top bar */}
      <header className="border-b border-border/60 backdrop-blur-md bg-background/40 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded border border-hud/60 flex items-center justify-center hud-glow">
              <span className="font-mono-hud text-hud text-xs">L.D</span>
            </div>
            <div>
              <h1 className="font-mono-hud text-sm tracking-[0.3em] uppercase text-foreground">
                Lane Detection Visualizer
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                Computer Vision · Telemetry · Real-time
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 font-mono-hud text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              SYSTEM ONLINE
            </span>
            <span>v2.4.1</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6 min-w-0">
          {/* Video / Dropzone */}
          {videoUrl ? (
            <div className="space-y-3">
              <VideoCanvas src={videoUrl} settings={settings} onTelemetry={onTelemetry} />
              <button
                onClick={reset}
                className="font-mono-hud text-[11px] tracking-widest uppercase text-muted-foreground hover:text-hud flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" /> Eject Footage
              </button>
            </div>
          ) : (
            <Dropzone onFile={handleFile} />
          )}

          {/* Telemetry row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <TelemetryWidget
                label="Speed"
                value={videoUrl ? telemetry.speed.toFixed(1) : "—"}
                unit="km/h"
              />
              <Gauge className="absolute top-4 right-4 h-4 w-4 text-hud/40" />
            </div>
            <div className="relative">
              <TelemetryWidget
                label="Heading"
                value={videoUrl ? `${telemetry.heading >= 0 ? "+" : ""}${telemetry.heading.toFixed(2)}` : "—"}
                unit="°"
              />
              <Compass className="absolute top-4 right-4 h-4 w-4 text-hud/40" />
            </div>
            <div className="relative">
              <TelemetryWidget
                label="Lane Confidence"
                value={videoUrl ? telemetry.confidence.toFixed(0) : "—"}
                unit="%"
                accent={videoUrl ? confidenceAccent : "primary"}
              />
              <Target className="absolute top-4 right-4 h-4 w-4 text-hud/40" />
            </div>
          </div>

          {/* Confidence bar */}
          <div className="hud-panel p-4">
            <div className="flex justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
              <span>Detection Confidence</span>
              <span className="font-mono-hud text-hud">
                {videoUrl ? `${telemetry.confidence.toFixed(1)}%` : "STANDBY"}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-hud to-hud-glow transition-all duration-300"
                style={{ width: `${videoUrl ? telemetry.confidence : 0}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 font-mono-hud text-[10px]">
              {["L-EDGE", "R-EDGE", "ROI", "HOUGH"].map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-muted-foreground">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SettingsSidebar settings={settings} onChange={setSettings} />
      </main>
    </div>
  );
}
