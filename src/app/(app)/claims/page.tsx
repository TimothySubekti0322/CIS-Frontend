"use client";

import { useMemo, useState } from "react";
import type { ClaimStatusFilter } from "@/types/claim";
import { STATUS_FILTER_TABS } from "@/lib/constants/statuses";
import { strings } from "@/lib/constants/strings";
import { useClaimRepository } from "@/lib/hooks/useClaims";
import { Tabs } from "@/components/ui/Tabs";
import { ClaimSection } from "@/components/claims/ClaimSection";
import { TopicFilter } from "@/components/claims/TopicFilter";

/**
 * F1 — Claim Repository Bank.
 *
 * The whole page is one call: `GET /claims/repository` returns both sections
 * already filtered and ranked. S1 and S2 are ALWAYS both visible — the status
 * tab filters within each section, it never hides one.
 */
export default function ClaimsPage() {
  const [status, setStatus] = useState<ClaimStatusFilter>("all");
  const [topicIds, setTopicIds] = useState<string[]>([]);

  const params = useMemo(
    () => ({ status, topicIds: topicIds.length ? topicIds : undefined }),
    [status, topicIds],
  );
  const { data, isPending, isError } = useClaimRepository(params);

  const topicQuery = topicIds.length ? `&topic_ids=${topicIds.join(",")}` : "";

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-h1">{strings.claims.pageTitle}</h1>
        <Tabs
          options={STATUS_FILTER_TABS}
          value={status}
          onChange={setStatus}
          aria-label="Filter claims by status"
        />
        <TopicFilter selected={topicIds} onChange={setTopicIds} />
      </div>

      <ClaimSection
        claimType="existing"
        section={data?.existing}
        isPending={isPending}
        isError={isError}
        status={status}
        topicIds={topicIds}
        lastFetchedAt={data?.lastFetchedAt}
        seeAllHref={`/claims/all?type=existing&status=${status}${topicQuery}`}
      />

      <hr className="border-pale-sky" />

      <ClaimSection
        claimType="non_existing"
        section={data?.nonExisting}
        isPending={isPending}
        isError={isError}
        status={status}
        topicIds={topicIds}
        seeAllHref={`/claims/all?type=non_existing&status=${status}${topicQuery}`}
      />
    </div>
  );
}
