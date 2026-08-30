"use client";

import { useState } from "react";
import type { Stance } from "@/types/claim";
import { cn, formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { useClaimStatements } from "@/lib/hooks/useClaims";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";

export interface StatementListProps {
  claimId: string;
  title: string;
  stance: Extract<Stance, "positive" | "negative">;
  /** Total from the claim payload — may exceed the page shown here. */
  total: number | null;
}

const PAGE_SIZE = 5;

/**
 * Source posts behind a claim, paginated by the backend
 * (`GET /claims/:id/statements?stance=…`). The counts on the claim payload and
 * the rows here come from different endpoints, so the header shows the
 * authoritative total and the list shows the current page.
 */
export function StatementList({ claimId, title, stance, total }: StatementListProps) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError } = useClaimStatements(claimId, {
    stance,
    page,
    limit: PAGE_SIZE,
  });

  const statements = data?.items ?? [];
  const headline = total ?? data?.meta.total ?? 0;

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-h3">{title}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold",
            stance === "positive"
              ? "bg-mint-leaf-soft text-sea-green"
              : "bg-danger-soft text-danger",
          )}
        >
          {headline.toLocaleString()} total
        </span>
      </div>

      {isPending ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-3 text-sm text-regal-navy/60">{strings.errors.generic}</p>
      ) : statements.length === 0 ? (
        <p className="mt-3 text-sm text-regal-navy/60">
          {strings.claims.noStatements}
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {statements.map((s) => (
              <li key={s.id} className="border-l-2 border-pale-sky pl-3">
                <p className="text-sm text-regal-navy">{s.content}</p>
                <p className="mt-0.5 text-xs text-regal-navy/50">
                  {s.authorId ?? "anonymous"}
                  {s.postedAt ? ` · ${formatDate(s.postedAt)}` : ""}
                  {s.impressions !== null
                    ? ` · ${s.impressions.toLocaleString()} impressions`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
