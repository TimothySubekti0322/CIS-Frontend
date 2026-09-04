"use client";

import { use } from "react";
import { NetworkDetailView } from "@/components/networks/NetworkDetailView";

export default function NetworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <NetworkDetailView id={id} />;
}
