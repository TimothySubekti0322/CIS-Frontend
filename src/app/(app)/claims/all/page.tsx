"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ClaimStatus } from "@/types/claim";
import { STATUS_FILTER_TABS } from "@/lib/constants/statuses";
import { strings } from "@/lib/constants/strings";
import { Tabs } from "@/components/ui/Tabs";
import { ClaimSection } from "@/components/claims/ClaimSection";

function SeeAllContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "synthetic" ? "synthetic" : "generic";
  const initialStatus = (searchParams.get("status") ?? "all") as ClaimStatus | "all";
  const [status, setStatus] = useState<ClaimStatus | "all">(initialStatus);

  return (
    <div className="space-y-6">
      <Link
        href="/claims"
        className="inline-flex items-center gap-1 text-sm font-bold text-sea-green hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {strings.claims.pageTitle}
      </Link>

      <h1 className="text-h1">
        {type === "generic"
          ? strings.claims.seeAllGeneric
          : strings.claims.seeAllSynthetic}
      </h1>

      <Tabs
        options={STATUS_FILTER_TABS}
        value={status}
        onChange={setStatus}
        aria-label="Filter claims by status"
      />

      <ClaimSection variant={type} statusFilter={status} />
    </div>
  );
}

export default function ClaimsSeeAllPage() {
  return (
    <Suspense fallback={<p className="text-sm text-regal-navy/60">{strings.common.loading}</p>}>
      <SeeAllContent />
    </Suspense>
  );
}
