"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { NetworkDetail, NetworkReviewStatus } from "@/types/network";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import {
  MIN_REVIEW_REASON,
  NETWORK_STATUSES,
} from "@/lib/constants/networkStatuses";
import {
  useAllowlistNetwork,
  useUpdateNetworkStatus,
} from "@/lib/hooks/useNetworks";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { AllowlistForm, type AllowlistDraft } from "./AllowlistForm";

/**
 * US52 — the assessment control, as one line of the cluster sheet.
 *
 * Picking a status here does not save it: the select opens the reason dialog
 * pre-set to the chosen status, because a reason of at least 20 characters is
 * mandatory and a one-click status change would have no way to collect it.
 * That minimum is not friction for its own sake — the reason is the input both
 * the allowlist (US56) and the recalibration analysis (PRD 10.9.3) learn from,
 * and a dismissal with no stated reason teaches neither anything.
 */
export function NetworkReviewBar({ network }: { network: NetworkDetail }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NetworkReviewStatus>(network.reviewStatus);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const update = useUpdateNetworkStatus(network.id);
  const tooShort = reason.trim().length < MIN_REVIEW_REASON;

  function pick(next: NetworkReviewStatus) {
    setStatus(next);
    setReason("");
    setTouched(false);
    setOpen(true);
  }

  async function save() {
    setTouched(true);
    if (tooShort) return;
    try {
      await update.mutateAsync({ status, reason: reason.trim() });
      toast(strings.networks.reviewSaved);
      setOpen(false);
      setReason("");
      setTouched(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-pale-sky py-3.5">
        <span className="text-[11px] font-bold tracking-[0.06em] text-regal-navy/60 uppercase">
          {strings.networks.yourAssessment}
        </span>
        <label className="sr-only" htmlFor="cluster-assessment">
          {strings.networks.reviewStatus}
        </label>
        <select
          id="cluster-assessment"
          value={network.reviewStatus}
          onChange={(e) => pick(e.target.value as NetworkReviewStatus)}
          className="h-9 cursor-pointer rounded-lg border border-pale-sky bg-white px-2.5 text-sm text-regal-navy hover:border-sea-green focus-visible:border-sea-green focus-visible:outline-none"
        >
          {NETWORK_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-regal-navy/50">
          {strings.networks.assessmentGate}
        </span>
        {network.review?.reviewedAt && (
          <span className="ml-auto text-xs text-regal-navy/50">
            {formatDateTime(network.review.reviewedAt)}
          </span>
        )}
      </div>

      {/* A dismissal is the one assessment whose reasoning has to stay on the
          page: it is the standing answer to "why is this cluster still here
          and still unactioned?". */}
      {network.reviewStatus === "dismissed_false_positive" &&
        network.review?.reason && (
          <p className="mt-4 flex gap-2.5 rounded-xl bg-mint-leaf-soft px-3.5 py-3 text-sm leading-relaxed text-regal-navy">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-sea-green"
              aria-hidden
            />
            <span>
              <span className="font-bold">
                {strings.networks.dismissedNoteTitle}.{" "}
              </span>
              {network.review.reason}
            </span>
          </p>
        )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={strings.networks.changeStatus}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {strings.common.cancel}
            </Button>
            <Button onClick={save} loading={update.isPending} disabled={tooShort}>
              {strings.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="network-status"
              className="text-sm font-bold text-regal-navy"
            >
              {strings.networks.reviewStatus}
            </label>
            <select
              id="network-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as NetworkReviewStatus)}
              className="h-10 rounded-lg border border-pale-sky bg-white px-3 text-sm text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
            >
              {NETWORK_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <TextArea
            label={strings.networks.reviewReason}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={strings.networks.reviewReasonPlaceholder}
            hint={strings.networks.reviewReasonHint}
            error={touched && tooShort ? strings.networks.reviewReasonTooShort : null}
          />
        </div>
      </Modal>
    </>
  );
}

/**
 * US56 — declaring the whole cluster legitimate. Kept out of the assessment
 * select on purpose: "dismissed as a false positive" is a judgement about this
 * one detection, while allowlisting is a standing instruction that suppresses
 * these accounts in every future run and retroactively across history.
 */
export function AllowlistNetworkDialog({
  network,
  open,
  onClose,
}: {
  network: NetworkDetail;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const allowlist = useAllowlistNetwork(network.id);

  async function submit(draft: AllowlistDraft) {
    try {
      const result = await allowlist.mutateAsync(draft);
      toast(
        result.exportedReportsAffected.length > 0
          ? `${strings.networks.allowlistDone}. ${strings.networks.allowlistRetroactive}`
          : `${strings.networks.allowlistDone} (${result.accountsAdded} accounts).`,
      );
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={strings.networks.allowlistTitle}>
      <div className="space-y-3">
        <p className="text-sm text-regal-navy/70">
          {strings.networks.allowlistBody}
        </p>
        <AllowlistForm
          onSubmit={submit}
          onCancel={onClose}
          pending={allowlist.isPending}
        />
      </div>
    </Modal>
  );
}
