import type { ClaimSummary } from "@/types/claim";
import { cn } from "@/lib/utils";
import { ClaimCard } from "./ClaimCard";

export interface ClaimGridProps {
  claims: ClaimSummary[];
  /**
   * `auto` — full responsive grid 4 → 3 → 2 → 1 (PRD §5.2), used on F1.
   * `compact` — for narrow containers (e.g. the two columns on the F2 detail page).
   */
  density?: "auto" | "compact";
}

export function ClaimGrid({ claims, density = "auto" }: ClaimGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        density === "auto"
          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2",
      )}
    >
      {claims.map((claim) => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
    </div>
  );
}
