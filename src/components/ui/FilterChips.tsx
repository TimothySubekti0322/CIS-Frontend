"use client";

import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
}

export interface FilterChipsProps {
  options: ChipOption[];
  /** Currently selected values. Empty array = the "all" chip is active. */
  selected: string[];
  onChange: (selected: string[]) => void;
  allLabel: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Multi-select chip row — reused for F1 topic filters (US6/US15) and
 * F2 year filters (US34). An empty selection means "all".
 */
export function FilterChips({
  options,
  selected,
  onChange,
  allLabel,
  className,
  "aria-label": ariaLabel,
}: FilterChipsProps) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  return (
    <div
      className={cn("scroll-x flex flex-wrap gap-2", className)}
      role="group"
      aria-label={ariaLabel}
    >
      <Chip active={selected.length === 0} onClick={() => onChange([])}>
        {allLabel}
      </Chip>
      {options.map((opt) => (
        <Chip
          key={opt.value}
          active={selected.includes(opt.value)}
          onClick={() => toggle(opt.value)}
        >
          {opt.label}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-sea-green bg-sea-green-soft font-bold text-sea-green hover:bg-sea-green-soft/70"
          : "border-pale-sky bg-white text-regal-navy/70 hover:border-glaucous",
      )}
    >
      {children}
    </button>
  );
}
