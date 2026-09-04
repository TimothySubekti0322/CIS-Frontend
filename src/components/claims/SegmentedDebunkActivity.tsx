"use client";

import { Users } from "lucide-react";
import type { ClaimActivity } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { formatDateTime } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";
import { RichText } from "@/components/ui/RichText";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { CopyableContentBox } from "./CopyableContentBox";

/**
 * Renders the Debunk Activity as one tailored, individually-copyable draft
 * per audience segment, most-exposed first.
 *
 * Two rules shape the whole component:
 *
 *  - **The variants are never merged.** Targeting is the entire point, and
 *    one box implying it addresses "everyone" defeats it. Each segment gets
 *    its own card, its own heading and its own copy button.
 *  - **An empty list is a real state, not an error.** Synthetic claims are not
 *    segmented, and an AI service that has not shipped segmentation returns
 *    nothing — in both cases the page falls back to the single draft, which
 *    is a correct rendering rather than a degraded one.
 */
export function SegmentedDebunkActivity({
  activity,
  title,
  fallbackTitle,
}: {
  activity: ClaimActivity | null;
  /** Heading for the segmented view. */
  title: string;
  /** Heading for the single-draft fallback (Debunk or Prebunk). */
  fallbackTitle: string;
}) {
  const segments = activity?.segments ?? [];

  // No segmentation available — render the fallback box unchanged. This is
  // also what a claim with no draft at all hits, and its own empty state
  // applies.
  if (segments.length === 0) {
    return (
      <CopyableContentBox
        title={fallbackTitle}
        content={activity?.available ? activity.content : null}
        emptyLabel={strings.claims.activityUnavailable}
        generatedAt={activity?.generatedAt ?? null}
        blocks={activity?.debunk ?? null}
      />
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-h3">{title}</h3>
          <InfoTooltip
            content={strings.claims.debunkSegmentsHint}
            align="start"
          />
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-regal-navy/60">
          <Users className="size-4" aria-hidden />
          {segments.length} {strings.claims.debunkSegmentCount}
        </span>
      </div>

      {/* A responsive grid so the segment cards fill the column width instead
          of leaving a wide gutter on the right. */}
      <ol
        className={
          segments.length > 1
            ? "grid gap-3 md:grid-cols-2"
            : "space-y-3"
        }
      >
        {segments.map((segment, index) => (
          <li
            key={`${segment.segment}-${index}`}
            /* Its own bordered card, so no two segments can read as one
               continuous message. */
            className="flex flex-col rounded-xl border border-pale-sky bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bold text-regal-navy">{segment.segment}</h4>
                {segment.rationale && (
                  <p className="mt-0.5 text-xs text-regal-navy/60">
                    {segment.rationale}
                  </p>
                )}
              </div>
              {/* Each card copies its own text — never the merged set. */}
              <CopyButton value={segment.content} />
            </div>

            <RichText
              value={segment.content}
              className="mt-3 rounded-lg bg-mint-cream p-3 text-sm leading-relaxed text-regal-navy"
            />

            {segment.generatedAt && (
              <p className="mt-2 text-xs text-regal-navy/50">
                Generated {formatDateTime(segment.generatedAt)} — AI draft,
                review before use.
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
