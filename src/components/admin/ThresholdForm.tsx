"use client";

import { useEffect, useState } from "react";
import { strings } from "@/lib/constants/strings";
import { clamp } from "@/lib/utils";
import { useAdminSettings, useUpdateAdminSettings } from "@/lib/hooks/useAdmin";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";

/** F4 — global Alert threshold (PRD US32). */
export function ThresholdForm() {
  const { data, isPending } = useAdminSettings();
  const { mutateAsync, isPending: saving } = useUpdateAdminSettings();
  const { toast } = useToast();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (data) setValue(String(data.alertThreshold));
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = clamp(Math.round(Number(value) || 0), 0, 100);
    setValue(String(n));
    try {
      await mutateAsync({ alertThreshold: n });
      toast(strings.common.saved);
    } catch {
      toast(strings.errors.generic, "error");
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
