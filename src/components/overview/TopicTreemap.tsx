"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Chart,
  LinearScale,
  Tooltip,
  type ActiveElement,
  type ChartEvent,
  type TooltipItem,
} from "chart.js";
import {
  TreemapController,
  TreemapElement,
  type TreemapDataPoint,
} from "chartjs-chart-treemap";
import type { OverviewTopic } from "@/types/overview";
import { strings } from "@/lib/constants/strings";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

/* The squarified layout, hit-testing, label fitting and tooltip all come from
   chart.js + chartjs-chart-treemap rather than being hand-rolled on top of a
   generic charting primitive. Registration is module-scoped so it happens once
   per bundle, not once per mount.

   Each piece is registered by hand because this file imports `chart.js` and
   not `chart.js/auto` — the auto entry pulls in every controller and scale the
   app never uses. `LinearScale` is not optional despite the treemap having no
   visible axes: the controller's own defaults declare a hidden linear x and y,
   and it squarifies into their pixel extents. Without it, constructing the
   chart throws `"linear" is not a registered scale`. */
Chart.register(TreemapController, TreemapElement, LinearScale, Tooltip);

/**
 * The sequential shade scale, lightest to darkest — PRD §5.1 palette tokens,
 * read from CSS at draw time so the chart cannot drift from the rest of the
 * page. Colour encodes the same weight the area does; it is reinforcement, not
 * a second variable, so nothing is conveyed by hue alone.
 *
 * **Each shade is paired with the text colour that is legible on it, measured
 * rather than guessed.** The pairing lives here, beside the fill, because the
 * two are a single decision: changing a fill without rechecking its text
 * colour is what produced the unreadable labels this replaced.
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
 * stands in for it. Anything added here must sit outside L in (0.183, 0.370).
 *
 * The hex literals repeat what `globals.css` declares and are used only as the
 * fallback for the first paint, when there is no computed style to read.
 */
const SHADES: { token: string; fallback: string; text: "navy" | "white" }[] = [
  { token: "--color-glaucous-soft", fallback: "#eaecf4", text: "navy" },
  { token: "--color-pale-sky", fallback: "#c0d9e2", text: "navy" },
  { token: "--color-frosted-blue", fallback: "#87c5cf", text: "navy" },
  { token: "--color-glaucous-deep", fallback: "#4a5d99", text: "white" },
  { token: "--color-regal-navy", fallback: "#1c357f", text: "white" },
];

/** The palette tokens the chart needs beyond the ramp itself. */
const TOKENS = {
  navy: { token: "--color-regal-navy", fallback: "#1c357f" },
  border: { token: "--color-pale-sky", fallback: "#c0d9e2" },
  accent: { token: "--color-sea-green", fallback: "#229156" },
  font: {
    token: "--font-sans",
    fallback: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
  },
} as const;

/** Canvas cannot resolve `var(...)`, so the token is read off `:root` first. */
function cssToken({ token, fallback }: { token: string; fallback: string }): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return value || fallback;
}

/** `#rrggbb` to `rgba(...)`, for the one place a palette colour is softened. */
function withAlpha(hex: string, alpha: number): string {
  const match = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const n = parseInt(match[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function shadeIndex(boxSize: number) {
  const clamped = Math.max(0, Math.min(100, boxSize));
  return Math.min(Math.floor((clamped / 100) * SHADES.length), SHADES.length - 1);
}

/**
 * One tree node. Declared as a `type` rather than an `interface` so it keeps
 * the implicit index signature the plugin's `tree` option requires.
 */
type TopicNode = {
  /** The area input the plugin squarifies. */
  size: number;
  topic: OverviewTopic;
};

/**
 * The plugin hands the laid-out box back on every scriptable callback and
 * tooltip callback as `raw`, carrying the source node on `_data`. The
 * parameter is typed structurally because the plugin's own context type is not
 * part of its published exports.
 */
function nodeOf(ctx: { raw?: unknown } | undefined): TopicNode | undefined {
  const raw = ctx?.raw as TreemapDataPoint | undefined;
  return raw?._data as TopicNode | undefined;
}

function truncate(value: string, max: number): string {
  if (max < 4) return "";
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The chart is rebuilt when the data changes, but `onSelect` is only ever a
  // click handler — reading it through a ref keeps a new callback identity
  // from tearing down and rebuilding the canvas.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // A zero-weight box would be invisible and unclickable, so every topic gets
  // a floor. The floor is small enough not to distort the ranking.
  const tree: TopicNode[] = useMemo(
    () => topics.map((topic) => ({ size: Math.max(topic.boxSize, 1), topic })),
    [topics],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tree.length === 0) return;

    const shades = SHADES.map((shade) => ({
      fill: cssToken(shade),
      text: shade.text === "white" ? "#FFFFFF" : cssToken(TOKENS.navy),
    }));
    const navy = cssToken(TOKENS.navy);
    const family = cssToken(TOKENS.font);

    const shadeFor = (ctx: { raw?: unknown }) => {
      const node = nodeOf(ctx);
      return shades[node ? shadeIndex(node.topic.boxSize) : 0];
    };

    const chart = new Chart<"treemap", TopicNode[]>(canvas, {
      type: "treemap",
      data: {
        datasets: [
          {
            // The backend already returns largest-first; re-sorting here would
            // be a second ordering able to disagree with the API.
            tree,
            // The controller derives the points from `tree`; chart.js still
            // requires the field to exist on the dataset.
            data: [],
            key: "size",
            spacing: 0,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            backgroundColor: (ctx) => shadeFor(ctx).fill,
            // Hover moves the border, never the fill. Lightening or fading a
            // box would take it off the measured pairings above and make its
            // own label unreadable for exactly as long as the pointer is on
            // it — the one moment the box is being read.
            hoverBackgroundColor: (ctx) => shadeFor(ctx).fill,
            hoverBorderColor: cssToken(TOKENS.accent),
            hoverBorderWidth: 3,
            labels: {
              display: true,
              align: "left",
              position: "top",
              padding: 10,
              // Whatever still does not fit is dropped rather than clipped: a
              // tooltip beats half a word.
              overflow: "hidden",
              color: (ctx) => shadeFor(ctx).text,
              // The detail line is de-emphasised by weight and size, never by
              // opacity. Fading it to 60/75% was what made it unreadable: on
              // the mid shades that lands at 2.7–3.4:1. The most a fade can be
              // pushed and still clear 4.5:1 on every shade is 0.86 alpha,
              // which is too small a change to be worth having.
              font: [
                { size: 12, weight: "bold", family, lineHeight: 1.5 },
                { size: 11, weight: "normal", family, lineHeight: 1.5 },
              ],
              formatter: (ctx) => {
                const node = nodeOf(ctx);
                const raw = ctx.raw as TreemapDataPoint | undefined;
                if (!node || !raw) return "";
                const name = truncate(
                  node.topic.topic.name,
                  Math.floor((raw.w - 20) / 7.2),
                );
                if (!name) return "";
                const lines = [name];
                if (raw.w > 110 && raw.h > 66) {
                  lines.push(
                    `${node.topic.aboveThresholdCount}/${node.topic.claimCount} ${strings.overview.topicsAbove}`,
                  );
                }
                return lines;
              },
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          // Every box is the same series, so a legend would only repeat the
          // section heading.
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: "#FFFFFF",
            borderColor: cssToken(TOKENS.border),
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            titleColor: navy,
            titleFont: { size: 12, weight: "bold", family },
            // `/70` is the lightest navy that still clears 4.5:1 on the white
            // tooltip (4.72:1); the `/50` this replaced sat at 2.79:1.
            bodyColor: withAlpha(navy, 0.7),
            bodyFont: { size: 12, weight: "normal", family },
            callbacks: {
              title: (items: TooltipItem<"treemap">[]) =>
                nodeOf(items[0])?.topic.topic.name ?? "",
              label: (item: TooltipItem<"treemap">) => {
                const topic = nodeOf(item)?.topic;
                if (!topic) return "";
                return [
                  `${topic.claimCount} ${strings.overview.topicsClaims} · ${topic.aboveThresholdCount} ${strings.overview.topicsAbove}`,
                  `${strings.overview.topicsAverage}: ${
                    topic.averageScore === null
                      ? strings.common.notAvailable
                      : topic.averageScore.toFixed(1)
                  }`,
                  `${strings.overview.topicsWeight}: ${topic.boxSize.toFixed(1)}`,
                ];
              },
            },
          },
        },
        onHover: (_event: ChartEvent, elements: ActiveElement[]) => {
          canvas.style.cursor = elements.length > 0 ? "pointer" : "default";
        },
        onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
          const index = elements[0]?.index;
          if (index === undefined) return;
          // Read the node back off the laid-out point rather than indexing
          // `tree`, so a future grouped tree cannot silently select the wrong
          // topic.
          const point = chart.data.datasets[0]?.data[index] as
            | TreemapDataPoint
            | undefined;
          const node = nodeOf({ raw: point });
          if (node) onSelectRef.current(node.topic.topic.id);
        },
      },
    });

    return () => chart.destroy();
  }, [tree]);

  return (
    <section className="rounded-xl border border-pale-sky bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-h3">{strings.overview.topicsTitle}</h2>
          <InfoTooltip content={strings.overview.topicsSubtitle} align="start" />
        </div>
      </div>

      {tree.length === 0 ? (
        <EmptyState
          title={strings.overview.topicsEmpty}
          className="mt-4 border-0 bg-transparent"
        />
      ) : (
        <>
          <div className="relative mt-3 h-80 w-full">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={strings.overview.topicsTitle}
            />
          </div>
          {/* A canvas has no focusable children, so the boxes are mirrored as
              real buttons. They stay out of the visual flow until focused and
              are shown in place once they are — a keyboard user has to be able
              to see where they have landed. */}
          <ul className="relative">
            {tree.map(({ topic }) => (
              <li key={topic.topic.id}>
                <button
                  type="button"
                  onClick={() => onSelectRef.current(topic.topic.id)}
                  className="sr-only rounded-md border border-pale-sky bg-white px-3 py-1.5 text-sm text-regal-navy shadow-lg focus:not-sr-only focus:absolute focus:left-0 focus:top-1"
                >
                  {topic.topic.name} — {topic.aboveThresholdCount}/
                  {topic.claimCount} {strings.overview.topicsAbove}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
