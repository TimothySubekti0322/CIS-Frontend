import Link from "next/link";
import { FileText } from "lucide-react";
import type { ClaimPolicyRef } from "@/types/claim";
import { formatMonthYear } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * Correlated public policies. `source` matters for navigation: only a `cis`
 * policy was registered in this system and has a detail page here — an `ai`
 * policy exists solely in the AI service's own table, so it renders as plain
 * text rather than a dead link.
 */
export function CorrelatedPolicies({
  title,
  policies,
}: {
  title: string;
  policies: ClaimPolicyRef[];
}) {
  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <h3 className="text-h3">{title}</h3>
      {policies.length === 0 ? (
        <p className="mt-2 text-sm text-regal-navy/60">{strings.claims.noPolicies}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {policies.map((p) => (
            <li key={p.id}>
              <PolicyRow policy={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PolicyRow({ policy }: { policy: ClaimPolicyRef }) {
  const body = (
    <>
      <FileText className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{policy.name}</span>
        {policy.rolledOutDate && (
          <span className="block text-xs font-normal text-regal-navy/50">
            {formatMonthYear(policy.rolledOutDate)}
          </span>
        )}
      </span>
      {policy.source === "ai" && <StatusPill tone="muted">AI</StatusPill>}
    </>
  );

  const className =
    "flex items-center gap-2 rounded-lg border border-pale-sky px-3 py-2 text-sm font-bold text-regal-navy";

  return policy.source === "cis" ? (
    <Link
      href={`/policies/${policy.id}`}
      className={`${className} hover:border-sea-green hover:text-sea-green`}
    >
      {body}
    </Link>
  ) : (
    <div className={`${className} bg-mint-cream/40`} title="Created by the AI service — no policy-bank record exists">
      {body}
    </div>
  );
}
