"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { Button } from "@/components/ui/Button";
import { PolicyList } from "@/components/policies/PolicyList";
import { AddPolicyModal } from "@/components/policies/AddPolicyModal";

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

      <div>
        <h2 className="text-h2">{strings.policies.listTitle}</h2>
        <p className="mt-1 max-w-3xl text-sm text-regal-navy/60">
          {strings.policies.listBody}
        </p>
      </div>

      <PolicyList limit={10} paginated />

      <AddPolicyModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
