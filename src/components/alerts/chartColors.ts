/** Deterministic per-claim line colours drawn from the brand palette. */
const PALETTE = [
  "#229156", // Sea Green
  "#87C5CF", // Frosted Blue
  "#7785B3", // Glaucous
  "#6BB98B", // Mint Leaf
  "#FBD30A", // Gold
  "#1C357F", // Regal Navy
  "#C0453D", // Danger
];

export function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length];
}
