"use client";

import { strings } from "@/lib/constants/strings";
import { colorForIndex } from "./chartColors";
import type { ChartSeries } from "./ScoreLineChart";

/** [C2] Key / legend — only claims ticked in the table (PRD US28). */
export function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <h3 className="text-h3">{strings.alerts.legendTitle}</h3>
      {series.length === 0 ? (
        <p className="mt-2 text-sm text-regal-navy/50">
          {strings.alerts.legendEmpty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {series.map(({ item, colorIndex }: ChartSeries) => (
            <li key={item.claimId} className="flex items-start gap-2">
              <span
                className="mt-1 size-3 shrink-0 rounded-full"
                style={{ backgroundColor: colorForIndex(colorIndex) }}
                aria-hidden
              />
              <span className="text-sm text-regal-navy">
                <span className="font-bold">{item.claimId}</span>
                <span className="block text-xs text-regal-navy/60 line-clamp-2">
                  {item.statement}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
