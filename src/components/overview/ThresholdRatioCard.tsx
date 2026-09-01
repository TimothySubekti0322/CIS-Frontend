"use client";

import type { ThresholdRatio } from "@/types/overview";
import { strings } from "@/lib/constants/strings";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { EmptyState } from "@/components/ui/EmptyState";

/* Donut geometry — a plain circle stroked with a dash offset, so there is no
   chart library in the render path for what is a two-segment split. */
const SIZE = 160;
const RADIUS = 62;
const STROKE = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * O1a — the above/below-threshold split (US67).
 *
 * The population is every Existing/Generic claim, whatever its review status,
 * and an unscored claim counts as below. Both rules are the backend's, and the
 * subtitle states them: a leadership figure whose denominator is unclear is a
 * figure that gets argued with rather than acted on.
 *
 * Worth knowing why the status filter is absent: excluding Action Taken claims
 * would make this number improve every time someone closed a ticket, while the
 * claim was still circulating and still scoring above threshold.
 */
export function ThresholdRatioCard({ ratio }: { ratio: ThresholdRatio }) {
  const total = ratio.total;
  const abovePortion = total > 0 ? ratio.above / total : 0;

  return (
    <section className="flex flex-col rounded-xl border border-pale-sky bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-h3">{strings.overview.ratioTitle}</h2>
            <InfoTooltip content={strings.overview.ratioSubtitle} align="start" />
          </div>
          {ratio.threshold !== null && (
            <p className="mt-0.5 text-xs text-regal-navy/60">
              {strings.overview.ratioThreshold}: {ratio.threshold}
            </p>
          )}
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          title={strings.overview.ratioEmpty}
          className="mt-4 flex-1 border-0 bg-transparent"
        />
      ) : (
        <div className="mt-2 flex flex-1 flex-col items-center gap-4 sm:flex-row sm:justify-around">
          <Donut portion={abovePortion} percent={ratio.abovePercent} />

          <dl className="w-full max-w-[200px] space-y-2 text-sm">
            <Legend
              swatch="bg-danger"
              label={strings.overview.ratioAbove}
              value={ratio.above}
            />
            <Legend
              swatch="bg-mint-leaf"
              label={strings.overview.ratioBelow}
              value={ratio.below}
            />
            <div className="border-t border-pale-sky pt-2 text-xs text-regal-navy/60">
              {/* above + below always equals total — there is no third bucket. */}
              {total.toLocaleString("en-GB")} {strings.overview.ratioTotal}
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}

function Donut({ portion, percent }: { portion: number; percent: number }) {
  const filled = portion * CIRCUMFERENCE;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-40 w-40 shrink-0 -rotate-90"
      role="img"
      aria-label={`${percent.toFixed(1)}% ${strings.overview.ratioAbove}`}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--color-mint-leaf)"
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--color-danger)"
        strokeWidth={STROKE}
        strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
      />
      <text
        x={SIZE / 2}
        y={SIZE / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 fill-regal-navy text-[26px] font-bold tabular-nums"
        style={{ transformOrigin: "center" }}
      >
        {percent.toFixed(0)}%
      </text>
    </svg>
  );
}

function Legend({
  swatch,
  label,
  value,
}: {
  swatch: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-regal-navy/70">
        <span className={`size-2.5 shrink-0 rounded-full ${swatch}`} aria-hidden />
        {label}
      </dt>
      <dd className="font-bold tabular-nums text-regal-navy">
        {value.toLocaleString("en-GB")}
      </dd>
    </div>
  );
}
