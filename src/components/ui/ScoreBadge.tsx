import { cn } from "@/lib/utils";
import { scoreBadgeClasses } from "@/lib/scoring";

export interface ScoreBadgeProps {
  score: number;
  /** Show the "/100" suffix (used on detail pages). */
  showScale?: boolean;
  size?: "sm" | "md" | "lg";
  /**
   * What the number is, for the tooltip. Defaults to FinalClaimScore; also
   * reused for the Coordination Score, which is on the same 0–100 scale and
   * uses the same severity banding.
   */
  label?: string;
  /**
   * A human has overridden the Harm sub-scores behind this number, so the
   * ranking reflects a correction rather than the AI's own classification.
   * Shown as a small dot, and named in the tooltip so it is not conveyed by a
   * coloured mark alone.
   */
  edited?: boolean;
  editedLabel?: string;
  className?: string;
}

const SIZES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-base",
};

/** FinalClaimScore badge (0–100) — existing/generic claims only. */
export function ScoreBadge({
  score,
  showScale,
  size = "md",
  label = "FinalClaimScore",
  edited,
  editedLabel,
  className,
}: ScoreBadgeProps) {
  const title = `${label} ${score} / 100${editedLabel && edited ? ` — ${editedLabel}` : ""}`;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg font-bold tabular-nums",
        scoreBadgeClasses(score),
        SIZES[size],
        className,
      )}
      title={title}
    >
      {score.toFixed(1)}
      {showScale && <span className="ml-0.5 font-normal opacity-70">/100</span>}
      {edited && (
        <span
          aria-hidden
          className="ml-1 size-1.5 shrink-0 rounded-full bg-regal-navy/60"
        />
      )}
      {edited && editedLabel && <span className="sr-only"> — {editedLabel}</span>}
    </span>
  );
}
