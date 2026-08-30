"use client";

import { use } from "react";
import { ClaimDetailView } from "@/components/claims/ClaimDetailView";

/** F1 — claim detail. Existing claims land here; the view renders by type. */
export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ClaimDetailView id={id} />;
}
