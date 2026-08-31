"use client";

import { use } from "react";
import { NetworkDetailView } from "@/components/networks/NetworkDetailView";

/** F5 — [S4] network detail (PRD §10.7.2, US49/US50). */
export default function NetworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <NetworkDetailView id={id} />;
}
