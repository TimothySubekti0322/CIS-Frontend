"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import type { OverviewTopic } from "@/types/overview";
import { strings } from "@/lib/constants/strings";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

/**
 * The sequential shade scale, lightest to darkest. Colour encodes the same
 * weight the area does — it is reinforcement, not a second variable, so
 * nothing is conveyed by hue alone.
 *
 * **Each shade is paired with the text colour that is legible on it, measured
 * rather than guessed.** The pairing lives here, beside the fill, because the
 * two are a single decision: changing a fill without rechecking its text
 * colour is what produced the unreadable labels this table replaced.
 *
 * Measured contrast against the paired text (WCAG 2.1, sRGB), all clearing the
 * 4.5:1 minimum for text below 18.66px:
 *
 * | fill            | text | ratio   |
 * |-----------------|------|---------|
 * | glaucous-soft   | navy |  9.55:1 |
 * | pale-sky        | navy |  7.65:1 |
 * | frosted-blue    | navy |  5.85:1 |
 * | glaucous-deep   | white|  6.33:1 |
 * | regal-navy      | white| 11.26:1 |
 *
 * Plain Glaucous (#7785B3) is deliberately **not** in this ramp. It sits in the
 * luminance band where neither navy (3.10:1) nor white (3.63:1) reaches 4.5:1,
 * so no label placed on it can be made readable — `--color-glaucous-deep`
 * stands in for it. Anything added here must sit outside L ∈ (0.183, 0.370).
 */
const SHADES: { fill: string; text: string }[] = [
  { fill: "var(--color-glaucous-soft)", text: "var(--color-regal-navy)" },
  { fill: "var(--color-pale-sky)", text: "var(--color-regal-navy)" },
  { fill: "var(--color-frosted-blue)", text: "var(--color-regal-navy)" },
  { fill: "var(--color-glaucous-deep)", text: "#FFFFFF" },
  { fill: "var(--color-regal-navy)", text: "#FFFFFF" },
];

function shadeFor(boxSize: number) {
  const index = Math.floor((Math.max(0, Math.min(100, boxSize)) / 100) * SHADES.length);
  return SHADES[Math.min(index, SHADES.length - 1)];
}

interface TreemapDatum {
  name: string;
  /** Recharts sizes rectangles from this. */
  size: number;
  topic: OverviewTopic;
}

/** 
 * O2 — the hot-topics treemap (US69). One rectangle per Existing-claim topic;
 * Synthetic-only topics are excluded by the backend so predictions cannot
 * dominate the map.
 *
 * `boxSize` is used directly as the area input and never recomputed here: the
 * backend publishes it on every box precisely so the map is explainable from
 * the response. It is normalised against the largest topic in the current set,
 * which makes it answer "which topic is hottest right now" — the cost, stated
 * plainly in the subtitle, is that box sizes are not comparable between loads.
 */
export function TopicTreemap({
  topics,
  onSelect,
}: {
  topics: OverviewTopic[];
  onSelect: (topicId: string) => void;
}) {
  // A zero-weight box would be invisible and unclickable, so every topic gets
  // a floor. The floor is small enough not to distort the ranking.
  const data: TreemapDatum[] = topics.map((topic) => ({
    name: topic.topic.name,
    size: Math.max(topic.boxSize, 1),
    topic,
  }));

  return (
    <section className="rounded-xl border border-pale-sky bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-h3">{strings.overview.topicsTitle}</h2>
          <InfoTooltip content={strings.overview.topicsSubtitle} align="start" />
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title={strings.overview.topicsEmpty}
          className="mt-4 border-0 bg-transparent"
        />
      ) : (
        <div className="mt-3 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              // The backend already returns largest-first; re-sorting here
              // would be a second ordering able to disagree with the API.
              isAnimationActive={false}
              stroke="#FFFFFF"
              content={<TopicBox onSelect={onSelect} />}
            >
              <Tooltip content={<TopicTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/**
 * Recharts passes each node's geometry as loose props, so the shape is
 * narrowed here rather than trusted. Labels are dropped on boxes too small to
 * hold them: clipped text is worse than a tooltip.
 */
interface BoxProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  topic?: OverviewTopic;
  onSelect: (topicId: string) => void;
}

function TopicBox({ x = 0, y = 0, width = 0, height = 0, topic, onSelect }: BoxProps) {
  if (!topic || width <= 0 || height <= 0) return null;

  const shade = shadeFor(topic.boxSize);
  const showLabel = width > 74 && height > 40;
  const showDetail = width > 110 && height > 66;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${topic.topic.name} — ${topic.aboveThresholdCount} ${strings.overview.topicsAbove}`}
      className="cursor-pointer outline-none"
      onClick={() => onSelect(topic.topic.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(topic.topic.id);
        }
      }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={shade.fill}
        stroke="#FFFFFF"
        strokeWidth={2}
        className="transition-opacity hover:opacity-80"
      />
      {showLabel && (
        <text x={x + 10} y={y + 22} fill={shade.text} fontSize={12} fontWeight={700}>
          {truncate(topic.topic.name, Math.floor(width / 7.2))}
        </text>
      )}
      {/* The detail line is de-emphasised by weight and size, never by opacity.
          Fading it to 60/75% was what made it unreadable: on the mid shades
          that lands at 2.7–3.4:1. The most a fade can be pushed and still
          clear 4.5:1 on every shade is 0.86 alpha, which is too small a change
          to be worth having — so both lines are solid. */}
      {showDetail && (
        <text x={x + 10} y={y + 40} fill={shade.text} fontSize={11} fontWeight={400}>
          {topic.aboveThresholdCount}/{topic.claimCount} {strings.overview.topicsAbove}
        </text>
      )}
    </g>
  );
}

function truncate(value: string, max: number): string {
  if (max < 4) return "";
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

/** Recharts' tooltip payload, narrowed to the one datum this treemap emits. */
function TopicTooltip({ payload }: { payload?: { payload?: TreemapDatum }[] }) {
  const topic = payload?.[0]?.payload?.topic;
  if (!topic) return null;
  return (
    <div className="rounded-lg border border-pale-sky bg-white p-3 text-xs shadow-lg">
      <p className="font-bold text-regal-navy">{topic.topic.name}</p>
      <p className="mt-1 text-regal-navy/70">
        {topic.claimCount} {strings.overview.topicsClaims} ·{" "}
        {topic.aboveThresholdCount} {strings.overview.topicsAbove}
      </p>
      <p className="text-regal-navy/70">
        {strings.overview.topicsAverage}:{" "}
        {topic.averageScore === null
          ? strings.common.notAvailable
          : topic.averageScore.toFixed(1)}
      </p>
      {/* `/70` is the lightest navy that still clears 4.5:1 on white (4.72:1);
          the `/50` this replaced sat at 2.79:1. */}
      <p className="text-regal-navy/70">
        {strings.overview.topicsWeight}: {topic.boxSize.toFixed(1)}
      </p>
    </div>
  );
}
