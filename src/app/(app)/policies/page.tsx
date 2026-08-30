"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PolicyList } from "@/components/policies/PolicyList";
import { AddPolicyModal } from "@/components/policies/AddPolicyModal";

/** F2 — Public Policy Bank (PRD §7). */
export default function PoliciesPage() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h1">{strings.policies.pageTitle}</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {strings.policies.addPolicy}
        </Button>
      </div>

      <SectionHeader
        title={strings.policies.listTitle}
        seeAllHref="/policies/all"
      />

      <PolicyList limit={12} />

      <AddPolicyModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
