import { Network } from "lucide-react";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * "The detector may not exist yet."
 *
 * The detection maths runs in the AI service; this backend reads its output.
 * When the pipeline has not been deployed its tables are absent and every
 * network route answers `503 SERVICE_UNAVAILABLE` with a display-ready
 * message. That is a state to render, not an error to hide — and the rest of
 * the app, including the claim badge, carries on unaffected.
 */
export function isDetectorUnavailable(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 503;
}

export function DetectorUnavailable({ error }: { error?: unknown }) {
  const message =
    error instanceof ApiError && error.message
      ? error.message
      : strings.networks.unavailableBody;

  return (
    <EmptyState
      icon={<Network className="size-8" aria-hidden />}
      title={strings.networks.unavailableTitle}
      // The backend writes this string for direct display — don't rewrite it.
      description={message}
    />
  );
}
