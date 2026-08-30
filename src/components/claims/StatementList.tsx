import type { Statement } from "@/types/claim";
import { cn, formatDate } from "@/lib/utils";

export interface StatementListProps {
  title: string;
  /** Total count shown at the top (PRD US12). May exceed `statements.length`. */
  total: number;
  statements: Statement[];
  sentiment: "positive" | "negative";
}

export function StatementList({
  title,
  total,
  statements,
  sentiment,
}: StatementListProps) {
  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-h3">{title}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold",
            sentiment === "positive"
              ? "bg-mint-leaf-soft text-sea-green"
              : "bg-danger-soft text-danger",
          )}
        >
          {total.toLocaleString()} total
        </span>
      </div>
      <ul className="mt-3 space-y-3">
        {statements.map((s) => (
          <li key={s.id} className="border-l-2 border-pale-sky pl-3">
            <p className="text-sm text-regal-navy">{s.text}</p>
            <p className="mt-0.5 text-xs text-regal-navy/50">
              {s.author ?? "anonymous"}
              {s.postedAt ? ` · ${formatDate(s.postedAt)}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {statements.length < total && (
        <p className="mt-3 text-xs text-regal-navy/50">
          Showing {statements.length} of {total.toLocaleString()} statements.
        </p>
      )}
    </div>
  );
}
