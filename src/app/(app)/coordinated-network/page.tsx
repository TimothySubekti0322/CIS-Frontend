import type { Metadata } from "next";
import { Network } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: strings.coordinatedNetwork.pageTitle };

/** F5 — Coordinated-Network Detector. Placeholder only (PRD §10, §11). */
export default function CoordinatedNetworkPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-h1">{strings.coordinatedNetwork.pageTitle}</h1>
      <EmptyState
        icon={<Network className="size-8" aria-hidden />}
        title="Coming in a later iteration"
        description={strings.coordinatedNetwork.placeholder}
      />
    </div>
  );
}
