"use client";

import { useState } from "react";
import { Download, FileArchive, FileText, Lock } from "lucide-react";
import type { NetworkDetail, ReportType } from "@/types/network";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import {
  useGenerateEvidenceBundle,
  useGenerateReport,
  useNetworkReports,
} from "@/lib/hooks/useNetworks";
import { reportFileUrl } from "@/lib/api/networks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";

/**
 * US58–US60 — report generation and the evidence bundle.
 *
 * The export gate is a fail-closed allowlist evaluated on the server: only a
 * network under review, confirmed, or acted on may be exported. An unreviewed
 * export is an unreviewed accusation. The button is disabled from
 * `network.export`, so the UI refuses for the server's stated reason rather
 * than re-deriving the rule and drifting from it.
 */
export function ReportsPanel({ network }: { network: NetworkDetail }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { data: reports, isPending } = useNetworkReports(network.id);
  const bundle = useGenerateEvidenceBundle(network.id);

  const allowed = network.export.allowed;

  async function exportBundle() {
    try {
      await bundle.mutateAsync();
      toast(strings.networks.bundleGenerated);
    } catch (err) {
      toast(err instanceof Error ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-h3">{strings.networks.reportsTitle}</h2>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {!allowed && (
        <p className="flex items-start gap-2 rounded-lg border border-pale-sky bg-mint-cream px-3 py-2 text-xs text-regal-navy/70">
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

      <p className="text-xs text-regal-navy/60">
        {strings.networks.evidenceBundleHint}
      </p>

      {isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : !reports || reports.length === 0 ? (
        <p className="text-sm text-regal-navy/60">{strings.networks.noReports}</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-lg border border-pale-sky px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-regal-navy">
                  {report.fileName}
                </span>
                <a
                  href={reportFileUrl(report.id)}
                  className="inline-flex items-center gap-1 text-sm font-bold text-sea-green hover:underline"
                >
                  <Download className="size-4" aria-hidden />
                  {strings.networks.download}
                </a>
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
              <p className="mt-1 break-all font-mono text-[11px] text-regal-navy/40">
                {strings.networks.reportChecksum} {report.fileSha256}
                {report.auditId && ` · ${strings.networks.reportAudit} ${report.auditId}`}
              </p>
            </li>
          ))}
        </ul>
      )}

      <GenerateReportModal
        networkId={network.id}
        open={open}
        onClose={() => setOpen(false)}
      />
    </Card>
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
      await generate.mutateAsync({
        reportType,
        includeGraph: graph,
        includeContentClusters: contentClusters,
        includeAccountAnnex: annexLocked ? true : accountAnnex,
        includeMethodology: methodology,
        redactAnalystNames: redact,
      });
      toast(strings.networks.reportGenerated);
      onClose();
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
