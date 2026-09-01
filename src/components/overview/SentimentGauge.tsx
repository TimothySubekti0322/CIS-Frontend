"use client";

import { useState } from "react";
import { ChevronDown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { SentimentBand, SentimentIndex } from "@/types/overview";
import { strings } from "@/lib/constants/strings";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

/** Band colours, from the PRD §5.1 palette plus the one reserved warm red. */
const BAND_STYLE: Record<SentimentBand, { arc: string; text: string; label: string }> = {
  risky: { arc: "var(--color-danger)", text: "text-danger", label: strings.overview.csiBandRisky },
  watch: { arc: "var(--color-gold)", text: "text-regal-navy", label: strings.overview.csiBandWatch },
  healthy: { arc: "var(--color-sea-green)", text: "text-sea-green", label: strings.overview.csiBandHealthy },
};

/* Arc geometry. A 240° sweep opening at the bottom reads as a dial without
   needing a needle, and leaves room for the number inside it. */
const SWEEP = 240;
const START_ANGLE = 150;
const RADIUS = 80;
const STROKE = 16;
const SIZE = 220;
const CENTRE = SIZE / 2;
const ARC_LENGTH = (SWEEP / 360) * 2 * Math.PI * RADIUS;

function polar(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTRE + RADIUS * Math.cos(rad),
    y: CENTRE + RADIUS * Math.sin(rad),
  };
}

/** The full 240° track, drawn once and reused as the value arc's path. */
const ARC_PATH = (() => {
  const start = polar(START_ANGLE);
  const end = polar(START_ANGLE + SWEEP);
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${SWEEP > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
})();

/**
 * O1b — the Climate Sentiment Index gauge (US68, PRD 6.6.5).
 *
 * This is the page's visual centrepiece, and §5.6 allows F6 to be bolder than
 * the rest of the product for exactly this reason. Three things it must get
 * right:
 *
 *  - **Only `status: "ok"` gets a dial.** `insufficient_data` and `unavailable`
 *    mean different things and both have `score: null`; the served `reason`
 *    is shown in the dial's place rather than a zero, because a quiet week must
 *    not read as a calm one.
 *  - **The band comes from the backend.** Re-deriving cut points here would put
 *    a second definition of "healthy" in the product.
 *  - **`momentum` can be `null` even when `ok`.** Then the arrow is hidden —
 *    never rendered as a flat zero, which would assert stability the data does
 *    not support.
 */
export function SentimentGauge({ sentiment }: { sentiment: SentimentIndex }) {
  const [expanded, setExpanded] = useState(false);
  const ok = sentiment.status === "ok" && sentiment.score !== null;
  const band = sentiment.band ?? "watch";
  const style = BAND_STYLE[band];

  return (
    <section className="flex flex-col rounded-xl border border-pale-sky bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-h3">{strings.overview.csiTitle}</h2>
            <InfoTooltip content={strings.overview.csiExplain} align="start" />
          </div>
          <p className="mt-0.5 text-xs text-regal-navy/60">
            {strings.overview.csiSubtitle}
          </p>
        </div>
      </div>

      {ok ? (
        <>
          <div className="mt-2 flex flex-col items-center">
            <Dial score={sentiment.score as number} color={style.arc} />
            <p className={cn("-mt-6 text-sm font-bold", style.text)}>{style.label}</p>
            <Momentum sentiment={sentiment} />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="mt-4 inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-pale-sky px-3 py-1.5 text-xs font-bold text-regal-navy transition-colors hover:border-sea-green hover:text-sea-green"
          >
            {expanded
              ? strings.overview.csiBreakdownHide
              : strings.overview.csiBreakdown}
            <ChevronDown
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
              aria-hidden
            />
          </button>

          {/* US68's click-through: the two halves as separate bars, so the
              headline number is never shown without its inputs. */}
          {expanded && <Breakdown sentiment={sentiment} />}
        </>
      ) : (
        <Unavailable sentiment={sentiment} />
      )}
    </section>
  );
}

function Dial({ score, color }: { score: number; color: string }) {
  const filled = (Math.max(0, Math.min(100, score)) / 100) * ARC_LENGTH;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-44 w-full max-w-[220px]"
      role="img"
      aria-label={`${strings.overview.csiTitle}: ${score.toFixed(1)} out of 100`}
    >
      <path
        d={ARC_PATH}
        fill="none"
        stroke="var(--color-pale-sky)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <path
        d={ARC_PATH}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${ARC_LENGTH}`}
      />
      <text
        x={CENTRE}
        y={CENTRE + 8}
        textAnchor="middle"
        className="fill-regal-navy text-[40px] font-bold tabular-nums"
      >
        {score.toFixed(0)}
      </text>
      <text
        x={CENTRE}
        y={CENTRE + 30}
        textAnchor="middle"
        className="fill-regal-navy/50 text-[12px]"
      >
        / 100
      </text>
    </svg>
  );
}

/** Direction of change against the 24h-lagged window. Hidden when unknown. */
function Momentum({ sentiment }: { sentiment: SentimentIndex }) {
  if (sentiment.momentum === null) return null;
  const direction = sentiment.momentumDirection ?? "flat";
  const Icon =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  return (
    <p
      className={cn(
        "mt-2 inline-flex items-center gap-1 text-xs font-bold",
        direction === "up" && "text-sea-green",
        direction === "down" && "text-danger",
        direction === "flat" && "text-regal-navy/50",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {sentiment.momentum > 0 ? "+" : ""}
      {sentiment.momentum.toFixed(1)}
      <span className="font-normal text-regal-navy/50">
        {strings.overview.csiMomentum}
      </span>
    </p>
  );
}

function Breakdown({ sentiment }: { sentiment: SentimentIndex }) {
  const volume = sentiment.volume;
  return (
    <div className="mt-3 space-y-3 rounded-lg bg-mint-cream p-3">
      <Bar
        label={strings.overview.csiBcs}
        hint={strings.overview.csiBcsHint}
        value={sentiment.bcsNormalized}
        tone="good"
      />
      {/* Not inverted here: the bar shows RiskLoad as measured, and the hint
          says why the index subtracts it. Showing "100 − RiskLoad" would put a
          number on screen that appears in no formula the reader can check. */}
      <Bar
        label={strings.overview.csiRiskLoad}
        hint={strings.overview.csiRiskLoadHint}
        value={sentiment.riskLoad}
        tone="bad"
      />

      {volume && (
        <dl className="grid grid-cols-2 gap-2 border-t border-pale-sky pt-3 text-xs sm:grid-cols-4">
          <VolumeStat label={strings.overview.csiVolume} value={volume.total} />
          <VolumeStat
            label={strings.overview.csiVolumePositive}
            value={volume.positive}
          />
          <VolumeStat
            label={strings.overview.csiVolumeNegative}
            value={volume.negative}
          />
          <VolumeStat
            label={strings.overview.csiVolumeNeutral}
            value={volume.neutral}
          />
        </dl>
      )}

      <p className="text-xs text-regal-navy/50">
        {sentiment.windowDays !== null && (
          <>
            {strings.overview.csiWindow}: {sentiment.windowDays}d
          </>
        )}
        {sentiment.riskThreshold !== null && (
          <>
            {" · "}
            {strings.overview.csiRiskCutoff}: {sentiment.riskThreshold}
          </>
        )}
      </p>
    </div>
  );
}

function Bar({
  label,
  hint,
  value,
  tone,
}: {
  label: string;
  hint: string;
  value: number | null;
  tone: "good" | "bad";
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-bold text-regal-navy">
          {label}
          <InfoTooltip content={hint} label={label} align="start" />
        </span>
        <span className="text-xs font-bold tabular-nums text-regal-navy">
          {value === null ? strings.common.notAvailable : value.toFixed(1)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "good" ? "bg-mint-leaf" : "bg-danger",
          )}
          style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
        />
      </div>
    </div>
  );
}

function VolumeStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-regal-navy/60">{label}</dt>
      <dd className="font-bold tabular-nums text-regal-navy">
        {value.toLocaleString("en-GB")}
      </dd>
    </div>
  );
}

/**
 * The non-`ok` states. `reason` is served display-ready, so it is preferred
 * over the local copy — the backend knows which of the two conditions actually
 * applied and by how much.
 */
function Unavailable({ sentiment }: { sentiment: SentimentIndex }) {
  const insufficient = sentiment.status === "insufficient_data";
  return (
    <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-pale-sky bg-mint-cream/60 px-4 py-10 text-center">
      <p className="font-bold text-regal-navy">
        {insufficient
          ? strings.overview.csiInsufficient
          : strings.overview.csiUnavailable}
      </p>
      <p className="mt-1 max-w-sm text-xs text-regal-navy/60">
        {sentiment.reason ??
          (insufficient
            ? strings.overview.csiInsufficientFallback
            : strings.overview.csiUnavailableFallback)}
      </p>
      {insufficient && sentiment.volume && sentiment.minimumVolume !== null && (
        <p className="mt-2 text-xs tabular-nums text-regal-navy/50">
          {sentiment.volume.total.toLocaleString("en-GB")} /{" "}
          {sentiment.minimumVolume.toLocaleString("en-GB")}
        </p>
      )}
    </div>
  );
}
