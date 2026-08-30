"use client";

import { strings } from "@/lib/constants/strings";
import { ThresholdForm } from "@/components/admin/ThresholdForm";
import { GenerateClaimButton } from "@/components/admin/GenerateClaimButton";
import { SnapshotScoresButton } from "@/components/admin/SnapshotScoresButton";
import { SettingsTable } from "@/components/admin/SettingsTable";

/**
 * F4 — Admin Settings. No roles exist in this build, so any authenticated
 * user can change these.
 */
export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-h1">{strings.admin.pageTitle}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ThresholdForm />
        <GenerateClaimButton />
        <SnapshotScoresButton />
      </div>
      <SettingsTable />
    </div>
  );
}
