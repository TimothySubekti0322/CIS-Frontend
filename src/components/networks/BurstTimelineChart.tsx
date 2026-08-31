"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BurstTimeline } from "@/types/network";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * US53 — per-bin post volume across the detection window, with statistically
 * anomalous bins highlighted and annotated with their z-score.
 *
 * The bin width is stated rather than implied: a burst chart is unreadable
 * without knowing what one bar spans, and reading a 60-second bar as an hourly
 * one turns ordinary activity into an apparent lockstep burst.
 */
export function BurstTimelineChart({
  timeline,
  isPending,
}: {
  timeline: BurstTimeline | undefined;
  isPending: boolean;
}) {
  const rows = useMemo(
    () =>
      (timeline?.bins ?? []).map((bin) => ({
        bin: bin.binStart,
        label: formatDateTime(bin.binStart),
        posts: bin.postCount,
        zScore: bin.zScore,
        anomalous: bin.isAnomalous,
      })),
    [timeline],
  );

  if (isPending) {
    return (
      <Card className="space-y-3">
        <h2 className="text-h3">{strings.networks.timelineTitle}</h2>
        <Skeleton className="h-56 w-full" />
      </Card>
    );
  }

  if (!timeline || rows.length === 0) {
    return (
      <Card className="space-y-3">
        <h2 className="text-h3">{strings.networks.timelineTitle}</h2>
        <EmptyState title={strings.networks.timelineEmpty} />
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-h3">{strings.networks.timelineTitle}</h2>
        <p className="text-xs text-regal-navy/60">
          {strings.networks.timelineBin}: {formatBinWidth(timeline.binWidthSeconds)}{" "}
          · {timeline.anomalousCount} {strings.networks.timelineAnomalous}
        </p>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--color-pale-sky)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-glaucous)" }}
              stroke="var(--color-pale-sky)"
              minTickGap={32}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-glaucous)" }}
              stroke="var(--color-pale-sky)"
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-pale-sky)", fillOpacity: 0.3 }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--color-pale-sky)",
                fontSize: 12,
              }}
              formatter={(value: number, _name, item) => {
                const z = (item?.payload as { zScore?: number })?.zScore ?? 0;
                return [`${value} posts · z = ${z.toFixed(2)}`, "Bin"];
              }}
            />
            <Bar dataKey="posts" radius={[3, 3, 0, 0]}>
              {rows.map((row) => (
                <Cell
                  key={row.bin}
                  fill={
                    row.anomalous
                      ? "var(--color-danger)"
                      : "var(--color-frosted-blue)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-regal-navy/50">
        {formatDateTime(timeline.windowStart)} — {formatDateTime(timeline.windowEnd)}
      </p>
    </Card>
  );
}

function formatBinWidth(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} h`;
}
