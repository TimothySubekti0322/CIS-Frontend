"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { useCities, useUpdateCity } from "@/lib/hooks/useSettings";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Which single Indonesian city this instance monitors.
 *
 * Single-select by design: choosing a city replaces the old one outright,
 * with no concurrent multi-city state.
 *
 * Selecting a city also sets its timezone, shown here instead of edited
 * separately, so the instance can't end up monitoring one city while
 * stamping detector reports in another city's time zone.
 */
export function CitySelectorForm() {
  const { data, isPending } = useCities();
  const { mutateAsync, isPending: saving } = useUpdateCity();
  const { toast } = useToast();
  const [value, setValue] = useState("");

  const selected = data?.selected ?? null;

  useEffect(() => {
    if (selected) setValue(selected.name);
  }, [selected]);

  const chosen = data?.cities.find((city) => city.name === value) ?? null;
  const unchanged = !value || value === selected?.name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (unchanged) return;
    try {
      await mutateAsync(value);
      toast(strings.admin.citySaved);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
      // Put the control back on the stored value: a failed save must not
      // leave the form claiming a city the backend never accepted.
      setValue(selected?.name ?? "");
    }
  }

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-5">
      <h2 className="text-h3">{strings.admin.cityTitle}</h2>
      <p className="mt-1 text-sm text-regal-navy/70">{strings.admin.cityDesc}</p>

      {isPending ? (
        <Skeleton className="mt-4 h-10 w-64" />
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="admin-city"
              className="text-sm font-bold text-regal-navy"
            >
              {strings.admin.cityLabel}
            </label>
            <select
              id="admin-city"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 min-w-56 rounded-lg border border-pale-sky bg-white px-3 text-sm text-regal-navy focus-visible:border-sea-green focus-visible:outline-none"
            >
              {/* Only offered while nothing is stored — once a city is set,
                  the selection cannot be cleared, only replaced. */}
              {!selected && <option value="">{strings.admin.cityUnset}</option>}
              {(data?.cities ?? []).map((city) => (
                <option key={city.name} value={city.name}>
                  {city.name} · {city.province}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" loading={saving} disabled={unchanged}>
            {strings.common.save}
          </Button>

          {chosen && (
            <p className="flex items-center gap-1.5 pb-2.5 text-xs text-regal-navy/60">
              <MapPin className="size-3.5" aria-hidden />
              {strings.admin.cityTimezoneNote}: {chosen.timezone}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
