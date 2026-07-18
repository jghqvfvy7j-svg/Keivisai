import { cn } from "@/lib/utils";

// Section header with an eyebrow label — encodes hierarchy, not decoration.
export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between", className)}>
      <div>
        {eyebrow && (
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-text-3">{eyebrow}</p>
        )}
        <h2 className="font-display text-lg font-bold text-text">{title}</h2>
      </div>
      {action}
    </div>
  );
}
