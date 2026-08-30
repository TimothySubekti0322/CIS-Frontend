"use client";

import Link from "next/link";
import type { WatchlistItem } from "@/types/alert";
import { formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { StatusPill } from "@/components/ui/StatusPill";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

/** [C3] Watchlist table — newest-added first (PRD US29, US30). */
export function WatchlistTable({
  items,
  checked,
  onToggle,
}: {
  items: WatchlistItem[];
  checked: Set<string>;
  onToggle: (claimId: string) => void;
}) {
  return (
    <div className="scroll-x rounded-xl border border-pale-sky bg-white">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-pale-sky text-left text-xs uppercase text-regal-navy/60">
            <th className="px-4 py-3 font-bold">{strings.alerts.colId}</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colChart}</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colStatement}</th>
            <th className="px-4 py-3 font-bold">Score</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colCreated}</th>
            <th className="px-4 py-3 font-bold">{strings.alerts.colStatus}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.claimId} className="border-b border-pale-sky last:border-0">
              <td className="px-4 py-3 font-bold text-regal-navy">{item.claimId}</td>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={`Plot ${item.claimId} on the chart`}
                  checked={checked.has(item.claimId)}
                  onChange={() => onToggle(item.claimId)}
                  className="size-4 accent-sea-green"
                />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/claims/${item.claimId}`}
                  className="line-clamp-2 max-w-md font-medium text-regal-navy hover:text-sea-green"
                >
                  {item.statement}
                </Link>
              </td>
              <td className="px-4 py-3">
                <ScoreBadge score={item.finalClaimScore} size="sm" />
              </td>
              <td className="px-4 py-3 text-regal-navy/70">
                {formatDate(item.claimCreatedAt)}
              </td>
              <td className="px-4 py-3">
                {item.thresholdStatus === "over" ? (
                  <StatusPill tone="danger">{strings.alerts.overThreshold}</StatusPill>
                ) : (
                  <StatusPill tone="success">{strings.alerts.underThreshold}</StatusPill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
