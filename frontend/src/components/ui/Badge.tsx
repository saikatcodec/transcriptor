import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "muted" | "success";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-mono tracking-wider uppercase rounded-sm",
        variant === "default" && "bg-surface-2 text-paper border border-border",
        variant === "accent" && "bg-accent text-paper",
        variant === "muted" && "bg-surface text-muted border border-border",
        variant === "success" && "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
        className
      )}
    >
      {children}
    </span>
  );
}
