import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
  theme?: "light" | "dark";
};

export function BrandMark({ className, theme = "light" }: Omit<BrandLogoProps, "compact" | "iconOnly">) {
  return (
    <div
      className={cn(
        "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border",
        theme === "dark"
          ? "border-white/18 bg-white/10 text-white"
          : "border-[rgba(24,72,111,0.12)] bg-[linear-gradient(135deg,#16395d,#2f8f8a)] text-white shadow-[0_14px_32px_rgba(24,72,111,0.18)]",
        className
      )}
    >
      <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
        <path
          d="M24 6 35.5 11v11.2c0 6.7-4.3 12.8-11.5 16.4C16.8 35 12.5 28.9 12.5 22.2V11L24 6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M18 24.5c1.8-3.7 4.1-5.6 6-5.6 2.2 0 4.3 2.1 6 6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="17.2" r="2.3" fill="currentColor" />
      </svg>
      <div className="absolute inset-x-1 bottom-1 h-3 rounded-full bg-white/14 blur-sm" />
    </div>
  );
}

export function BrandLogo({ className, compact = false, iconOnly = false, theme = "light" }: BrandLogoProps) {
  if (iconOnly) {
    return <BrandMark className={className} theme={theme} />;
  }

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark theme={theme} />
      <div className="min-w-0">
        <p
          className={cn(
            "text-lg font-semibold tracking-[-0.04em]",
            theme === "dark" ? "text-white" : "text-[var(--foreground)]"
          )}
        >
          Método Sert
        </p>
        {!compact ? (
          <p className={cn("text-sm", theme === "dark" ? "text-white/66" : "text-[var(--muted-foreground)]")}>
            Inteligência em saúde ocupacional
          </p>
        ) : null}
      </div>
    </div>
  );
}
