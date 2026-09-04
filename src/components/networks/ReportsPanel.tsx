"use client";

import { Eye, FileArchive, Lock, ShieldCheck } from "lucide-react";
import type { NetworkDetail, ReportView } from "@/types/network";
import { strings } from "@/lib/constants/strings";
import { useGenerateEvidenceBundle } from "@/lib/hooks/useNetworks";
import { downloadGeneratedReport } from "@/lib/api/networks";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * The foot of the cluster sheet: what can be produced from it, and what has
 * been.
 *
 * The export gate is a fail-closed allowlist evaluated on the server: only a
 * network under review, confirmed, or acted on may be exported. An unreviewed
 * export is an unreviewed accusation. The buttons are disabled from
 * `network.export` and the block states the server's own reason, so the UI
 * never re-derives the rule and drifts from it.
 *
 * Previewing is deliberately *not* gated. Reading what the report would say is
 * how an analyst decides what assessment to record, and locking that behind
 * the assessment would invert the order the work actually happens in.
 */
export function NetworkActions({
  network,
  onPreview,
  onAllowlist,
}: {
  network: NetworkDetail;
  onPreview: () => void;
  onAllowlist: () => void;
}) {
  const { toast } = useToast();
  const bundle = useGenerateEvidenceBundle(network.id);

  const allowed = network.export.allowed;

  async function exportBundle() {
    try {
      const report = await bundle.mutateAsync();
      toast(strings.networks.bundleGenerated);
      // The generate response carries the signed link for the artefact it just
      // created, so the bundle is handed over without a second round trip.
      // Generation is what succeeded above; a failure to hand the bytes over is
      // reported separately, since the artefact exists either way.
      await handOver(report, toast);
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <div className="mt-6 border-t border-pale-sky pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onPreview}>
          <Eye className="size-4" aria-hidden />
          {strings.networks.previewReport}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!allowed}
          loading={bundle.isPending}
          onClick={exportBundle}
        >
          <FileArchive className="size-4" aria-hidden />
          {strings.networks.evidenceBundle}
        </Button>
        <Button size="sm" variant="secondary" onClick={onAllowlist}>
          <ShieldCheck className="size-4" aria-hidden />
          {strings.networks.allowlistNetwork}
        </Button>
      </div>

      {!allowed && (
        <p className="mt-2.5 flex items-start gap-2 text-xs text-regal-navy/60">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {network.export.reason ?? strings.networks.exportBlocked}
            {network.export.allowedStatuses.length > 0 && (
              <>
                {" "}
                Allowed from:{" "}
                {network.export.allowedStatuses
                  .map((s) => strings.networkStatus[s])
                  .join(", ")}
                .
              </>
            )}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * Hand a freshly generated artefact to the browser, reporting a failure to do
 * so on its own rather than as a failure to generate — the artefact exists on
 * the server regardless.
 */
async function handOver(
  report: ReportView,
  toast: (message: string, tone?: "success" | "error") => void,
): Promise<void> {
  try {
    await downloadGeneratedReport(report);
  } catch (err) {
    toast(
      err instanceof Error ? err.message : strings.networks.downloadFailed,
      "error",
    );
  }
}
