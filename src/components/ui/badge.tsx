import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-surface-2 text-text-2",
        volt: "border-transparent bg-signal text-signal-ink",
        signal: "border-transparent bg-signal text-signal-ink",
        coral: "border-transparent bg-bad text-white",
        outline: "border-hairline text-text-2",
        success: "border-transparent bg-good/15 text-good",
        warning: "border-transparent bg-warn/15 text-warn",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };
