"use client";

import { useState } from "react";
import { TIER_ANALYTICS, TIER_OPERATIONS } from "@/types/settings";
import { strings } from "@/lib/constants/strings";
import { Tabs } from "@/components/ui/Tabs";
import { GenerateClaimButton } from "@/components/admin/GenerateClaimButton";
import { SnapshotScoresButton } from "@/components/admin/SnapshotScoresButton";
import { SettingsTable } from "@/components/admin/SettingsTable";
import { SettingHistoryTable } from "@/components/admin/SettingHistoryTable";
import {
  ClusterNowButton,
  GenerateSampleContentButton,
  ReconcileButton,
  RescoreButton,
} from "@/components/admin/AiUtilities";
import { ParameterTierForm } from "@/components/admin/parameters/ParameterTierForm";
import { DetectorSettingsForm } from "@/components/admin/DetectorSettingsForm";
import { AllowlistManager } from "@/components/admin/AllowlistManager";
import { DetectionGovernance } from "@/components/admin/DetectionGovernance";

type AdminTab =
  | "operational"
  | "analytics"
  | "detector"
  | "allowlist"
  | "runs"
  | "utilities";

const TABS: { value: AdminTab; label: string }[] = [
  { value: "operational", label: strings.admin.tabOperational },
  { value: "analytics", label: strings.admin.tabAnalytics },
  { value: "detector", label: strings.admin.tabDetector },
  { value: "allowlist", label: strings.admin.tabAllowlist },
  { value: "runs", label: strings.admin.tabRuns },
  { value: "utilities", label: strings.admin.tabUtilities },
];

/**
 * F4 — Admin Settings. No roles exist in this build, so any authenticated user
 * can change these; the safety property is attribution, not access control —
 * every change here records who made it and when.
 *
 * The dynamic parameters split across the first two tabs by *who decides*,
 * because that is the only split that maps onto a screen: it answers the
 * question a user has in front of a field, "am I allowed to change this?".
 * They are deliberately not interleaved — a field that reorders the whole
 * claim repository should not sit next to one that changes how many rows a
 * leaderboard shows.
 *
 * The F5 detector's ~30 parameters are a third surface with their own
 * endpoints, because two of their constraints are cross-field in ways a flat
 * key/value store cannot express (US62–US64). The PRD puts them on this page
 * rather than a page of their own, so they get a tab, not a route.
 */
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("operational");

  return (
    <div className="space-y-6">
      <h1 className="text-h1">{strings.admin.pageTitle}</h1>

      <Tabs
        options={TABS}
        value={tab}
        onChange={setTab}
        aria-label={strings.admin.pageTitle}
      />

      {tab === "operational" && <ParameterTierForm tier={TIER_OPERATIONS} />}
      {tab === "analytics" && <ParameterTierForm tier={TIER_ANALYTICS} />}
      {tab === "detector" && <DetectorSettingsForm />}
      {tab === "allowlist" && <AllowlistManager />}
      {tab === "runs" && <DetectionGovernance />}

      {tab === "utilities" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GenerateClaimButton />
            <GenerateSampleContentButton />
            <SnapshotScoresButton />
            <RescoreButton />
            <ClusterNowButton />
            <ReconcileButton />
          </div>
          <SettingsTable />
          <SettingHistoryTable />
        </div>
      )}
    </div>
  );
}
