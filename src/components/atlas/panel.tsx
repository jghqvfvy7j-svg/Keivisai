import { cn } from "@/lib/utils";

// The base surface for content. Quiet, hairline-bordered, soft elevation.
export function Panel({
  className,
  children,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--r-lg)] border border-hairline bg-surface",
        interactive && "transition-all duration-200 hover:border-hairline-strong active:scale-[0.995]",
        className
      )}
      style={{ boxShadow: "var(--e-1)" }}
      {...props}
    >
      {children}
    </div>
  );
}
