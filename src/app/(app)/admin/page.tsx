"use client";

import { strings } from "@/lib/constants/strings";
import { ThresholdForm } from "@/components/admin/ThresholdForm";
import { GenerateClaimButton } from "@/components/admin/GenerateClaimButton";

/** F4 — Admin Setting Page (PRD §9). */
export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-h1">{strings.admin.pageTitle}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ThresholdForm />
        <GenerateClaimButton />
      </div>
    </div>
  );
}
