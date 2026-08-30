"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WatchlistItem } from "@/types/alert";
import { formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { colorForIndex } from "./chartColors";

export interface ChartSeries {
  item: WatchlistItem;
  colorIndex: number;
}

/** [C1] FinalClaimScore over time — Y axis 0–100 (PRD US27). */
export function ScoreLineChart({ series }: { series: ChartSeries[] }) {
  const data = useMemo(() => {
    if (series.length === 0) return [];
    const base = series[0].item.history.map((p) => ({
      date: formatDate(p.date),
    })) as Record<string, string | number>[];
    series.forEach(({ item }) => {
      item.history.forEach((p, i) => {
        base[i][item.claimId] = p.score;
      });
    });
    return base;
  }, [series]);

  if (series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-pale-sky bg-white/60 text-sm text-regal-navy/50">
        {strings.alerts.legendEmpty}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <h3 className="text-h3">{strings.alerts.chartTitle}</h3>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#C0D9E2" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#1C357F" }}
              stroke="#C0D9E2"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#1C357F" }}
              stroke="#C0D9E2"
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #C0D9E2",
                fontSize: 12,
              }}
            />
            {series.map(({ item, colorIndex }) => (
              <Line
                key={item.claimId}
                type="monotone"
                dataKey={item.claimId}
                name={item.claimId}
                stroke={colorForIndex(colorIndex)}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
