"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-surface-2! border-border! text-foreground! rounded-2xl! shadow-xl!",
          description: "text-muted!",
          actionButton: "bg-volt! text-volt-foreground!",
          cancelButton: "bg-surface! text-muted!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
