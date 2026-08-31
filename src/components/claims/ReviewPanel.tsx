"use client";

import { useEffect, useState } from "react";
import type { ClaimDetail } from "@/types/claim";
import { ApiError } from "@/types/common";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { CLAIM_STATUS_MAP } from "@/lib/constants/statuses";
import { useUpdateClaimStatus } from "@/lib/hooks/useClaims";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";
import { ClaimStatusControl } from "./ClaimStatusControl";
import { useToast } from "@/components/ui/Toast";

/**
 * Status + reviewer notes, both backed by `PUT /claims/:id/status` and read
 * back from the `review` object on `GET /claims/:id`.
 *
 * `cis_claim_reviews` holds one overlay row per claim, so saving a note
 * replaces the previous one — the panel says so rather than implying a log.
 * The status dropdown writes immediately; notes are explicit, since typing
 * should not fire a request per keystroke.
 */
export function ReviewPanel({ claim }: { claim: ClaimDetail }) {
  const { mutateAsync, isPending } = useUpdateClaimStatus();
  const { toast } = useToast();
  const [notes, setNotes] = useState(claim.review?.notes ?? "");

  // Adopt the server's value whenever the claim refetches.
  useEffect(() => setNotes(claim.review?.notes ?? ""), [claim.review?.notes]);

  const dirty = notes !== (claim.review?.notes ?? "");

  async function saveNotes() {
    try {
      // The endpoint always takes a status, so re-send the current one.
      await mutateAsync({ id: claim.id, status: claim.reviewStatus, notes });
      toast(strings.claims.reviewSaved);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-h3">{strings.claims.reviewTitle}</h3>
        <StatusPill tone={CLAIM_STATUS_MAP[claim.reviewStatus].tone}>
          {CLAIM_STATUS_MAP[claim.reviewStatus].label}
        </StatusPill>
        <ClaimStatusControl claimId={claim.id} value={claim.reviewStatus} size="md" />
      </div>

      <TextArea
        label={strings.claims.reviewNotes}
        placeholder={strings.claims.reviewNotesPlaceholder}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={2000}
        rows={3}
        hint={strings.claims.reviewOverlayNote}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-regal-navy/50">
          {claim.review?.reviewedAt ? (
            <>
              {formatDateTime(claim.review.reviewedAt)}
              {claim.review.reviewedBy && ` ${strings.claims.reviewBy} ${claim.review.reviewedBy}`}
            </>
          ) : (
            strings.claims.reviewNever
          )}
        </p>
        <Button size="sm" onClick={saveNotes} disabled={!dirty} loading={isPending}>
          {strings.common.save}
        </Button>
      </div>
    </div>
  );
}
