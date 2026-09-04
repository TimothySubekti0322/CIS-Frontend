"use client";

import { strings } from "@/lib/constants/strings";
import { NetworkListView } from "@/components/networks/NetworkListView";

/**
 * The question this page answers is not what is being said but whether the
 * apparent public reaction to a policy is actually public. Getting that wrong
 * in the other direction — treating genuine grievance as manufactured — is the
 * single largest harm the platform can cause, which is why nothing here states
 * or implies that any individual account is automated or inauthentic.
 */
export default function CoordinatedNetworkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1">{strings.networks.pageTitle}</h1>
        <p className="mt-1 max-w-3xl text-sm text-regal-navy/60">
          {strings.networks.subtitle}
        </p>
      </div>
      <NetworkListView />
    </div>
  );
}
