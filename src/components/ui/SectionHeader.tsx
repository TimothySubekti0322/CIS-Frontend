import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** "last fetched" timestamp, top-left of the section. */
  lastFetchedAt?: string;
  /** "See all" link target. */
  seeAllHref?: string;
  seeAllLabel?: string;
  right?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  lastFetchedAt,
  seeAllHref,
  seeAllLabel = strings.common.seeAll,
  right,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div>
        <h2 className="text-h2">{title}</h2>
        {subtitle && (
          <p className="text-sm text-regal-navy/60">{subtitle}</p>
        )}
        {lastFetchedAt && (
          <p className="mt-1 text-meta text-regal-navy/50">
            {strings.common.lastFetched}: {formatDateTime(lastFetchedAt)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {right}
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="inline-flex items-center gap-1 rounded-lg border border-pale-sky bg-white px-3 py-1.5 text-sm font-bold text-sea-green hover:bg-mint-cream"
          >
            {seeAllLabel}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
