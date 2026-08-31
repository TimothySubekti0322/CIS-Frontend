"use client";

import { cn } from "@/lib/utils";

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

export interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  "aria-label"?: string;
}

/** Horizontal tab bar with a Sea Green active indicator (PRD §5.5). */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "scroll-x flex gap-1 border-b border-pale-sky",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-bold transition-colors",
              active
                ? "border-sea-green text-sea-green hover:text-sea-green/80"
                : "border-transparent text-regal-navy/60 hover:text-regal-navy",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
