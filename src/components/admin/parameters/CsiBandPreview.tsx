"use client";

import { strings } from "@/lib/constants/strings";
import { clamp } from "@/lib/utils";

export interface CsiBandPreviewProps {
  /** Red → amber cut point. */
  risky: number | null;
  /** Amber → green cut point. */
  watch: number | null;
}

/**
 * The three CSI gauge bands as the operator drags their cut points.
 *
 * Two numbers in two inputs are hard to picture as a scale, and the failure
 * they can produce — overlapping bands, where a score falls in two colours at
 * once — is invisible in the numbers and obvious in the strip. The server
 * rejects the overlap either way; this is so it is seen while editing.
 */
export function CsiBandPreview({ risky, watch }: CsiBandPreviewProps) {
  if (risky === null || watch === null) return null;

  const overlapping = risky >= watch;
  const lo = clamp(risky, 0, 100);
  const hi = clamp(watch, 0, 100);

  const bands = overlapping
    ? []
    : [
        { label: strings.overview.csiBandRisky, width: lo, className: "bg-danger" },
        { label: strings.overview.csiBandWatch, width: hi - lo, className: "bg-gold" },
        {
          label: strings.overview.csiBandHealthy,
          width: 100 - hi,
          className: "bg-sea-green",
        },
      ];

  return (
    <div className="mt-2">
      <p className="text-xs font-bold text-regal-navy/70">
        {strings.parameters.bandPreview}
      </p>
      {overlapping ? (
        <p className="mt-1 text-xs font-bold text-danger">
          {strings.parameters.bandOverlap}
        </p>
      ) : (
        <>
          <div
            className="mt-1 flex h-6 w-full overflow-hidden rounded-md border border-pale-sky"
            role="img"
            aria-label={`${strings.overview.csiBandRisky} 0–${lo}, ${strings.overview.csiBandWatch} ${lo}–${hi}, ${strings.overview.csiBandHealthy} ${hi}–100`}
          >
            {bands.map((band) => (
              <div
                key={band.label}
                className={band.className}
                style={{ width: `${band.width}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-regal-navy/60">
            <span>0</span>
            <span>
              {strings.overview.csiBandRisky} &lt; {lo}
            </span>
            <span>
              {strings.overview.csiBandWatch} &lt; {hi}
            </span>
            <span>100</span>
          </div>
        </>
      )}
    </div>
  );
}
