"use client";

import { useState, Fragment } from "react";
import { Check, Copy } from "lucide-react";
import type { DebunkBlocks } from "@/types/claim";
import { strings } from "@/lib/constants/strings";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";

export interface CopyableContentBoxProps {
  title: string;
  /** `null` when the AI service has not produced a draft yet. */
  content: string | null;
  emptyLabel: string;
  generatedAt?: string | null;
  /**
   * The Truth Sandwich split into three labelled blocks. Absent for every
   * Synthetic claim (their prebunk is flat) and for Existing claims generated
   * before the split existed — in both cases `content` is rendered as one
   * paragraph, which is the correct rendering, not a degraded one.
   */
  blocks?: DebunkBlocks | null;
}

/** Section labels for the three blocks, in the order the sandwich requires. */
const BLOCK_LABELS: [keyof DebunkBlocks, string][] = [
  ["coreFact", "Core fact"],
  ["nuancedFlag", "The claim, flagged"],
  ["reiteratedFact", "Fact, restated"],
];

/**
 * The AI-generated Debunk/Prebunk draft with a copy action.
 * `activity.available: false` is a normal state — viewing a claim never
 * triggers a new generation, so the box says so rather than showing nothing.
 */
export function CopyableContentBox({
  title,
  content,
  emptyLabel,
  generatedAt,
  blocks,
}: CopyableContentBoxProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copy() {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast(strings.common.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(strings.errors.generic, "error");
    }
  }

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-h3">{title}</h3>
          {generatedAt && (
            <p className="text-xs text-regal-navy/50">
              Generated {formatDateTime(generatedAt)}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={copy} disabled={!content}>
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copied ? strings.common.copied : strings.common.copy}
        </Button>
      </div>
      {content ? (
        <>
          {blocks ? (
            /* Rendered as sections, but the copy action still uses `content`:
               the single paragraph is what gets pasted into a channel. */
            <div className="mt-3 space-y-2">
              {BLOCK_LABELS.map(([key, label]) =>
                blocks[key] ? (
                  <div key={key} className="rounded-lg bg-mint-cream p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-regal-navy/50">
                      {label}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-regal-navy">
                      {renderInline(blocks[key] as string)}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2 rounded-lg bg-mint-cream p-3 text-sm leading-relaxed text-regal-navy">
              {content.split("\n").map((line, i) => (
                <p key={i} className={line.trim() === "" ? "h-1" : undefined}>
                  {renderInline(line)}
                </p>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-regal-navy/50">
            AI-generated draft — treat as a starting point, not a final decision.
          </p>
        </>
      ) : (
        <p className="mt-3 rounded-lg bg-mint-cream p-3 text-sm text-regal-navy/60">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

/** Minimal **bold** / _italic_ inline rendering. */
function renderInline(line: string) {
  return line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
