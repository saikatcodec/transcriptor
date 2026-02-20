import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-mono tracking-widest uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed select-none",
          size === "sm" && "px-4 py-2 text-xs",
          size === "md" && "px-6 py-3 text-sm",
          size === "lg" && "px-8 py-4 text-base",
          variant === "primary" && "bg-paper text-ink hover:bg-paper/90 active:scale-[0.98]",
          variant === "danger" && "bg-accent text-paper hover:bg-accent-dim active:scale-[0.98]",
          variant === "ghost" && "text-muted hover:text-paper hover:bg-surface-2",
          variant === "outline" && "border border-border text-paper hover:bg-surface-2 active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Processing…
          </span>
        ) : children}
      </button>
    );
  }
);

Button.displayName = "Button";
