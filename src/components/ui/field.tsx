import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  htmlFor?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  message?: React.ReactNode;
};

export function Field({
  children,
  className,
  description,
  htmlFor,
  label,
  message,
  ...props
}: FieldProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {label ? <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel> : null}
      <FieldContent>{children}</FieldContent>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {message ? <FieldMessage>{message}</FieldMessage> : null}
    </div>
  );
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label
      className={cn(
        "block font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--muted-foreground)]",
        className
      )}
      {...props}
    />
  );
}

export function FieldContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-[var(--muted-foreground)]", className)} {...props} />
  );
}

export function FieldMessage({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--foreground)]", className)} {...props} />;
}
