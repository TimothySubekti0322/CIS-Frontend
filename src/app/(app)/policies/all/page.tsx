"use client";

import { strings } from "@/lib/constants/strings";
import { BackLink } from "@/components/ui/BackLink";
import { PolicyList } from "@/components/policies/PolicyList";

/** The "See all" list — server-paginated at 20 rows a page. */
export default function PoliciesSeeAllPage() {
  return (
    <div className="space-y-6">
      <BackLink href="/policies" label={strings.policies.pageTitle} />
      <h1 className="text-h1">{strings.policies.listTitle}</h1>
      <PolicyList limit={20} paginated />
    </div>
  );
}
