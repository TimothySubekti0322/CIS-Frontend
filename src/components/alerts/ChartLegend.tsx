"use client";

import Link from "next/link";
import type { AlertChartSeries } from "@/types/alert";
import { strings } from "@/lib/constants/strings";
import { colorForIndex } from "./chartColors";

/** [C2] Key / legend — exactly the claims the chart is plotting. */
export function ChartLegend({ series }: { series: AlertChartSeries[] }) {
  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <h3 className="text-h3">{strings.alerts.legendTitle}</h3>
      {series.length === 0 ? (
        <p className="mt-2 text-sm text-regal-navy/50">
          {strings.alerts.legendEmpty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {series.map((item, i) => (
            <li key={item.claimId} className="flex items-start gap-2">
              <span
                className="mt-1 size-3 shrink-0 rounded-full"
                style={{ backgroundColor: colorForIndex(i) }}
                aria-hidden
              />
              <Link
                href={`/claims/${item.claimId}`}
                className="min-w-0 text-sm text-regal-navy hover:text-sea-green"
              >
                <span className="line-clamp-2 font-medium">
                  {item.claimStatement}
                </span>
                {item.topic && (
                  <span className="block text-xs text-regal-navy/60">
                    {item.topic.name}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
