import { cn } from "@/lib/utils";

type GroupOrbProps = {
  pressure: number;
  targetPressure: number;
  state: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { container: "h-14 w-14", text: "text-sm", ring: 48 },
  md: { container: "h-20 w-20", text: "text-lg", ring: 64 },
  lg: { container: "h-28 w-28", text: "text-2xl", ring: 96 },
};

function getStateColor(state: string) {
  switch (state) {
    case "INFLATING":
    case "INFLA":
      return { stroke: "#1673c8", bg: "bg-primary/10", text: "text-primary" };
    case "HOLDING":
    case "MANTIENE":
      return { stroke: "#14805e", bg: "bg-accent/10", text: "text-accent" };
    case "DEFLATING":
    case "DESINFLA":
      return { stroke: "#9a6600", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" };
    case "DONE":
    case "LISTO":
      return { stroke: "#14805e", bg: "bg-accent/10", text: "text-accent" };
    case "ERROR":
      return { stroke: "#c53d45", bg: "bg-destructive/10", text: "text-destructive" };
    default:
      return { stroke: "#627184", bg: "bg-muted", text: "text-muted-foreground" };
  }
}

export function GroupOrb({ pressure, targetPressure, state, size = "md" }: GroupOrbProps) {
  const colors = getStateColor(state);
  const progress = targetPressure > 0 ? Math.min(100, (pressure / targetPressure) * 100) : 0;
  const s = sizeMap[size];
  const circumference = Math.PI * s.ring;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", s.container)}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${s.ring + 16} ${s.ring + 16}`}>
        <circle
          cx={(s.ring + 16) / 2}
          cy={(s.ring + 16) / 2}
          r={s.ring / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-border/50"
        />
        <circle
          cx={(s.ring + 16) / 2}
          cy={(s.ring + 16) / 2}
          r={s.ring / 2}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className={cn("relative flex flex-col items-center", s.text, "font-black tabular-nums", colors.text)}>
        <span>{pressure.toFixed(1)}</span>
        {size !== "sm" && (
          <span className="text-[10px] font-bold text-muted-foreground">kPa</span>
        )}
      </div>
    </div>
  );
}
