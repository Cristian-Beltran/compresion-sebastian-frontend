import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  variant: "good" | "bad" | "warn" | "info" | "neutral";
  label: string;
  className?: string;
};

const variantStyles = {
  good: "bg-accent/10 text-accent",
  bad: "bg-destructive/10 text-destructive",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "status-dot inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold",
        variantStyles[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
