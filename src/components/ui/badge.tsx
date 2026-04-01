import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-[var(--primary)] text-white shadow-[0_10px_20px_rgba(106,161,160,0.18)]",
  secondary:
    "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  outline: "border-[var(--border)] bg-[rgba(255,255,255,0.7)] text-[var(--foreground)]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
