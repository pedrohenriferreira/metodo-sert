import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--primary)] text-white shadow-[0_12px_26px_rgba(106,161,160,0.24)] hover:bg-[color-mix(in_oklab,var(--primary)_88%,black)]",
  secondary:
    "bg-[var(--secondary)] text-[var(--secondary-foreground)] shadow-[0_10px_22px_rgba(129,155,179,0.14)] hover:bg-[color-mix(in_oklab,var(--secondary)_92%,black)]",
  outline:
    "border border-[var(--border)] bg-[rgba(255,255,255,0.9)] text-[var(--foreground)] shadow-[0_8px_24px_rgba(129,155,179,0.10)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
  ghost: "text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
  destructive: "bg-[var(--destructive)] text-white shadow-[0_12px_26px_rgba(255,91,127,0.22)] hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-12 px-5 py-2.5",
  sm: "h-10 rounded-full px-4",
  lg: "h-14 rounded-[1.2rem] px-7 text-base",
  icon: "h-10 w-10 rounded-full p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.2rem] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
