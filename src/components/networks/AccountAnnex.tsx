"use client";

import { useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import type { AccountSort } from "@/types/network";
import { cn, formatDate } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useNetworkAccounts } from "@/lib/hooks/useNetworks";
import { networksApi } from "@/lib/api/networks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const COLUMNS: { key: AccountSort | null; label: string; numeric?: boolean }[] = [
  { key: "handle", label: strings.networks.colHandle },
  { key: null, label: strings.networks.colPlatform },
  { key: "created_at_platform", label: strings.networks.colCreated },
  { key: "posts_in_cluster", label: strings.networks.colPosts, numeric: true },
  { key: "duplication_rate", label: strings.networks.colDuplication, numeric: true },
  { key: "median_interpost", label: strings.networks.colInterpost, numeric: true },
  { key: "circadian_coverage", label: strings.networks.colCircadian, numeric: true },
  { key: "centrality", label: strings.networks.colCentrality, numeric: true },
  { key: null, label: strings.networks.colRole },
];

/**
 * US55's account annex.
 *
 * Every column is a measured behaviour or a graph position. None is a verdict:
 * PRD 10.9.1 rule 3 forbids the system labelling an individual account
 * automated, so "circadian coverage 1.00" is reported and "no sleep cycle,
 * therefore a bot" is not. The judgement belongs to the person reading it.
 */
export function AccountAnnex({
  networkId,
  onSelectAccount,
  embedded,
}: {
  networkId: string;
  onSelectAccount: (accountId: string) => void;
  /** Rendered as a section of the cluster sheet rather than as its own card. */
  embedded?: boolean;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AccountSort>("centrality");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const debounced = useDebouncedValue(search, 300);

  const { data, isPending, isError } = useNetworkAccounts(networkId, {
    q: debounced || undefined,
    sort,
    page,
    limit: 25,
  });

  /**
   * The CSV export is written to the audit log before the bytes are sent, so
   * this is a recorded action rather than a read — the toast says so.
   */
  async function exportCsv() {
    setExporting(true);
    try {
      const { blob, fileName } = await networksApi.accountsCsv(networkId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName ?? `network-${networkId}-accounts.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast(strings.networks.exportCsvDone);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : strings.errors.generic,
        "error",
      );
    } finally {
      setExporting(false);
    }
  }

  const Shell = embedded ? PlainShell : CardShell;

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {embedded ? (
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={strings.networks.annexSearch}
            className="max-w-xs flex-1"
          />
        ) : (
          <div>
            <h2 className="text-h3">{strings.networks.annexTitle}</h2>
            <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
              {strings.networks.annexNote}
            </p>
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={exportCsv}
          loading={exporting}
        >
          <Download className="size-4" aria-hidden />
          {strings.networks.exportCsv}
        </Button>
      </div>

      {!embedded && (
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={strings.networks.annexSearch}
            className="max-w-xs flex-1"
          />
        </div>
      )}

      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : isError || !data || data.items.length === 0 ? (
        <EmptyState title={strings.networks.annexEmpty} />
      ) : (
        <>
          <div
            className={cn(
              "scroll-x",
              embedded
                ? "max-h-80 overflow-y-auto rounded-xl border border-pale-sky"
                : "-mx-4 px-4",
            )}
          >
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-pale-sky text-left">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.label}
                      scope="col"
                      className={cn(
                        "whitespace-nowrap px-2 py-2 text-xs font-bold text-regal-navy/70",
                        col.numeric && "text-right",
                        // The list scrolls inside its own box on the cluster
                        // sheet, so the header has to travel with it.
                        embedded && "sticky top-0 z-1 bg-white",
                      )}
                    >
                      {col.key ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSort(col.key as AccountSort);
                            setPage(1);
                          }}
                          className={cn(
                            "cursor-pointer transition-colors hover:text-sea-green",
                            sort === col.key && "text-sea-green",
                          )}
                          aria-pressed={sort === col.key}
                        >
                          {col.label}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr
                    key={row.accountId}
                    onClick={() => onSelectAccount(row.accountId)}
                    className={cn(
                      "cursor-pointer border-b border-pale-sky/60 transition-colors hover:bg-mint-cream",
                      row.role !== "member" && "text-regal-navy/60",
                    )}
                  >
                    <td className="px-2 py-2 font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        {row.handle}
                        {row.allowlisted && (
                          <ShieldCheck
                            className="size-3.5 text-sea-green"
                            aria-label={strings.networks.graphAllowlisted}
                          />
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2">{row.platform}</td>
                    <td className="whitespace-nowrap px-2 py-2">
                      {formatDate(row.createdAtPlatform)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.postsInCluster.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.duplicationRate.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatInterval(row.medianInterpostSeconds)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.circadianCoverage.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {row.degreeCentrality.toFixed(3)}
                    </td>
                    <td className="px-2 py-2">
                      {row.role === "member"
                        ? strings.networks.roleMember
                        : strings.networks.roleComparison}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </>
      )}
    </Shell>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return <Card className="space-y-3">{children}</Card>;
}

function PlainShell({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

/** Null when a single-post account has no interval to measure. */
function formatInterval(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}
