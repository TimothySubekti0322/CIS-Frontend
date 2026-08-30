"use client";

import { useState } from "react";
import type { ClaimStatus } from "@/types/claim";
import { STATUS_FILTER_TABS } from "@/lib/constants/statuses";
import { strings } from "@/lib/constants/strings";
import { Tabs } from "@/components/ui/Tabs";
import { ClaimSection } from "@/components/claims/ClaimSection";

/**
 * F1 — Claim Repository Bank.
 * S1 and S2 are ALWAYS both visible; the status tab filters within each section
 * independently, it never hides a whole section (PRD v1.3 US1).
 */
export default function ClaimsPage() {
  const [status, setStatus] = useState<ClaimStatus | "all">("all");

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
      </div>

      <ClaimSection
        variant="generic"
        statusFilter={status}
        limit={10}
        seeAllHref={`/claims/all?type=generic&status=${status}`}
      />

      <hr className="border-pale-sky" />

      <ClaimSection
        variant="synthetic"
        statusFilter={status}
        limit={10}
        seeAllHref={`/claims/all?type=synthetic&status=${status}`}
      />
    </div>
  );
}
