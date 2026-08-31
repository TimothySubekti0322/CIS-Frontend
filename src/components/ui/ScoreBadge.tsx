import { cn } from "@/lib/utils";
import { scoreBadgeClasses } from "@/lib/scoring";

export interface ScoreBadgeProps {
  score: number;
  /** Show the "/100" suffix (used on detail pages). */
  showScale?: boolean;
  size?: "sm" | "md" | "lg";
  /**
   * What the number is, for the tooltip. Defaults to FinalClaimScore; F5
   * reuses this same badge for the Coordination Score (PRD US46), which is on
   * the same 0–100 scale and uses the same severity banding.
   */
  label?: string;
  className?: string;
}

const SIZES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-base",
};

/** FinalClaimScore badge (0–100) — existing/generic claims only (PRD US10). */
export function ScoreBadge({
  score,
  showScale,
  size = "md",
  label = "FinalClaimScore",
  className,
}: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg font-bold tabular-nums",
        scoreBadgeClasses(score),
        SIZES[size],
        className,
      )}
      title={`${label} ${score} / 100`}
    >
      {score.toFixed(1)}
      {showScale && <span className="ml-0.5 font-normal opacity-70">/100</span>}
    </span>
  );
}
