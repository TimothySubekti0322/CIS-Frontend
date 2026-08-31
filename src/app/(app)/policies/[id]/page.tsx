"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Pencil, RefreshCw, Trash2, Upload } from "lucide-react";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { isMockMode } from "@/lib/config";
import { formatDate, formatMonthYear } from "@/lib/utils";
import {
  useDeletePolicy,
  useDownloadPolicyFile,
  usePolicy,
  usePolicyProcessing,
  useRematchPolicy,
} from "@/lib/hooks/usePolicies";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ClaimGrid } from "@/components/claims/ClaimGrid";
import { PolicyStatusPill } from "@/components/policies/PolicyStatusPill";
import { ProcessingBadge } from "@/components/policies/ProcessingBadge";
import { EditPolicyModal } from "@/components/policies/EditPolicyModal";
import { ReplaceFileModal } from "@/components/policies/ReplaceFileModal";

/**
 * F2 — policy detail. Reuses the F1 claim cards verbatim.
 *
 * Both claim lists stay empty until `aiPolicyId` arrives: correlations do not
 * exist before the AI service's matchmaking callback supplies it, no matter
 * how much the AI service has written on its own side.
 */
export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { data: policy, isPending, isError } = usePolicy(id);

  const [editing, setEditing] = useState(false);
  const [replacingFile, setReplacingFile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const download = useDownloadPolicyFile();
  const rematch = useRematchPolicy();
  const remove = useDeletePolicy();

  usePolicyProcessing(id, Boolean(policy?.isProcessing));

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-sea-green" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="space-y-4">
        <BackLink href="/policies" label={strings.policies.pageTitle} />
        <EmptyState title={strings.errors.notFound} />
      </div>
    );
  }

  async function onDownload() {
    if (!policy) return;
    if (isMockMode) {
      toast(strings.policies.downloadMockUnavailable, "error");
      return;
    }
    try {
      await download.mutateAsync({ id: policy.id, fileName: policy.fileName });
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : strings.policies.downloadFailed,
        "error",
      );
    }
  }

  async function onRematch() {
    try {
      await rematch.mutateAsync(id);
      toast(strings.policies.rematchQueued);
    } catch (err) {
      // 409 = already running, 503 = no AI service configured.
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  async function onDelete() {
    try {
      await remove.mutateAsync(id);
      toast(strings.policies.deleted);
      router.replace("/policies");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackLink href="/policies" label={strings.policies.pageTitle} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ProcessingBadge status={policy.processingStatus} />
            <PolicyStatusPill status={policy.status} />
            <StatusPill tone="muted">
              {policy.monthYear ?? formatMonthYear(policy.rolledOutDate)}
            </StatusPill>
            {policy.createdAt && (
              <span className="text-xs text-regal-navy/50">
                {strings.claims.created}: {formatDate(policy.createdAt)}
              </span>
            )}
            {/* The value the F2 list sort is computed on — shown so the
                ordering on the previous page is explainable. */}
            {policy.lastClaimActivityAt && (
              <span className="text-xs text-regal-navy/50">
                {strings.policies.lastActivity}:{" "}
                {formatDate(policy.lastClaimActivityAt)}
              </span>
            )}
          </div>
          <h1 className="text-h1">{policy.name}</h1>
          {policy.description && (
            <p className="max-w-3xl text-sm text-regal-navy/70">
              {policy.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {policy.fileName && (
            <Button
              variant="secondary"
              onClick={onDownload}
              loading={download.isPending}
            >
              <Download className="size-4" aria-hidden />
              {strings.common.download}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden />
            {strings.policies.edit}
          </Button>
          <Button variant="secondary" onClick={() => setReplacingFile(true)}>
            <Upload className="size-4" aria-hidden />
            {strings.policies.replaceFile}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" aria-hidden />
            {strings.policies.delete}
          </Button>
        </div>
      </div>

      {policy.isProcessing && (
        <div className="rounded-xl border border-gold bg-gold-soft p-4 text-sm text-regal-navy">
          {strings.policies.processingHint}
        </div>
      )}

      {policy.processingStatus === "failed" && (
        <div className="flex flex-col gap-3 rounded-xl border border-danger bg-danger-soft p-4 text-sm text-regal-navy sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">{strings.policies.failedHint}</p>
            {policy.processingError && (
              <p className="mt-1 text-xs text-regal-navy/70">
                {policy.processingError}
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={onRematch} loading={rematch.isPending}>
            <RefreshCw className="size-4" aria-hidden />
            {strings.policies.rematch}
          </Button>
        </div>
      )}

      {policy.processingStatus === "skipped" && (
        <div className="rounded-xl border border-pale-sky bg-white p-4 text-sm text-regal-navy/70">
          {strings.policies.processingSkippedHint}
        </div>
      )}

      {/* Two claim lists — side by side on desktop, stacked below tablet. */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-h2">{strings.policies.exposureGeneric}</h2>
          {policy.existingClaims.length === 0 ? (
            <EmptyState title={strings.policies.noGeneric} />
          ) : (
            <ClaimGrid claims={policy.existingClaims} density="compact" />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-h2">{strings.policies.exposureSynthetic}</h2>
          {policy.nonExistingClaims.length === 0 ? (
            <EmptyState title={strings.policies.noSynthetic} />
          ) : (
            <ClaimGrid claims={policy.nonExistingClaims} density="compact" />
          )}
        </section>
      </div>

      <EditPolicyModal
        policy={policy}
        open={editing}
        onClose={() => setEditing(false)}
      />

      <ReplaceFileModal
        policy={policy}
        open={replacingFile}
        onClose={() => setReplacingFile(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={strings.policies.deleteTitle}
        body={strings.policies.deleteBody}
        confirmLabel={strings.policies.delete}
        destructive
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
