"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AlertChart } from "@/types/alert";
import { formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { colorForIndex } from "./chartColors";

/**
 * [C1] FinalClaimScore over time for the ticked claims.
 *
 * Series buckets are merged on `bucket_start` rather than by array index —
 * a claim watched last week has fewer buckets than one watched last year, and
 * zipping by position would silently plot the wrong dates against each other.
 *
 * The Y axis is fixed to the backend's `y_axis_min`/`y_axis_max` (0–100) so it
 * never rescales as claims are ticked on and off.
 */
export function ScoreLineChart({ chart }: { chart: AlertChart }) {
  const { rows, labels } = useMemo(() => {
    const byBucket = new Map<string, Record<string, number | string | null>>();
    for (const series of chart.series) {
      for (const point of series.points) {
        const row = byBucket.get(point.bucketStart) ?? {
          bucket: point.bucketStart,
          date: formatDate(point.bucketStart),
        };
        row[series.claimId] = point.finalClaimScore;
        byBucket.set(point.bucketStart, row);
      }
    }
    return {
      rows: [...byBucket.values()].sort((a, b) =>
        String(a.bucket).localeCompare(String(b.bucket)),
      ),
      labels: Object.fromEntries(
        chart.series.map((s) => [s.claimId, truncate(s.claimStatement)]),
      ) as Record<string, string>,
    };
  }, [chart]);

  if (chart.series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-pale-sky bg-white/60 px-6 text-center text-sm text-regal-navy/50">
        {strings.alerts.legendEmpty}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-pale-sky bg-white/60 px-6 text-center text-sm text-regal-navy/50">
        {strings.alerts.chartEmpty}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <h3 className="text-h3">{strings.alerts.chartTitle}</h3>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#C0D9E2" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#1C357F" }}
              stroke="#C0D9E2"
            />
            <YAxis
              domain={[chart.yAxisMin, chart.yAxisMax]}
              tick={{ fontSize: 11, fill: "#1C357F" }}
              stroke="#C0D9E2"
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #C0D9E2",
                fontSize: 12,
              }}
              formatter={(value, key) => [value, labels[String(key)] ?? key]}
            />
            {/* The global F4 threshold, so Over/Under is visible on the chart. */}
            {chart.threshold !== null && (
              <ReferenceLine
                y={chart.threshold}
                stroke="#C8A227"
                strokeDasharray="6 4"
                label={{
                  value: `Threshold ${chart.threshold}`,
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: "#1C357F",
                }}
              />
            )}
            {chart.series.map((series, i) => (
              <Line
                key={series.claimId}
                type="monotone"
                dataKey={series.claimId}
                name={labels[series.claimId]}
                stroke={colorForIndex(i)}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
