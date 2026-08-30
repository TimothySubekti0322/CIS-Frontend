"use client";

import { use } from "react";
import { ClaimDetailView } from "@/components/claims/ClaimDetailView";

/**
 * F1 — Non-Existing/Synthetic claim detail. The backend serves both claim
 * types from `GET /claims/:id`, so this route shares the same view.
 */
export default function PredictedClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ClaimDetailView id={id} />;
}
