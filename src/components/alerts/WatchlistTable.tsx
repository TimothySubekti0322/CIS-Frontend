"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Trash2 } from "lucide-react";
import type { WatchlistItem } from "@/types/alert";
import { ApiError } from "@/types/common";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { useSetChartVisible, useToggleWatchlist } from "@/lib/hooks/useAlerts";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";

/**
 * The watchlist table, ordered most-recently-added first by the backend.
 *
 * The "Chart" checkbox is server state, not local: `GET /alerts/chart` returns
 * only the ticked claims, so the tick has to persist through
 * `PATCH /alerts/:claimId/chart` before the chart can reflect it.
 *
 * The crossing highlight: `justCrossed` is per-reader and clears when this
 * page acknowledges; `crossedAt`/`crossedDirection` persist, which is what
 * the "last moved" column reads. The tint is a light Pale-Sky wash,
 * deliberately lighter than the standing Over-Threshold pill — "this moved"
 * and "this is high" are different statements and must not compete.
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
            <th className="px-4 py-3 text-center font-bold">
              {strings.alerts.colStatus}
            </th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colLastMoved}</th>
            <th className="px-4 py-3 font-bold">
              <span className="sr-only">{strings.alerts.colRemove}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.claimId}
              className={cn(
                "border-b border-pale-sky last:border-0",
                item.justCrossed && "bg-pale-sky/30",
              )}
            >
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
              <td className="px-4 py-3 text-center">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {item.thresholdStatus === "over_threshold" ? (
                    <StatusPill tone="danger">{strings.alerts.overThreshold}</StatusPill>
                  ) : (
                    <StatusPill tone="success">
                      {strings.alerts.underThreshold}
                    </StatusPill>
                  )}
                  {/* The tint alone would carry this for sighted users only. */}
                  {item.justCrossed && (
                    <StatusPill tone="muted">{strings.alerts.justCrossed}</StatusPill>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-regal-navy/70">
                <CrossingCell item={item} />
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

/**
 * The "last moved" column. `crossedAt` and `crossedDirection` survive
 * acknowledgment — only `justCrossed` clears — so this keeps telling the
 * reader what last happened to a claim after the highlight has gone.
 * A claim that has never crossed shows nothing rather than a zero state.
 */
function CrossingCell({ item }: { item: WatchlistItem }) {
  if (!item.crossedAt || !item.crossedDirection) {
    return <span className="text-regal-navy/40">—</span>;
  }
  const up = item.crossedDirection === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        up ? "text-danger" : "text-sea-green",
      )}
      title={up ? strings.alerts.crossedUp : strings.alerts.crossedDown}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="text-regal-navy/70">{formatDateTime(item.crossedAt)}</span>
      <span className="sr-only">
        {up ? strings.alerts.crossedUp : strings.alerts.crossedDown}
      </span>
    </span>
  );
}
