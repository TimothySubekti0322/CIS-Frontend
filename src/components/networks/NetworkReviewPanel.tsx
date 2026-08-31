"use client";

import { useState } from "react";
import { History, ShieldCheck } from "lucide-react";
import type { NetworkDetail, NetworkReviewStatus } from "@/types/network";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import {
  MIN_REVIEW_REASON,
  NETWORK_STATUSES,
} from "@/lib/constants/networkStatuses";
import {
  useAllowlistNetwork,
  useNetworkReviewLog,
  useUpdateNetworkStatus,
} from "@/lib/hooks/useNetworks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { NetworkStatusPill } from "./NetworkPills";
import { AllowlistForm, type AllowlistDraft } from "./AllowlistForm";
import { formatValue, humanise } from "./WhyFlaggedPanel";

/**
 * US52 — recording the team's assessment.
 *
 * A reason of at least 20 characters is mandatory, unlike F1's optional claim
 * review notes. That is not friction for its own sake: the reason is the input
 * the allowlist (US56) and the recalibration analysis (PRD 10.9.3) both learn
 * from, and a dismissal with no stated reason teaches neither anything.
 */
export function NetworkReviewPanel({ network }: { network: NetworkDetail }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [status, setStatus] = useState<NetworkReviewStatus>(network.reviewStatus);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const update = useUpdateNetworkStatus(network.id);
  const allowlist = useAllowlistNetwork(network.id);
  const { data: log } = useNetworkReviewLog(network.id);

  const tooShort = reason.trim().length < MIN_REVIEW_REASON;

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

  async function declareLegitimate(draft: AllowlistDraft) {
    try {
      const result = await allowlist.mutateAsync(draft);
      toast(
        result.exportedReportsAffected.length > 0
          ? `${strings.networks.allowlistDone}. ${strings.networks.allowlistRetroactive}`
          : `${strings.networks.allowlistDone} (${result.accountsAdded} accounts).`,
      );
      setDeclaring(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3">{strings.networks.reviewTitle}</h2>
          {network.review ? (
            <p className="mt-1 text-xs text-regal-navy/60">
              {formatDateTime(network.review.reviewedAt)}
              {network.review.reviewedBy
                ? ` · ${strings.claims.reviewBy} ${network.review.reviewedBy}`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-regal-navy/60">
              {strings.networks.reviewLogEmpty}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NetworkStatusPill status={network.reviewStatus} />
          <Button
            size="sm"
            onClick={() => {
              setStatus(network.reviewStatus);
              setOpen(true);
            }}
          >
            {strings.networks.changeStatus}
          </Button>
        </div>
      </div>

      {network.review?.reason && (
        <p className="rounded-lg bg-mint-cream px-3 py-2 text-sm text-regal-navy">
          {network.review.reason}
        </p>
      )}

      {declaring ? (
        <AllowlistForm
          onSubmit={declareLegitimate}
          onCancel={() => setDeclaring(false)}
          pending={allowlist.isPending}
        />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setDeclaring(true)}>
          <ShieldCheck className="size-4" aria-hidden />
          {strings.networks.allowlistNetwork}
        </Button>
      )}

      {log && log.length > 0 && (
        <details className="rounded-lg border border-pale-sky">
          <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-regal-navy">
            <span className="inline-flex items-center gap-1.5">
              <History className="size-4" aria-hidden />
              {strings.networks.reviewLogTitle} ({log.length})
            </span>
          </summary>
          <ul className="space-y-2 border-t border-pale-sky p-3">
            {log.map((entry) => (
              <li key={entry.id} className="text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <NetworkStatusPill status={entry.fromStatus} />
                  <span aria-hidden>→</span>
                  <NetworkStatusPill status={entry.toStatus} />
                  <span className="text-regal-navy/50">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-regal-navy/80">{entry.reason}</p>
                {entry.signalProfile && (
                  <div className="mt-1">
                    <p className="text-regal-navy/50">
                      {strings.networks.reviewLogSignalProfile}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-regal-navy/70">
                      {Object.entries(entry.signalProfile).map(([key, value]) => (
                        <span key={key}>
                          {humanise(key)} {formatValue(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
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
            error={
              touched && tooShort ? strings.networks.reviewReasonTooShort : null
            }
          />
        </div>
      </Modal>
    </Card>
  );
}
