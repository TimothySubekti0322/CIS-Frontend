import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-pale-sky bg-white/60 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-3 text-glaucous">
        {icon ?? <Inbox className="size-8" aria-hidden />}
      </div>
      <p className="font-bold text-regal-navy">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-regal-navy/70">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
