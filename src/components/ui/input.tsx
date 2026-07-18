import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-hairline bg-surface-2 px-4 text-base text-text placeholder:text-text-3 outline-none transition-colors focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal/25 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
export { Input };
