"use client";

import { useState } from "react";
import {
  Boxes,
  DatabaseZap,
  Eraser,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import {
  useClusterNow,
  useGenerateSampleContent,
  useReconcile,
  useRescoreClaims,
} from "@/lib/hooks/useAdminTools";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

/**
 * The AI-backed F4 utilities.
 *
 * All four degrade with a message rather than a crash: with `AI_SERVICE_URL`
 * unset the backend answers `503` with a string written for direct display, so
 * these hand that message straight to the toast instead of rewriting it.
 */

function UtilityCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-glaucous bg-glaucous-soft/40 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-h3">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-regal-navy/70">{description}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-glaucous">
        {strings.admin.generateClaimUtility}
      </p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function message(err: unknown): string {
  return err instanceof ApiError ? err.message : strings.errors.generic;
}

/**
 * A claim's score moves with wall-clock time even when nothing new is
 * ingested: NPR drifts as opposing posts age out of the rolling window. Without
 * a rescore the F3 trend chart plots the same number every hour.
 */
export function RescoreButton() {
  const { mutateAsync, isPending } = useRescoreClaims();
  const { toast } = useToast();

  return (
    <UtilityCard
      icon={<RefreshCw className="size-4 text-glaucous" aria-hidden />}
      title={strings.admin.rescoreTitle}
      description={strings.admin.rescoreDesc}
    >
      <Button
        variant="utility"
        loading={isPending}
        onClick={async () => {
          try {
            const count = await mutateAsync();
            toast(`${count} ${strings.admin.rescoreDone}`);
          } catch (err) {
            toast(message(err), "error");
          }
        }}
      >
        {strings.admin.rescoreAction}
      </Button>
    </UtilityCard>
  );
}

/**
 * Until a live crawler exists, this is the only way content enters the system
 * through the product — and therefore the only route to new Existing claims
 * outside policy matchmaking.
 */
export function GenerateSampleContentButton() {
  const { mutateAsync, isPending } = useGenerateSampleContent();
  const { toast } = useToast();
  const [count, setCount] = useState("10");
  const [hint, setHint] = useState("");
  const [autoCluster, setAutoCluster] = useState(true);

  return (
    <UtilityCard
      icon={<Sparkles className="size-4 text-glaucous" aria-hidden />}
      title={strings.admin.sampleTitle}
      description={strings.admin.sampleDesc}
    >
      <div className="space-y-3">
        <Field
          label={strings.admin.sampleCount}
          type="number"
          min={1}
          max={50}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
        <Field
          label={strings.admin.sampleTopicHint}
          value={hint}
          maxLength={255}
          placeholder={strings.admin.sampleTopicHintPlaceholder}
          onChange={(e) => setHint(e.target.value)}
        />
        <label className="flex items-start gap-2 text-sm text-regal-navy">
          <input
            type="checkbox"
            checked={autoCluster}
            onChange={(e) => setAutoCluster(e.target.checked)}
            className="mt-0.5 size-4 accent-sea-green"
          />
          <span>
            {strings.admin.sampleAutoCluster}
            <span className="block text-xs text-regal-navy/60">
              {strings.admin.sampleAutoClusterHint}
            </span>
          </span>
        </label>
        <Button
          variant="utility"
          loading={isPending}
          onClick={async () => {
            try {
              const result = await mutateAsync({
                count: Number(count) || undefined,
                topicHint: hint.trim() || undefined,
                autoCluster,
              });
              toast(
                // The clustering counts are null when auto-clustering was off:
                // nothing was clustered, which is not "0 claims created".
                result.claimsCreated === null
                  ? `${result.generatedCount} ${strings.admin.sampleDoneNoCluster}`
                  : `${result.generatedCount} ${strings.admin.sampleDone} ${result.claimsCreated} created, ${result.claimsUpdated} updated.`,
              );
            } catch (err) {
              toast(message(err), "error");
            }
          }}
        >
          {strings.admin.sampleAction}
        </Button>
      </div>
    </UtilityCard>
  );
}

/** Normally unnecessary — ingestion triggers clustering on its own. */
export function ClusterNowButton() {
  const { mutateAsync, isPending } = useClusterNow();
  const { toast } = useToast();

  return (
    <UtilityCard
      icon={<Boxes className="size-4 text-glaucous" aria-hidden />}
      title={strings.admin.clusterTitle}
      description={strings.admin.clusterDesc}
    >
      <Button
        variant="utility"
        loading={isPending}
        onClick={async () => {
          try {
            const result = await mutateAsync();
            toast(
              `${result.claimsCreated} created, ${result.claimsUpdated} updated, ${result.contentItemsClustered} items clustered.`,
            );
          } catch (err) {
            toast(message(err), "error");
          }
        }}
      >
        {strings.admin.clusterAction}
      </Button>
    </UtilityCard>
  );
}

/**
 * Reconciliation is not reversible, so the dry run is the primary action and
 * the real sweep sits behind a second, explicit confirmation. The `409`
 * empty-database guard's message is surfaced verbatim — it names the most
 * likely cause (the backend pointed at the wrong database) and passing `force`
 * past it would erase every review decision and watchlist entry.
 */
export function ReconcileButton() {
  const { mutateAsync, isPending } = useReconcile();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);

  async function run(dryRun: boolean) {
    try {
      const result = await mutateAsync({ dryRun });
      const summary =
        result.message ??
        `${result.orphanedReviews} reviews, ${result.orphanedAlerts} alerts, ${result.orphanedScoreSnapshots} snapshots, ${result.policiesUnlinked} policies.`;
      if (dryRun) setPreview(summary);
      else {
        setPreview(null);
        toast(summary);
      }
    } catch (err) {
      // Includes the 409 guard, whose message is written for display.
      toast(message(err), "error");
    }
  }

  return (
    <UtilityCard
      icon={<Eraser className="size-4 text-glaucous" aria-hidden />}
      title={strings.admin.reconcileTitle}
      description={strings.admin.reconcileDesc}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="utility" loading={isPending} onClick={() => run(true)}>
            <DatabaseZap className="size-4" aria-hidden />
            {strings.admin.reconcileDryRun}
          </Button>
          {preview && (
            <Button variant="danger" loading={isPending} onClick={() => run(false)}>
              {strings.admin.reconcileApply}
            </Button>
          )}
        </div>
        {preview && (
          <p className="rounded-lg border border-pale-sky bg-white px-3 py-2 text-xs text-regal-navy">
            {preview}
            <span className="mt-1 block text-regal-navy/60">
              {strings.admin.reconcileIrreversible}
            </span>
          </p>
        )}
      </div>
    </UtilityCard>
  );
}
