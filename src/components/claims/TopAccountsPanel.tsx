import type { TopAccount } from "@/types/claim";
import { strings } from "@/lib/constants/strings";

/**
 * Top 5 Accounts driving a claim's spread (PRD US12 — interpretation flagged:
 * ranked by contribution to the supporting-side cluster).
 */
export function TopAccountsPanel({ accounts }: { accounts: TopAccount[] }) {
  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <h3 className="text-h3">{strings.claims.topAccounts}</h3>
      <p className="mt-1 text-xs text-regal-navy/60">
        {strings.claims.topAccountsNote}
      </p>
      <ol className="mt-3 divide-y divide-pale-sky">
        {accounts.map((acc) => (
          <li key={acc.rank} className="flex items-center gap-3 py-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-glaucous-soft text-xs font-bold text-regal-navy">
              {acc.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-regal-navy">
                {acc.handle}
              </p>
              <p className="truncate text-xs text-regal-navy/60">
                {acc.contributionLabel}
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums text-regal-navy">
              {acc.contribution.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
