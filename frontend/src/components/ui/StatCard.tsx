import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn("border border-border bg-surface p-4", className)}>
      <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-display text-paper">{value}</p>
    </div>
  );
}
