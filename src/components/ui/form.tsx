import * as React from "react";
import { cn } from "@/lib/utils";

export type FormProps = React.FormHTMLAttributes<HTMLFormElement>;

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <form ref={ref} className={cn("space-y-6", className)} {...props}>
        {children}
      </form>
    );
  }
);

Form.displayName = "Form";
