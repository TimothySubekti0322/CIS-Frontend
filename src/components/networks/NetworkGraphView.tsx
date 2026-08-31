"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { GraphEdge, GraphNode, NetworkGraph } from "@/types/network";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";

export interface NetworkGraphViewProps {
  graph: NetworkGraph | undefined;
  isPending: boolean;
  onSelectAccount: (accountId: string) => void;
}

const VIEW = 640;
const PADDING = 24;

/**
 * US51's force-directed graph.
 *
 * Coordinates come from the stored ForceAtlas2 layout and are only rescaled to
 * the viewport — the layout itself is never recomputed here, because PRD 10.8
 * requires this figure and the PDF to render identically, and a browser-side
 * simulation would produce a different picture on every load.
 *
 * The comparison nodes are the point of the figure: genuine unclustered
 * accounts active on the same claim, drawn in a distinct style so an analyst
 * can see that the cluster is unusual relative to the ordinary conversation
 * rather than taking that on trust.
 */
export function NetworkGraphView({
  graph,
  isPending,
  onSelectAccount,
}: NetworkGraphViewProps) {
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);

  const placed = useMemo(() => placeNodes(graph?.nodes ?? []), [graph?.nodes]);

  if (isPending) {
    return (
      <Card className="space-y-3">
        <h2 className="text-h3">{strings.networks.graphTitle}</h2>
        <Skeleton className="h-80 w-full" />
      </Card>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <Card className="space-y-3">
        <h2 className="text-h3">{strings.networks.graphTitle}</h2>
        <EmptyState title={strings.networks.graphEmpty} />
      </Card>
    );
  }

  const maxWeight = Math.max(...graph.edges.map((e) => e.weight), 1);
  const maxCentrality = Math.max(
    ...graph.nodes.map((n) => n.degreeCentrality),
    0.0001,
  );

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-h3">{strings.networks.graphTitle}</h2>
          <p className="mt-1 max-w-xl text-xs text-regal-navy/60">
            {strings.networks.graphNote}
          </p>
        </div>
        {graph.reduced && (
          <StatusPill tone="warn">
            <span title={graph.reductionNote ?? undefined}>
              {strings.networks.graphReduced}
            </span>
          </StatusPill>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-pale-sky bg-mint-cream">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="mx-auto block h-auto w-full max-w-[640px]"
          role="img"
          aria-label={`Coordination graph: ${graph.memberCount} members, ${graph.comparisonCount} comparison accounts`}
        >
          {graph.edges.map((edge, i) => {
            const a = placed.get(edge.source);
            const b = placed.get(edge.target);
            if (!a || !b) return null;
            return (
              <line
                key={`${edge.source}-${edge.target}-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--color-glaucous)"
                strokeOpacity={0.45}
                strokeWidth={0.6 + (edge.weight / maxWeight) * 3}
                onMouseEnter={() => setHoveredEdge(edge)}
                onMouseLeave={() => setHoveredEdge(null)}
                className="cursor-pointer"
              />
            );
          })}

          {graph.nodes.map((node) => {
            const pos = placed.get(node.accountId);
            if (!pos) return null;
            const isMember = node.role === "member";
            // Size by centrality, per US51.
            const r = 4 + (node.degreeCentrality / maxCentrality) * 9;
            return (
              <circle
                key={node.accountId}
                cx={pos.x}
                cy={pos.y}
                r={isMember ? r : 3.5}
                fill={
                  node.allowlisted
                    ? "var(--color-mint-leaf)"
                    : isMember
                      ? "var(--color-danger)"
                      : "var(--color-frosted-blue)"
                }
                fillOpacity={isMember ? 0.85 : 0.5}
                stroke="white"
                strokeWidth={1}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(node)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectAccount(node.accountId)}
              >
                <title>
                  {node.handle} · {node.platform} · {node.postsInCluster} posts
                </title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-regal-navy/60">
        <Legend color="var(--color-danger)" label={strings.networks.graphMember} />
        <Legend
          color="var(--color-frosted-blue)"
          label={strings.networks.graphComparison}
        />
        <Legend
          color="var(--color-mint-leaf)"
          label={strings.networks.graphAllowlisted}
          icon={<ShieldCheck className="size-3" aria-hidden />}
        />
        <span>
          {graph.memberCount} / {graph.totalNodeCount} nodes shown
        </span>
      </div>

      {hovered && <NodeSummary node={hovered} />}
      {hoveredEdge && <EdgeSummary edge={hoveredEdge} />}
    </Card>
  );
}

function Legend({
  color,
  label,
  icon,
}: {
  color: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block size-2.5 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {icon}
      {label}
    </span>
  );
}

/** Hovering a node shows the account summary; clicking opens the drawer. */
function NodeSummary({ node }: { node: GraphNode }) {
  return (
    <div className="rounded-lg border border-pale-sky bg-white px-3 py-2 text-xs">
      <span className="font-bold text-regal-navy">{node.handle}</span>
      <span className="ml-2 text-regal-navy/60">
        {node.platform} · {node.postsInCluster} posts · centrality{" "}
        {node.degreeCentrality.toFixed(3)}
      </span>
      {node.allowlisted && (
        <span className="ml-2 text-sea-green">
          {strings.networks.graphAllowlisted}
        </span>
      )}
    </div>
  );
}

/**
 * Hovering an edge shows its per-signal decomposition — which is what makes a
 * membership explainable rather than asserted (PRD 10.5.3).
 */
function EdgeSummary({ edge }: { edge: GraphEdge }) {
  const parts: [string, number][] = [
    ["Time", edge.signals.time],
    ["Text", edge.signals.text],
    ["Amplification", edge.signals.amp],
    ["Metadata", edge.signals.meta],
    ["Structure", edge.signals.struct],
  ];
  return (
    <div className="rounded-lg border border-pale-sky bg-white px-3 py-2 text-xs">
      <span className="font-bold text-regal-navy">
        {strings.networks.signalDecomposition}
      </span>
      <span className="ml-2 text-regal-navy/60">
        {strings.networks.edgeWeight} {edge.weight.toFixed(2)} ·{" "}
        {edge.signalCount} families
      </span>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-regal-navy/70">
        {parts.map(([label, value]) => (
          <span key={label} className={cn(value === 0 && "opacity-50")}>
            {label} {value.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Rescale stored coordinates into the viewBox, preserving the layout exactly.
 * Nodes with no stored position (which the backend only omits when the layout
 * was not captured) fall back to a deterministic ring so they remain clickable
 * instead of stacking at the origin.
 */
function placeNodes(
  nodes: GraphNode[],
): Map<string, { x: number; y: number }> {
  const placed = new Map<string, { x: number; y: number }>();
  const withCoords = nodes.filter((n) => n.x !== null && n.y !== null);

  if (withCoords.length === 0) {
    nodes.forEach((node, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      placed.set(node.accountId, {
        x: VIEW / 2 + Math.cos(angle) * (VIEW / 2 - PADDING),
        y: VIEW / 2 + Math.sin(angle) * (VIEW / 2 - PADDING),
      });
    });
    return placed;
  }

  const xs = withCoords.map((n) => n.x as number);
  const ys = withCoords.map((n) => n.y as number);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = (VIEW - PADDING * 2) / Math.max(spanX, spanY);
  // Centre the smaller axis so the aspect ratio of the stored layout survives.
  const offsetX = (VIEW - spanX * scale) / 2;
  const offsetY = (VIEW - spanY * scale) / 2;

  nodes.forEach((node, i) => {
    if (node.x === null || node.y === null) {
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      placed.set(node.accountId, {
        x: VIEW / 2 + Math.cos(angle) * (VIEW / 2 - PADDING),
        y: VIEW / 2 + Math.sin(angle) * (VIEW / 2 - PADDING),
      });
      return;
    }
    placed.set(node.accountId, {
      x: (node.x - minX) * scale + offsetX,
      y: (node.y - minY) * scale + offsetY,
    });
  });

  return placed;
}
