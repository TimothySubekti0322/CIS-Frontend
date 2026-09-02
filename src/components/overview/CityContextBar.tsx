"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import type { OverviewCity } from "@/types/overview";
import { strings } from "@/lib/constants/strings";
import { formatDateTime } from "@/lib/utils";

/** Names the scope the page's figures were computed under. */
export function CityContextBar({
  city,
  generatedAt,
}: {
  city: OverviewCity | null;
  generatedAt: string | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-bold text-regal-navy">
          <MapPin className="size-4 text-sea-green" aria-hidden />
          {strings.overview.cityLabel}:{" "}
          {city ? (
            <>
              {city.name}
              <span className="font-normal text-regal-navy/60">
                {" "}
                · {city.province}
              </span>
            </>
          ) : (
            <Link href="/admin" className="text-sea-green hover:underline">
              {strings.overview.cityUnset}
            </Link>
          )}
        </span>

        {generatedAt && (
          <span className="text-xs text-regal-navy/50">
            {strings.overview.generatedAt} {formatDateTime(generatedAt)}
          </span>
        )}
      </div>

      {!city && (
        <p className="text-xs text-regal-navy/60">
          {strings.overview.cityUnsetHint}
        </p>
      )}

    </div>
  );
}
