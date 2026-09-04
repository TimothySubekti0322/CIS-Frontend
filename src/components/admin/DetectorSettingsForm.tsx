"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";
import type { DetectorParamRange, DetectorSettings } from "@/types/network";
import { ApiError } from "@/types/common";
import { cn, formatDateTime } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import {
  useCityTimezone,
  useDetectorHistory,
  useDetectorRanges,
  useDetectorSettings,
  useSetCityTimezone,
  useUpdateDetectorSettings,
} from "@/lib/hooks/useDetector";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { DetectorUnavailable, isDetectorUnavailable } from "@/components/networks/DetectorUnavailable";

/**
 * The detector control panel.
 *
 * Two properties shape this form:
 *
 *  - **Only changed keys are submitted.** A screen that saves one threshold
 *    must not silently reset the other twenty-nine to whatever its inputs
 *    happened to render.
 *  - **Bounds come from the server.** Ranges are served by
 *    `/settings/detector/ranges` rather than hardcoded here, so the form and
 *    the validator cannot disagree about what is legal.
 *
 * The two cross-field constraints (weights summing to 1.00, cadence ≤ W/2) are
 * validated server-side on the whole merged row. The weight sum is echoed live
 * below because it is the one an admin will trip most often.
 */

/** Grouping is presentational only — the payload is flat. */
const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: strings.detector.groupWindow,
    keys: ["window_days", "bin_width_seconds", "null_model_alpha"],
  },
  {
    title: strings.detector.groupText,
    keys: ["dup_threshold", "sem_threshold", "min_post_length"],
  },
  {
    title: strings.detector.groupGraph,
    keys: [
      "edge_threshold",
      "min_signal_families",
      "k_core",
      "leiden_resolution",
      "min_cluster_size",
      "min_internal_density",
      "provenance_half_life_hours",
    ],
  },
  {
    title: strings.detector.groupWeights,
    keys: ["beta_time", "beta_text", "beta_amp", "beta_meta", "beta_struct"],
  },
  {
    title: strings.detector.groupRelevance,
    keys: ["anchor_share", "min_claim_posts", "min_link_strength"],
  },
  {
    title: strings.detector.groupBanding,
    keys: [
      "high_score_cutoff",
      "high_breadth_cutoff",
      "medium_score_cutoff",
      "medium_breadth_cutoff",
    ],
  },
  {
    title: strings.detector.groupSchedule,
    keys: [
      "cadence_hours",
      "candidate_cap",
      "recurrence_threshold",
      "velocity_trigger_threshold",
    ],
  },
];

const BETA_KEYS = ["beta_time", "beta_text", "beta_amp", "beta_meta", "beta_struct"];

/** `window_days` on the wire is `windowDays` in the domain model. */
function camel(key: string): keyof DetectorSettings {
  return key.replace(/_([a-z])/g, (_, c: string) =>
    c.toUpperCase(),
  ) as keyof DetectorSettings;
}

export function DetectorSettingsForm() {
  const { toast } = useToast();
  const settings = useDetectorSettings();
  const ranges = useDetectorRanges();
  const update = useUpdateDetectorSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [velocityEnabled, setVelocityEnabled] = useState<boolean | null>(null);

  const rangeByKey = useMemo(() => {
    const map = new Map<string, DetectorParamRange>();
    for (const range of ranges.data ?? []) map.set(range.key, range);
    return map;
  }, [ranges.data]);

  if (isDetectorUnavailable(settings.error)) {
    return <DetectorUnavailable error={settings.error} />;
  }

  if (settings.isPending || !settings.data) {
    return <Skeleton className="h-96 w-full" />;
  }

  const current = settings.data;

  function valueFor(key: string): string {
    if (draft[key] !== undefined) return draft[key];
    const raw = current[camel(key)];
    return typeof raw === "number" ? String(raw) : "";
  }

  /** The live weight sum — the constraint an admin trips most often. */
  const betaSum = BETA_KEYS.reduce((sum, key) => {
    const n = Number(valueFor(key));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const dirty =
    Object.keys(draft).some((key) => {
      const raw = current[camel(key)];
      return Number(draft[key]) !== raw;
    }) ||
    (velocityEnabled !== null && velocityEnabled !== current.velocityTriggerEnabled);

  async function save() {
    const patch: Record<string, number | boolean> = {};
    for (const [key, value] of Object.entries(draft)) {
      const n = Number(value);
      // Only genuinely changed, parseable values travel — an omitted key keeps
      // its stored value on the server.
      if (value !== "" && Number.isFinite(n) && n !== current[camel(key)]) {
        patch[key] = n;
      }
    }
    if (
      velocityEnabled !== null &&
      velocityEnabled !== current.velocityTriggerEnabled
    ) {
      patch.velocity_trigger_enabled = velocityEnabled;
    }
    if (Object.keys(patch).length === 0) {
      toast(strings.detector.noChanges, "error");
      return;
    }
    try {
      await update.mutateAsync(patch);
      setDraft({});
      setVelocityEnabled(null);
      toast(strings.detector.saved);
    } catch (err) {
      // A 422 names the failing constraint in `error.details`; the top-level
      // message already reads as a sentence, so it is shown as-is.
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3">{strings.detector.title}</h2>
            <p className="mt-1 max-w-2xl text-xs text-regal-navy/60">
              {strings.detector.description}
            </p>
          </div>
          <div className="text-right text-xs text-regal-navy/60">
            <p>
              {strings.admin.colUpdated}: {formatDateTime(current.updatedAt)}
            </p>
            <p>
              {strings.detector.selfExclusion}: {current.selfExclusionCount}
            </p>
          </div>
        </div>

        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="text-sm font-bold text-regal-navy">{group.title}</h3>
            {group.title === strings.detector.groupWeights && (
              <p className="mt-1 text-xs text-regal-navy/60">
                {strings.detector.weightsSumHint}{" "}
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    Math.abs(betaSum - 1) > 0.001 ? "text-danger" : "text-sea-green",
                  )}
                >
                  {strings.detector.weightsSumCurrent}: {betaSum.toFixed(3)}
                </span>
              </p>
            )}
            {group.title === strings.detector.groupSchedule && (
              <p className="mt-1 text-xs text-regal-navy/60">
                {strings.detector.cadenceHint}
              </p>
            )}
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.keys.map((key) => {
                const range = rangeByKey.get(key);
                return (
                  <Field
                    key={key}
                    label={
                      range
                        ? `${range.label}${range.symbol ? ` (${range.symbol})` : ""}`
                        : key
                    }
                    type="number"
                    step={range?.integer ? 1 : "any"}
                    min={range?.min}
                    max={range?.max}
                    value={valueFor(key)}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    tooltip={
                      range
                        ? `${range.min}–${range.max}${
                            range.unit ? ` ${range.unit}` : ""
                          }${range.note ? ` · ${range.note}` : ""}`
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </section>
        ))}

        <label className="flex items-center gap-2 text-sm text-regal-navy">
          <input
            type="checkbox"
            checked={velocityEnabled ?? current.velocityTriggerEnabled}
            onChange={(e) => setVelocityEnabled(e.target.checked)}
            className="size-4 accent-sea-green"
          />
          Velocity trigger enabled
        </label>

        <div className="flex justify-end">
          <Button onClick={save} loading={update.isPending} disabled={!dirty}>
            {strings.detector.save}
          </Button>
        </div>
      </Card>

      <CityTimezoneCard />
      <ParameterHistory />
    </div>
  );
}

/** Report footers need the city's local time, and only this knows it. */
function CityTimezoneCard() {
  const { toast } = useToast();
  const { data, isPending } = useCityTimezone();
  const save = useSetCityTimezone();
  const [value, setValue] = useState<string | null>(null);

  if (isPending) return <Skeleton className="h-28 w-full" />;

  const timezone = value ?? data ?? "UTC";

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-h3">{strings.detector.cityTimezone}</h2>
        <p className="mt-1 text-xs text-regal-navy/60">
          {strings.detector.cityTimezoneHint}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field
          label={strings.detector.cityTimezone}
          value={timezone}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-56"
        />
        <Button
          loading={save.isPending}
          disabled={timezone === data}
          onClick={async () => {
            try {
              await save.mutateAsync(timezone);
              setValue(null);
              toast(strings.detector.cityTimezoneSaved);
            } catch (err) {
              toast(
                err instanceof ApiError ? err.message : strings.errors.generic,
                "error",
              );
            }
          }}
        >
          {strings.common.save}
        </Button>
      </div>
    </Card>
  );
}

/** Every change is versioned with its user and timestamp. */
function ParameterHistory() {
  const { data, isPending } = useDetectorHistory();

  return (
    <Card className="space-y-3">
      <h2 className="text-h3">
        <span className="inline-flex items-center gap-1.5">
          <History className="size-4" aria-hidden />
          {strings.detector.historyTitle}
        </span>
      </h2>
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-regal-navy/60">{strings.detector.historyEmpty}</p>
      ) : (
        <div className="scroll-x">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-pale-sky text-left text-xs text-regal-navy/70">
                <th className="px-2 py-2">{strings.admin.colKey}</th>
                <th className="px-2 py-2">From</th>
                <th className="px-2 py-2">To</th>
                <th className="px-2 py-2">{strings.admin.colUpdated}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.id} className="border-b border-pale-sky/60">
                  <td className="px-2 py-2 font-mono text-xs">{entry.key}</td>
                  <td className="px-2 py-2 tabular-nums">{entry.fromValue ?? "—"}</td>
                  <td className="px-2 py-2 font-bold tabular-nums">
                    {entry.toValue}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-xs text-regal-navy/60">
                    {formatDateTime(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
