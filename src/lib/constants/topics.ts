import type { Topic } from "@/types/common";

/** Seed topic groups (PRD US3). New topics can be created by F2 matchmaking (US42). */
export const TOPICS: Topic[] = [
  { id: "t_congestion", label: "Congestion & Road Pricing" },
  { id: "t_rezoning", label: "Rezoning & Housing Density" },
  { id: "t_emissions", label: "Emissions & Air Quality Rules" },
  { id: "t_flood", label: "Flooding & Drainage" },
  { id: "t_heat", label: "Extreme Heat" },
  { id: "t_wildfire", label: "Wildfire" },
  { id: "t_transit", label: "Public Transit Investment" },
];

export const TOPIC_MAP: Record<string, Topic> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t]),
);
