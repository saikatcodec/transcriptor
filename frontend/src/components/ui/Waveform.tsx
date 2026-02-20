"use client";

import { cn } from "@/lib/utils";

interface WaveformProps {
  active: boolean;
  bars?: number;
  className?: string;
}

export function Waveform({ active, bars = 12, className }: WaveformProps) {
  return (
    <div className={cn("flex items-center gap-[3px] h-10", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all duration-300",
            active ? "bg-accent animate-wave" : "bg-border h-1"
          )}
          style={
            active
              ? {
                  animationDelay: `${(i * 0.1) % 1.5}s`,
                  height: `${Math.max(20, Math.sin((i / bars) * Math.PI) * 100)}%`,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
