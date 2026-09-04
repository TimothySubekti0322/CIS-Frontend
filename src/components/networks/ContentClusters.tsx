"use client";

import { EyeOff } from "lucide-react";
import type { EvidencePost, RepresentativeContent } from "@/types/network";
import { cn, formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * The actual content, so an analyst can verify the duplication claim rather
 * than take it on trust.
 *
 * Rendered from the evidence snapshot and never re-fetched. That is why a post
 * deleted since capture is still here, marked: content disappearing is the
 * normal end of a campaign, not a gap in the record, and a report generated two
 * weeks after a live re-fetch would document an empty set.
 */
export function ContentClusters({
  content,
  isPending,
  embedded,
  maxPosts,
}: {
  content: RepresentativeContent | undefined;
  isPending: boolean;
  /** Rendered as a section of the cluster sheet rather than as its own card. */
  embedded?: boolean;
  /**
   * Cap the flat post list on the cluster sheet. The full duplicate-group
   * analysis — canonical text, every variant, the shared spans — belongs in
   * the report; the sheet only has to show that the duplication is real.
   */
  maxPosts?: number;
}) {
  const Shell = embedded ? PlainShell : CardShell;

  if (isPending) {
    return (
      <Shell>
        <Skeleton className="h-40 w-full" />
      </Shell>
    );
  }

  const hasContent =
    content && (content.groups.length > 0 || content.ungrouped.length > 0);

  if (!hasContent) {
    return (
      <Shell>
        <EmptyState title={strings.networks.contentEmpty} />
      </Shell>
    );
  }

  if (maxPosts) {
    const flat = [
      ...content.groups.flatMap((group) => group.variants),
      ...content.ungrouped,
    ];
    const shown = flat.slice(0, maxPosts);
    return (
      <Shell>
        <ul className="space-y-2">
          {shown.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </ul>
        {flat.length > shown.length && (
          <p className="text-xs text-regal-navy/50">
            {flat.length - shown.length} more captured posts, grouped by shared
            wording, are in the report.
          </p>
        )}
      </Shell>
    );
  }

  return (
    <Shell>
      {!embedded && (
        <div>
          <h2 className="text-h3">{strings.networks.contentTitle}</h2>
          <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
            {content.note ?? strings.networks.contentNote}
          </p>
        </div>
      )}

      {content.groups.map((group, index) => (
        <section
          key={group.groupId}
          className="rounded-lg border border-pale-sky p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-regal-navy">
              {strings.networks.duplicateGroup} {index + 1}
            </h3>
            <StatusPill tone="muted">
              {group.variantCount} {strings.networks.variants}
            </StatusPill>
          </div>

          <p className="mt-2 text-xs font-bold text-regal-navy/60">
            {strings.networks.canonicalText}
          </p>
          <p className="mt-0.5 rounded bg-mint-cream px-3 py-2 text-sm text-regal-navy">
            {group.canonicalText}
          </p>

          <ul className="mt-3 space-y-2">
            {group.variants.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </ul>
        </section>
      ))}

      {content.ungrouped.length > 0 && (
        <section className="rounded-lg border border-dashed border-pale-sky p-3">
          <h3 className="text-sm font-bold text-regal-navy">
            {strings.networks.ungrouped}
          </h3>
          <ul className="mt-2 space-y-2">
            {content.ungrouped.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return <Card className="space-y-4">{children}</Card>;
}

function PlainShell({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

/**
 * One snapshotted post. The timestamp is shown to the second — the whole
 * synchrony argument is about sub-minute alignment, and a minute-level
 * timestamp hides exactly the evidence being claimed.
 */
export function PostRow({ post }: { post: EvidencePost }) {
  return (
    <li className="rounded-lg border border-pale-sky bg-white px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-regal-navy">{post.handle}</span>
        <span className="flex items-center gap-2 text-regal-navy/50">
          <span className="tabular-nums">{formatSeconds(post.postedAt)}</span>
          {post.platform && <span>{post.platform}</span>}
          {!post.stillPublic && (
            <span className="inline-flex items-center gap-1 text-glaucous">
              <EyeOff className="size-3" aria-hidden />
              {post.availability || "No longer publicly available"}
            </span>
          )}
        </span>
      </div>
      <p className="mt-1 text-sm text-regal-navy">
        <HighlightedText
          text={post.text}
          start={post.sharedSpanStart}
          end={post.sharedSpanEnd}
        />
      </p>
      <p className="mt-1 text-[11px] text-regal-navy/40">
        {strings.networks.capturedAt} {formatDateTime(post.capturedAt)}
      </p>
    </li>
  );
}

/**
 * The span this variant shares with the group's canonical text. Offsets are
 * computed server-side so the highlight is byte-identical in the UI and the
 * PDF.
 */
function HighlightedText({
  text,
  start,
  end,
}: {
  text: string;
  start: number | null;
  end: number | null;
}) {
  if (
    start === null ||
    end === null ||
    start < 0 ||
    end > text.length ||
    start >= end
  ) {
    return <>{text}</>;
  }
  return (
    <>
      {text.slice(0, start)}
      <mark className={cn("rounded bg-gold-soft px-0.5 text-regal-navy")}>
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

function formatSeconds(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
