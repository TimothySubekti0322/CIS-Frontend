"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Granularity } from "@/types/claim";
import { formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { useClaimScoreHistory } from "@/lib/hooks/useClaims";
import { Skeleton } from "@/components/ui/Skeleton";
import { GranularitySelect } from "@/components/ui/GranularitySelect";

/**
 * FinalClaimScore over time for a single claim.
 *
 * History only exists from the moment a claim joins the F3 watchlist — the
 * snapshot job captures watched claims only — so an empty series here is the
 * documented state for an unwatched claim, not an error.
 */
export function ScoreHistoryCard({ claimId }: { claimId: string }) {
  const [granularity, setGranularity] = useState<Granularity>("week");
  const { data, isPending, isError } = useClaimScoreHistory(claimId, { granularity });

  const points = data?.points ?? [];
  const chartData = points.map((p) => ({
    date: formatDate(p.bucketStart),
    score: p.finalClaimScore,
  }));

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-h3">{strings.claims.scoreHistoryTitle}</h3>
        <GranularitySelect value={granularity} onChange={setGranularity} />
      </div>

      {isPending ? (
        <Skeleton className="mt-3 h-48 w-full" />
      ) : isError || chartData.length === 0 ? (
        <p className="mt-3 text-sm text-regal-navy/60">
          {strings.claims.scoreHistoryEmpty}
        </p>
      ) : (
        <div className="mt-3 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#C0D9E2" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#1C357F" }}
                stroke="#C0D9E2"
              />
              {/* Fixed 0-100 so the axis never rescales between claims. */}
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
              <Line
                type="monotone"
                dataKey="score"
                name="FinalClaimScore"
                stroke="#1F8A70"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
