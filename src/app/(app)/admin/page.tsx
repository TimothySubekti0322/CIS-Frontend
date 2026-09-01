"use client";

import { useState } from "react";
import { strings } from "@/lib/constants/strings";
import { Tabs } from "@/components/ui/Tabs";
import { ThresholdForm } from "@/components/admin/ThresholdForm";
import { CitySelectorForm } from "@/components/admin/CitySelectorForm";
import { GenerateClaimButton } from "@/components/admin/GenerateClaimButton";
import { SnapshotScoresButton } from "@/components/admin/SnapshotScoresButton";
import { SettingsTable } from "@/components/admin/SettingsTable";
import {
  ClusterNowButton,
  GenerateSampleContentButton,
  ReconcileButton,
  RescoreButton,
} from "@/components/admin/AiUtilities";
import { DetectorSettingsForm } from "@/components/admin/DetectorSettingsForm";
import { AllowlistManager } from "@/components/admin/AllowlistManager";
import { DetectionGovernance } from "@/components/admin/DetectionGovernance";

type AdminTab = "general" | "detector" | "allowlist" | "runs";

const TABS: { value: AdminTab; label: string }[] = [
  { value: "general", label: strings.admin.tabGeneral },
  { value: "detector", label: strings.admin.tabDetector },
  { value: "allowlist", label: strings.admin.tabAllowlist },
  { value: "runs", label: strings.admin.tabRuns },
];

/**
 * F4 — Admin Settings. No roles exist in this build, so any authenticated user
 * can change these; the safety property is attribution, not access control —
 * every change here records who made it and when.
 *
 * F5 extends this page rather than adding a page of its own (US62–US64): the
 * detector's thresholds, the declared-coordination allowlist, and the
 * governance read-outs are all configuration, and the PRD puts them here.
 */
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("general");

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{strings.admin.pageTitle}</h1>

      <Tabs
        options={TABS}
        value={tab}
        onChange={setTab}
        aria-label={strings.admin.pageTitle}
      />

      {tab === "general" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ThresholdForm />
            {/* US65 — scopes every figure on the Overview page (F6). */}
            <CitySelectorForm />
            <GenerateClaimButton />
            <GenerateSampleContentButton />
            <SnapshotScoresButton />
            <RescoreButton />
            <ClusterNowButton />
            <ReconcileButton />
          </div>
          <SettingsTable />
        </div>
      )}

      {tab === "detector" && <DetectorSettingsForm />}
      {tab === "allowlist" && <AllowlistManager />}
      {tab === "runs" && <DetectionGovernance />}
    </div>
  );
}
