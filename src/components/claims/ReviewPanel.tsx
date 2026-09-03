"use client";

import type { ClaimDetail } from "@/types/claim";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { CLAIM_STATUS_MAP } from "@/lib/constants/statuses";
import { StatusPill } from "@/components/ui/StatusPill";
import { ClaimStatusControl } from "./ClaimStatusControl";

/**
 * Review status for a claim, backed by `PUT /claims/:id/status` and read back
 * from the `review` object on `GET /claims/:id`.
 *
 * The status dropdown writes immediately. Free-text reviewer notes were removed
 * from this surface — the status itself is the record kept.
 */
export function ReviewPanel({ claim }: { claim: ClaimDetail }) {
  return (
    <div className="space-y-4 rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-h3">{strings.claims.reviewTitle}</h3>
        <StatusPill tone={CLAIM_STATUS_MAP[claim.reviewStatus].tone}>
          {CLAIM_STATUS_MAP[claim.reviewStatus].label}
        </StatusPill>
        <ClaimStatusControl claimId={claim.id} value={claim.reviewStatus} size="md" />
      </div>

      <p className="text-xs text-regal-navy/50">
        {claim.review?.reviewedAt
          ? formatDateTime(claim.review.reviewedAt)
          : strings.claims.reviewNever}
      </p>
    </div>
  );
}
