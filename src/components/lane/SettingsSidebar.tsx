import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Settings2, Zap, Activity } from "lucide-react";

export interface LaneSettings {
  cannySensitivity: number;
  houghThreshold: number;
  showOverlay: boolean;
  showEdges: boolean;
}

interface Props {
  settings: LaneSettings;
  onChange: (s: LaneSettings) => void;
}

export function SettingsSidebar({ settings, onChange }: Props) {
  const update = <K extends keyof LaneSettings>(k: K, v: LaneSettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <aside className="hud-panel scanline relative w-full lg:w-80 shrink-0 p-5 space-y-6 h-fit">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Settings2 className="h-4 w-4 text-hud" />
        <h2 className="font-mono-hud text-xs uppercase tracking-[0.3em] text-hud">
          Detection Settings
        </h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Zap className="h-3 w-3" /> Canny Edge Sensitivity
          </label>
          <span className="font-mono-hud text-sm text-hud hud-glow tabular-nums">
            {settings.cannySensitivity}
          </span>
        </div>
        <Slider
          value={[settings.cannySensitivity]}
          min={0}
          max={255}
          step={1}
          onValueChange={([v]) => update("cannySensitivity", v)}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono-hud">
          <span>LOW</span><span>HIGH</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3 w-3" /> Hough Line Threshold
          </label>
          <span className="font-mono-hud text-sm text-hud hud-glow tabular-nums">
            {settings.houghThreshold}
          </span>
        </div>
        <Slider
          value={[settings.houghThreshold]}
          min={1}
          max={300}
          step={1}
          onValueChange={([v]) => update("houghThreshold", v)}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono-hud">
          <span>LOOSE</span><span>STRICT</span>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Lane Overlay
          </span>
          <Switch
            checked={settings.showOverlay}
            onCheckedChange={(v) => update("showOverlay", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Edge Map
          </span>
          <Switch
            checked={settings.showEdges}
            onCheckedChange={(v) => update("showEdges", v)}
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
          Pipeline Status
        </div>
        <div className="space-y-1 font-mono-hud text-[11px] text-hud/80">
          <div>► GAUSSIAN BLUR ........... OK</div>
          <div>► CANNY EDGE DETECT ...... OK</div>
          <div>► ROI MASK ............... OK</div>
          <div>► HOUGH TRANSFORM ........ OK</div>
        </div>
      </div>
    </aside>
  );
}
