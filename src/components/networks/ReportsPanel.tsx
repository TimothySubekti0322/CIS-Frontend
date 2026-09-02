"use client";

import { useState } from "react";
import { Download, Eye, FileArchive, FileText, Lock, ShieldCheck } from "lucide-react";
import type { NetworkDetail, ReportType, ReportView } from "@/types/network";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import {
  useGenerateEvidenceBundle,
  useGenerateReport,
  useNetworkReports,
} from "@/lib/hooks/useNetworks";
import { downloadGeneratedReport, reportsApi } from "@/lib/api/networks";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";

/**
 * US58–US60 — the foot of the cluster sheet: what can be produced from it, and
 * what has been.
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
  const [open, setOpen] = useState(false);
  const { data: reports } = useNetworkReports(network.id);
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
        <Button size="sm" disabled={!allowed} onClick={() => setOpen(true)}>
          <FileText className="size-4" aria-hidden />
          {strings.networks.generateReport}
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

      {reports && reports.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold tracking-[0.06em] text-regal-navy/60 uppercase">
            {strings.networks.generatedReports}
          </p>
          <ul className="mt-2 space-y-2">
            {reports.map((report) => (
              <li
                key={report.id}
                className="rounded-xl border border-pale-sky px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-regal-navy">
                    {report.fileName}
                  </span>
                  <DownloadReportButton reportId={report.id} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-regal-navy/60">
                  <StatusPill tone="muted">
                    {report.reportType === "platform_referral"
                      ? strings.networks.reportTypePlatform
                      : strings.networks.reportTypeInternal}
                  </StatusPill>
                  <span>{formatDateTime(report.generatedAt)}</span>
                  {report.redactAnalystNames && (
                    <span>{strings.networks.redactAnalysts}</span>
                  )}
                </div>
                {/* Chain of custody: the hash is what lets a recipient prove the
                    file they hold is the file that was generated. */}
                <p className="mt-1 font-mono text-[11px] break-all text-regal-navy/40">
                  {strings.networks.reportChecksum} {report.fileSha256}
                  {report.auditId &&
                    ` · ${strings.networks.reportAudit} ${report.auditId}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <GenerateReportModal
        networkId={network.id}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

/**
 * Hand a freshly generated artefact to the browser, reporting a failure to do
 * so on its own rather than as a failure to generate — the report is on the
 * server and in the list below regardless.
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

/**
 * The download is a two-step action, not a link.
 *
 * `GET /reports/:id/file` sits behind the JWT middleware, and a navigation —
 * `<a href>`, `window.open`, an `<iframe>` — cannot carry an `Authorization`
 * header, which is what produced the `401`. So: one authenticated JSON request
 * for a signed storage link, then a plain navigation to it. The link is
 * resolved on each click and never held in state; it expires within the hour,
 * and a stale one fails as a Supabase error page rather than a readable one.
 */
function DownloadReportButton({ reportId }: { reportId: string }) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      await reportsApi.download(reportId);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : strings.networks.downloadFailed,
        "error",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={pending}
      className="inline-flex items-center gap-1 text-sm font-bold text-sea-green hover:underline disabled:opacity-60 disabled:hover:no-underline"
    >
      <Download className="size-4" aria-hidden />
      {pending ? strings.networks.downloadPreparing : strings.networks.download}
    </button>
  );
}

/**
 * US59's pre-generation modal.
 *
 * The account annex is mandatory in a Platform referral and cannot be toggled
 * off — a referral without the account list is not actionable — so the checkbox
 * is forced on and disabled for that type rather than silently ignored.
 */
function GenerateReportModal({
  networkId,
  open,
  onClose,
}: {
  networkId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const generate = useGenerateReport(networkId);
  const [reportType, setReportType] = useState<ReportType>("platform_referral");
  const [graph, setGraph] = useState(true);
  const [contentClusters, setContentClusters] = useState(true);
  const [accountAnnex, setAccountAnnex] = useState(true);
  const [methodology, setMethodology] = useState(true);
  const [redact, setRedact] = useState(false);

  const annexLocked = reportType === "platform_referral";

  async function submit() {
    try {
      const report = await generate.mutateAsync({
        reportType,
        includeGraph: graph,
        includeContentClusters: contentClusters,
        includeAccountAnnex: annexLocked ? true : accountAnnex,
        includeMethodology: methodology,
        redactAnalystNames: redact,
      });
      toast(strings.networks.reportGenerated);
      onClose();
      await handOver(report, toast);
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={strings.networks.generateReportTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button onClick={submit} loading={generate.isPending}>
            {strings.networks.generateReport}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-regal-navy">
            {strings.networks.reportType}
          </legend>
          <RadioCard
            checked={reportType === "platform_referral"}
            onChange={() => setReportType("platform_referral")}
            label={strings.networks.reportTypePlatform}
            hint={strings.networks.reportTypePlatformHint}
          />
          <RadioCard
            checked={reportType === "internal_briefing"}
            onChange={() => setReportType("internal_briefing")}
            label={strings.networks.reportTypeInternal}
            hint={strings.networks.reportTypeInternalHint}
          />
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-bold text-regal-navy">
            {strings.networks.reportSections}
          </legend>
          <Check
            checked={graph}
            onChange={setGraph}
            label={strings.networks.sectionGraph}
          />
          <Check
            checked={contentClusters}
            onChange={setContentClusters}
            label={strings.networks.sectionContent}
          />
          <Check
            checked={annexLocked ? true : accountAnnex}
            onChange={setAccountAnnex}
            disabled={annexLocked}
            label={strings.networks.sectionAnnex}
          />
          <Check
            checked={methodology}
            onChange={setMethodology}
            label={strings.networks.sectionMethodology}
          />
        </fieldset>

        <div>
          <Check
            checked={redact}
            onChange={setRedact}
            label={strings.networks.redactAnalysts}
          />
          <p className="ml-6 text-xs text-regal-navy/60">
            {strings.networks.redactAnalystsHint}
          </p>
        </div>
      </div>
    </Modal>
  );
}

function RadioCard({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer gap-2 rounded-lg border border-pale-sky p-3 has-checked:border-sea-green has-checked:bg-sea-green-soft">
      <input
        type="radio"
        name="report-type"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-sea-green"
      />
      <span>
        <span className="block text-sm font-bold text-regal-navy">{label}</span>
        <span className="block text-xs text-regal-navy/60">{hint}</span>
      </span>
    </label>
  );
}

function Check({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-regal-navy">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-sea-green disabled:opacity-60"
      />
      {label}
    </label>
  );
}
