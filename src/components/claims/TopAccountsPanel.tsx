import type { TopAccount } from "@/types/claim";
import { strings } from "@/lib/constants/strings";

/**
 * Top 5 Accounts. Ranked over supporting-side content only, ordered by
 * contributed impressions with post count as the tiebreaker — the backend has
 * already applied that ordering, so `rank` is rendered as received.
 */
export function TopAccountsPanel({ accounts }: { accounts: TopAccount[] }) {
  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <h3 className="text-h3">{strings.claims.topAccounts}</h3>
      <p className="mt-1 text-xs text-regal-navy/60">
        {strings.claims.topAccountsNote}
      </p>
      {accounts.length === 0 ? (
        <p className="mt-3 text-sm text-regal-navy/60">
          {strings.claims.noTopAccounts}
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-pale-sky">
          {accounts.map((acc) => (
            <li key={`${acc.rank}-${acc.authorId}`} className="flex items-center gap-3 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-glaucous-soft text-xs font-bold text-regal-navy">
                {acc.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-regal-navy">
                  {acc.authorId}
                </p>
                <p className="truncate text-xs text-regal-navy/60">
                  {acc.contentCount.toLocaleString()} post
                  {acc.contentCount === 1 ? "" : "s"} in the supporting cluster
                </p>
              </div>
              <span
                className="text-sm font-bold tabular-nums text-regal-navy"
                title="Total impressions contributed"
              >
                {acc.totalImpressions.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
