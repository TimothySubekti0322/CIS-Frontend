"use client";

import type { Granularity } from "@/types/claim";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: "day", label: strings.alerts.granularityDay },
  { value: "week", label: strings.alerts.granularityWeek },
  { value: "month", label: strings.alerts.granularityMonth },
  { value: "year", label: strings.alerts.granularityYear },
];

/** Bucket size for the score-history endpoints. Backend default is `week`. */
export function GranularitySelect({
  value,
  onChange,
  className,
}: {
  value: Granularity;
  onChange: (value: Granularity) => void;
  className?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-regal-navy/60">
      {strings.alerts.granularity}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Granularity)}
        className={cn(
          "h-8 rounded-lg border border-pale-sky bg-white px-2 text-xs font-bold text-regal-navy focus-visible:border-sea-green focus-visible:outline-none",
          className,
        )}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
