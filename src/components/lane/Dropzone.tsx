import { useState, useRef } from "react";
import { Upload, Film, PlayCircle } from "lucide-react";

interface Props {
  onFile: (file: File) => void;
  onSample?: (url: string, label: string) => void;
}

const SAMPLES = [
  { url: "/samples/highway.mp4", label: "Highway · Day" },
  { url: "/samples/dusk.mp4", label: "Open Road · Dusk" },
];

export function Dropzone({ onFile, onSample }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (f?: File | null) => {
    if (f && f.type.startsWith("video/")) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={`hud-panel scanline relative w-full aspect-video rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
        ${drag ? "ring-2 ring-hud scale-[1.01]" : "hover:ring-1 hover:ring-hud/50"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/*"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <div className="relative">
        <div className="absolute inset-0 blur-2xl bg-hud/40 rounded-full" />
        <div className="relative h-20 w-20 rounded-full border border-hud/50 flex items-center justify-center">
          <Upload className="h-8 w-8 text-hud" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <div className="font-mono-hud text-sm tracking-[0.3em] uppercase text-hud hud-glow">
          Drop MP4 to Initialize
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Film className="h-3 w-3" /> or click to select dashcam footage
        </div>
      </div>

      {onSample && (
        <div
          className="flex flex-wrap items-center justify-center gap-2 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-mono-hud text-[10px] tracking-widest uppercase text-muted-foreground mr-1">
            Or load sample:
          </span>
          {SAMPLES.map((s) => (
            <button
              key={s.url}
              onClick={() => onSample(s.url, s.label)}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded border border-hud/40 hover:border-hud hover:bg-hud/10 transition-colors font-mono-hud text-[11px] uppercase tracking-wider text-hud"
            >
              <PlayCircle className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 flex justify-between font-mono-hud text-[10px] text-muted-foreground">
        <span>SYS.READY</span>
        <span>AWAITING.INPUT</span>
      </div>
    </div>
  );
}
