"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { WatchlistItem } from "@/types/alert";
import { ApiError } from "@/types/common";
import { formatDate, formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { useSetChartVisible, useToggleWatchlist } from "@/lib/hooks/useAlerts";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";

/**
 * [C3] The watchlist table, ordered most-recently-added first by the backend.
 *
 * The "Chart" checkbox is server state, not local: `GET /alerts/chart` returns
 * only the ticked claims, so the tick has to persist through
 * `PATCH /alerts/:claimId/chart` before the chart can reflect it.
 */
export function WatchlistTable({ items }: { items: WatchlistItem[] }) {
  const setVisible = useSetChartVisible();
  const toggleWatch = useToggleWatchlist();
  const { toast } = useToast();

  async function onToggleChart(item: WatchlistItem) {
    try {
      await setVisible.mutateAsync({
        claimId: item.claimId,
        visible: !item.chartVisible,
      });
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : strings.alerts.chartToggleFailed,
        "error",
      );
    }
  }

  async function onRemove(item: WatchlistItem) {
    try {
      // Removing also clears the chart tick server-side, in one step.
      await toggleWatch.mutateAsync({ claimId: item.claimId, add: false });
      toast(strings.alerts.removed);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <div className="scroll-x rounded-xl border border-pale-sky bg-white">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-pale-sky text-left text-xs uppercase text-regal-navy/60">
            <th className="px-4 py-3 font-bold">{strings.alerts.colChart}</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colStatement}</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colTopic}</th>
            <th className="px-4 py-3 font-bold">Score</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colCreatedDate}</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colAdded}</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colStatus}</th>
            <th className="px-4 py-3 font-bold">
              <span className="sr-only">{strings.alerts.colRemove}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.claimId} className="border-b border-pale-sky last:border-0">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={`Plot "${item.claimStatement}" on the chart`}
                  checked={item.chartVisible}
                  disabled={setVisible.isPending}
                  onChange={() => onToggleChart(item)}
                  className="size-4 accent-sea-green"
                />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/claims/${item.claimId}`}
                  className="line-clamp-2 max-w-md font-medium text-regal-navy hover:text-sea-green"
                >
                  {item.claimStatement}
                </Link>
              </td>
              <td className="px-4 py-3 text-regal-navy/70">
                {item.topic?.name ?? "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {/* An unscored claim shows no badge — never a zero. */}
                  {item.finalClaimScore === null ? (
                    <span className="text-xs text-regal-navy/50">
                      {strings.claims.notScored}
                    </span>
                  ) : (
                    <ScoreBadge score={item.finalClaimScore} size="sm" />
                  )}
                  {item.isDormant && (
                    <StatusPill tone="neutral">{strings.claims.dormant}</StatusPill>
                  )}
                </div>
              </td>
              {/* Two distinct dates: when the claim itself appeared, and when
                  the operator started watching it. */}
              <td className="px-4 py-3 text-regal-navy/70">
                {formatDate(item.claimCreatedAt)}
              </td>
              <td className="px-4 py-3 text-regal-navy/70">
                {formatDateTime(item.addedAt)}
              </td>
              <td className="px-4 py-3">
                {item.thresholdStatus === "over_threshold" ? (
                  <StatusPill tone="danger">{strings.alerts.overThreshold}</StatusPill>
                ) : (
                  <StatusPill tone="success">{strings.alerts.underThreshold}</StatusPill>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <IconButton
                  label={strings.alerts.remove}
                  onClick={() => onRemove(item)}
                  disabled={toggleWatch.isPending}
                  className="text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
