"use client";

import { useId } from "react";
import type { Granularity } from "@/types/claim";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: strings.alerts.granularityDay },
  { value: "week", label: strings.alerts.granularityWeek },
  { value: "month", label: strings.alerts.granularityMonth },
  { value: "year", label: strings.alerts.granularityYear },
];

export interface GranularitySelectProps {
  value: Granularity;
  onChange: (value: Granularity) => void;
  /**
   * Render the "Granularity" caption beside the control. Day/Week/Month/Year
   * name themselves, so a surface that has no room for the word can drop it —
   * the accessible name is carried by the hidden `<label>` and the group's
   * `aria-label` either way, never by the visible text alone.
   */
  showLabel?: boolean;
  className?: string;
}

/**
 * Bucket size for the score-history endpoints, built once and used in both
 * the per-claim Score History Chart and the alerts chart. Both endpoints take
 * the same parameter and the same four values, and the backend default is
 * `week`.
 *
 * A segmented control that collapses to a dropdown below tablet width. Both
 * are rendered and swapped with CSS rather than a width listener: a JS
 * breakpoint would flash the wrong control on first paint and could disagree
 * with the CSS breakpoints used everywhere else. Only one is ever visible, so
 * only one is ever announced.
 */
export function GranularitySelect({
  value,
  onChange,
  showLabel = true,
  className,
}: GranularitySelectProps) {
  const selectId = useId();
  const label = strings.alerts.granularity;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* The dropdown's accessible name. Visually hidden rather than removed
          when the caption is off: an unlabelled select is a real defect, not a
          tidier one. */}
      <label
        htmlFor={selectId}
        className={cn("text-xs text-regal-navy/60", showLabel ? "sm:hidden" : "sr-only")}
      >
        {label}
      </label>
      {showLabel && (
        <span
          className="hidden text-xs text-regal-navy/60 sm:inline"
          aria-hidden
        >
          {label}
        </span>
      )}

      {/* Below tablet: a native dropdown — four inline buttons crowd out the
          chart on a phone, and the native picker is the better touch target. */}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as Granularity)}
        className="h-8 rounded-lg border border-pale-sky bg-white px-2 text-xs font-bold text-regal-navy focus-visible:border-sea-green focus-visible:outline-none sm:hidden"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Tablet and up: a segmented control, so the whole range is visible and
          switching granularity is one click rather than three. */}
      <div
        role="radiogroup"
        aria-label={label}
        className="hidden items-center rounded-lg border border-pale-sky bg-white p-0.5 sm:inline-flex"
      >
        {OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "cursor-pointer rounded-md px-2.5 py-1 text-xs font-bold transition-colors",
                active
                  ? "bg-sea-green text-white"
                  : "text-regal-navy/60 hover:bg-sea-green-soft hover:text-sea-green",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
