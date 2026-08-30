"use client";

import { strings } from "@/lib/constants/strings";
import { BackLink } from "@/components/ui/BackLink";
import { PolicyList } from "@/components/policies/PolicyList";

export default function PoliciesSeeAllPage() {
  return (
    <div className="space-y-6">
      <BackLink href="/policies" label={strings.policies.pageTitle} />
      <h1 className="text-h1">{strings.policies.listTitle}</h1>
      <PolicyList />
    </div>
  );
}
