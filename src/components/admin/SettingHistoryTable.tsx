"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { useSettingHistory } from "@/lib/hooks/useSettings";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * `GET /settings/history` — every governed change across the whole F4 surface,
 * not only the detector.
 *
 * No roles exist in this build, so any authenticated user can change any of
 * these values. Attribution is therefore the safety property, not access
 * control: what makes a bad weight recoverable is knowing who set it, to what,
 * and when.
 */
export function SettingHistoryTable() {
  const [page, setPage] = useState(1);
  const { data, isPending } = useSettingHistory({ page });

  return (
    <Card className="space-y-3 p-5">
      <div>
        <h2 className="text-h3">
          <span className="inline-flex items-center gap-1.5">
            <History className="size-4" aria-hidden />
            {strings.parameters.historyTitle}
          </span>
        </h2>
        <p className="mt-1 text-sm text-regal-navy/70">
          {strings.parameters.historyDesc}
        </p>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-regal-navy/60">{strings.parameters.historyEmpty}</p>
      ) : (
        <>
          <div className="scroll-x">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-pale-sky text-left text-xs uppercase text-regal-navy/60">
                  <th className="px-2 py-2 font-bold">{strings.admin.colKey}</th>
                  <th className="px-2 py-2 font-bold">
                    {strings.parameters.historyFrom}
                  </th>
                  <th className="px-2 py-2 font-bold">
                    {strings.parameters.historyTo}
                  </th>
                  <th className="px-2 py-2 font-bold">{strings.admin.colUpdated}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id} className="border-b border-pale-sky/60 last:border-0">
                    <td className="px-2 py-2 font-mono text-xs">{entry.key}</td>
                    <td className="px-2 py-2 tabular-nums text-regal-navy/70">
                      {entry.fromValue ?? strings.common.notAvailable}
                    </td>
                    <td className="px-2 py-2 font-bold tabular-nums">{entry.toValue}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-regal-navy/60">
                      {formatDateTime(entry.createdAt)}
                      {entry.changedBy && (
                        <span className="block">
                          {strings.parameters.historyBy} {entry.changedBy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}
