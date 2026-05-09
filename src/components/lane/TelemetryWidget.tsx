interface Props {
  label: string;
  value: string | number;
  unit?: string;
  accent?: "primary" | "warn" | "success";
}

export function TelemetryWidget({ label, value, unit, accent = "primary" }: Props) {
  const color =
    accent === "warn" ? "text-warn" : accent === "success" ? "text-success" : "text-hud";
  return (
    <div className="hud-panel relative scanline overflow-hidden p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-mono-hud text-3xl font-light ${color} hud-glow tabular-nums`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs text-muted-foreground font-mono-hud">{unit}</span>
        )}
      </div>
    </div>
  );
}
