"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@/types/common";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Server-side pagination control driven by the backend's `meta` block.
 * Rendered only when there is more than one page — a single page needs no chrome.
 */
export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 pt-2",
        className,
      )}
    >
      <p className="text-xs text-regal-navy/60">
        Showing {first.toLocaleString()}–{last.toLocaleString()} of{" "}
        {meta.total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <PageButton
          label="Previous page"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </PageButton>
        <span className="text-sm font-bold tabular-nums text-regal-navy">
          {meta.page} / {meta.totalPages}
        </span>
        <PageButton
          label="Next page"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          <ChevronRight className="size-4" aria-hidden />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-lg border border-pale-sky bg-white text-regal-navy transition-colors hover:border-sea-green hover:text-sea-green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-pale-sky disabled:hover:text-regal-navy"
    >
      {children}
    </button>
  );
}
