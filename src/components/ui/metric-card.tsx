import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
  accentColor?: "primary" | "secondary" | "accent" | "destructive";
};

const accentColors = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
  destructive: "bg-destructive/10 text-destructive",
};

export function MetricCard({
  label,
  value,
  unit,
  icon,
  trend,
  className,
  accentColor = "primary",
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 shadow-sm",
        className,
      )}
    >
      <CardContent className="relative z-10 p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="eyebrow text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="hero-number text-4xl text-foreground">
                {value}
              </span>
              {unit && (
                <span className="text-sm font-semibold text-muted-foreground">
                  {unit}
                </span>
              )}
            </div>
            {trend && (
              <p
                className={cn(
                  "text-xs font-bold",
                  trend.positive ? "text-accent" : "text-destructive",
                )}
              >
                {trend.value}
              </p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl",
                accentColors[accentColor],
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
      <div
        className={cn(
          "absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60",
          accentColor === "primary" && "bg-primary/5",
          accentColor === "secondary" && "bg-secondary/5",
          accentColor === "accent" && "bg-accent/5",
          accentColor === "destructive" && "bg-destructive/5",
        )}
      />
    </Card>
  );
}
