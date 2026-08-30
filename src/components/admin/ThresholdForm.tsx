"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/types/common";
import { strings } from "@/lib/constants/strings";
import { clamp } from "@/lib/utils";
import { useAlertThreshold, useUpdateAlertThreshold } from "@/lib/hooks/useSettings";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * F4 — the global Over/Under threshold.
 *
 * It applies globally and takes effect at read time: every claim's
 * `threshold_status` is derived when the Alert page loads, so saving a new
 * value reclassifies existing rows with no recomputation on either side.
 */
export function ThresholdForm() {
  const { data, isPending } = useAlertThreshold();
  const { mutateAsync, isPending: saving } = useUpdateAlertThreshold();
  const { toast } = useToast();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (data !== undefined) setValue(String(data));
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    // The backend rejects anything outside 0-100; clamp so it never sees one.
    const n = clamp(Math.round(Number(value) || 0), 0, 100);
    setValue(String(n));
    try {
      await mutateAsync(n);
      toast(strings.common.saved);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-5">
      <h2 className="text-h3">{strings.admin.thresholdTitle}</h2>
      <p className="mt-1 text-sm text-regal-navy/70">{strings.admin.thresholdDesc}</p>

      {isPending ? (
        <Skeleton className="mt-4 h-10 w-40" />
      ) : (
        <form onSubmit={save} className="mt-4 flex items-end gap-3">
          <Field
            label={strings.admin.thresholdLabel}
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-32"
          />
          <Button type="submit" loading={saving}>
            {strings.common.save}
          </Button>
        </form>
      )}
    </div>
  );
}
