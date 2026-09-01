"use client";

import Link from "next/link";
import type { OverviewPolicy } from "@/types/overview";
import { strings } from "@/lib/constants/strings";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * O3 — the policies attracting the most high-risk claims (US70), ranked by the
 * same combined metric that sizes the O2 treemap.
 *
 * A policy can reach this list from the AI service without ever being
 * registered in the Public Policy Bank, so `source` decides whether the name
 * is a link: sending a reader to an F2 detail page that does not exist is
 * worse than showing the name plainly and saying why it is not clickable.
 */
export function HotPoliciesTable({ policies }: { policies: OverviewPolicy[] }) {
  return (
    <section className="rounded-xl border border-pale-sky bg-white p-5">
      <div className="flex items-center gap-1.5">
        <h2 className="text-h3">{strings.overview.policiesTitle}</h2>
        <InfoTooltip content={strings.overview.policiesSubtitle} align="start" />
      </div>

      {policies.length === 0 ? (
        <EmptyState
          title={strings.overview.policiesEmpty}
          className="mt-4 border-0 bg-transparent"
        />
      ) : (
        <div className="scroll-x mt-3">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-pale-sky text-left text-xs uppercase text-regal-navy/60">
                <th className="py-2 pr-3 font-bold">{strings.overview.colRank}</th>
                <th className="py-2 pr-3 font-bold">{strings.overview.colPolicy}</th>
                <th className="py-2 pr-3 font-bold">{strings.overview.colClaims}</th>
                <th className="py-2 pr-3 font-bold">{strings.overview.colAbove}</th>
                <th className="py-2 pr-3 font-bold">{strings.overview.colAverage}</th>
                <th className="py-2 font-bold">{strings.overview.colScore}</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((row) => (
                <tr
                  key={`${row.policy.id}-${row.rank}`}
                  className="border-b border-pale-sky last:border-0"
                >
                  <td className="py-3 pr-3 font-bold tabular-nums text-regal-navy/50">
                    {row.rank}
                  </td>
                  <td className="py-3 pr-3">
                    <PolicyName row={row} />
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-regal-navy/70">
                    {row.claimCount}
                  </td>
                  <td className="py-3 pr-3">
                    {row.aboveThresholdCount > 0 ? (
                      <StatusPill tone="danger">{row.aboveThresholdCount}</StatusPill>
                    ) : (
                      <span className="tabular-nums text-regal-navy/50">0</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-regal-navy/70">
                    {row.averageScore === null
                      ? strings.common.notAvailable
                      : row.averageScore.toFixed(1)}
                  </td>
                  <td className="py-3">
                    <ScoreBadge
                      score={row.score}
                      size="sm"
                      label={strings.overview.colScore}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PolicyName({ row }: { row: OverviewPolicy }) {
  const { policy } = row;

  // Only an F2-registered policy has a detail page to open.
  if (policy.source === "cis" && policy.id) {
    return (
      <Link
        href={`/policies/${policy.id}`}
        className="font-medium text-regal-navy hover:text-sea-green"
      >
        {policy.name}
      </Link>
    );
  }

  return (
    <span className="flex flex-col">
      <span className="font-medium text-regal-navy">{policy.name}</span>
      <span className="text-xs text-regal-navy/50">
        {strings.overview.policyAiOnly}
      </span>
    </span>
  );
}
