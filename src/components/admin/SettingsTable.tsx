"use client";

import { strings } from "@/lib/constants/strings";
import { formatDateTime } from "@/lib/utils";
import { useSettings } from "@/lib/hooks/useSettings";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * `GET /settings` — the read-only audit view of every global setting, so an
 * operator can see what else the backend is tracking (a "last fetched"
 * timestamp, for example) and when it last changed.
 */
export function SettingsTable() {
  const { data, isPending, isError } = useSettings();

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-5">
      <h2 className="text-h3">{strings.admin.settingsTitle}</h2>
      <p className="mt-1 text-sm text-regal-navy/70">{strings.admin.settingsDesc}</p>

      {isPending ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : isError || !data ? (
        <EmptyState title={strings.errors.generic} />
      ) : (
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-pale-sky text-left text-xs uppercase text-regal-navy/60">
                <th className="px-2 py-2 font-bold">{strings.admin.colKey}</th>
                <th className="px-2 py-2 font-bold">{strings.admin.colValue}</th>
                <th className="px-2 py-2 font-bold">{strings.admin.colUpdated}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((setting) => (
                <tr
                  key={setting.key}
                  className="border-b border-pale-sky last:border-0 align-top"
                >
                  <td className="px-2 py-2">
                    <p className="font-bold text-regal-navy">{setting.key}</p>
                    {setting.description && (
                      <p className="text-xs text-regal-navy/60">
                        {setting.description}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-regal-navy">
                    {setting.value}
                  </td>
                  <td className="px-2 py-2 text-xs text-regal-navy/60">
                    {formatDateTime(setting.updatedAt)}
                    {setting.updatedBy && (
                      <span className="block">by {setting.updatedBy}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
