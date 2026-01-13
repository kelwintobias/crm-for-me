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
            "group toast group-[.toaster]:bg-brand-card group-[.toaster]:text-text-primary group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-text-secondary",
          actionButton:
            "group-[.toast]:bg-brand-accent group-[.toast]:text-text-dark",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-text-secondary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
