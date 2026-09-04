"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ApiError } from "@/types/common";
import { TIER_ANALYTICS } from "@/types/settings";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import {
  PARAM,
  advisoryFor,
  boundError,
  buildPatch,
  crossFieldErrors,
  effectiveValue,
  indexParameters,
  needsRescore,
  parseValue,
  sectionsForTier,
  splitValidationDetails,
  sumGroupSatisfied,
  sumGroupTotal,
  sumGroupsIn,
} from "@/lib/parameters";
import {
  useParameters,
  useResetParameter,
  useUpdateParameters,
} from "@/lib/hooks/useSettings";
import { useOverview } from "@/lib/hooks/useOverview";
import { useRescoreClaims } from "@/lib/hooks/useAdminTools";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CitySelectorForm } from "@/components/admin/CitySelectorForm";
import { CsiBandPreview } from "./CsiBandPreview";
import { ParameterField } from "./ParameterField";

/** A change the operator is asked to confirm before it is written. */
interface Consequence {
  title: string;
  body: string;
}

/**
 * One tier of the dynamic-parameter form.
 *
 * The two tiers are separate screens rather than one long page because the
 * split is by *who decides*, which is the question a user actually has in
 * front of a field: am I allowed to change this? A control that re-ranks the
 * whole claim repository should not sit beside one that changes how many rows
 * a leaderboard shows.
 *
 * Three properties shape the form:
 *
 *  - **Only changed keys are submitted.** The write is partial; an omitted key
 *    keeps its stored value.
 *  - **Bounds come from the catalog.** Nothing here restates a min, max, unit
 *    or default — a second copy drifts, and the drift shows up as a form that
 *    accepts a value the server rejects.
 *  - **Cross-field rules are echoed, not owned.** The server validates the
 *    merged set and is the authority. The local check exists so the operator
 *    sees a broken weight sum while editing rather than after saving.
 */
export function ParameterTierForm({ tier }: { tier: string }) {
  const { toast } = useToast();
  const catalog = useParameters();
  const update = useUpdateParameters();
  const resetParam = useResetParameter();
  const rescore = useRescoreClaims();
  const overview = useOverview();

  const [draft, setDraft] = useState<Record<string, string>>({});
  /** 422 `details`, split by shape — see `splitValidationDetails`. */
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const [serverGroupErrors, setServerGroupErrors] = useState<Record<string, string>>({});
  const [pendingConfirm, setPendingConfirm] = useState<Consequence[] | null>(null);
  const [rescorePrompt, setRescorePrompt] = useState(false);

  const index = useMemo(() => indexParameters(catalog.data), [catalog.data]);
  const sections = useMemo(
    () => sectionsForTier(catalog.data, tier),
    [catalog.data, tier],
  );
  const tierMeta = catalog.data?.tiers.find((t) => t.key === tier);
  const patch = useMemo(() => buildPatch(index, draft), [index, draft]);
  const dirty = Object.keys(patch).length > 0;

  /**
   * The cross-field rules run over the whole catalog, not this tier's slice:
   * the rules are relationships, and validating a subset is how a weight sum
   * of 0.9 gets through.
   */
  const crossErrors = useMemo(
    () => crossFieldErrors(catalog.data, draft),
    [catalog.data, draft],
  );

  /** Per-field: a bound failure, a cross-field rule keyed to this parameter, or a 422. */
  const fieldErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const [key, raw] of Object.entries(draft)) {
      const param = index.get(key);
      if (!param) continue;
      const message = boundError(param, raw);
      if (message) errors[key] = message;
    }
    for (const [key, message] of Object.entries(crossErrors)) {
      if (index.has(key)) errors[key] = message;
    }
    return { ...errors, ...serverFieldErrors };
  }, [draft, index, crossErrors, serverFieldErrors]);

  /** Keyed by group: no single input is at fault, so it renders above the fieldset. */
  const groupErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const [key, message] of Object.entries(crossErrors)) {
      if (!index.has(key)) errors[key] = message;
    }
    return { ...errors, ...serverGroupErrors };
  }, [crossErrors, index, serverGroupErrors]);

  const blocked =
    Object.keys(fieldErrors).length > 0 || Object.keys(groupErrors).length > 0;

  function setValue(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    // A server error describes the value that was sent, not the one being
    // typed — clear it the moment the field moves.
    setServerFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setServerGroupErrors({});
  }

  function discard() {
    setDraft({});
    setServerFieldErrors({});
    setServerGroupErrors({});
  }

  /**
   * The consequences worth stopping for. Both are irreversible in the sense
   * that matters: one fires a wave of notifications, the other deletes history
   * that does not come back.
   */
  function consequencesOf(pending: Record<string, string>): Consequence[] {
    const notes: Consequence[] = [];

    const threshold = index.get(PARAM.alertThreshold);
    const nextThreshold = parseValue(pending[PARAM.alertThreshold]);
    const currentThreshold = threshold ? parseValue(threshold.value) : null;
    if (
      nextThreshold !== null &&
      currentThreshold !== null &&
      nextThreshold < currentThreshold
    ) {
      const ratio = overview.data?.thresholdRatio;
      const counts = ratio
        ? ` ${strings.parameters.thresholdCurrent}: ${ratio.above} of ${ratio.total}.`
        : "";
      notes.push({
        title: strings.parameters.thresholdConfirmTitle,
        body: `${strings.parameters.thresholdConfirmBody}${counts} ${currentThreshold} → ${nextThreshold}.`,
      });
    }

    const retention = index.get(PARAM.retentionDays);
    const nextRetention = parseValue(pending[PARAM.retentionDays]);
    const currentRetention = retention ? parseValue(retention.value) : null;
    if (
      nextRetention !== null &&
      currentRetention !== null &&
      nextRetention < currentRetention
    ) {
      notes.push({
        title: strings.parameters.retentionConfirmTitle,
        body: `${strings.parameters.retentionConfirmBody} ${strings.parameters.retentionGivingUp}: ${
          currentRetention - nextRetention
        } (${currentRetention} → ${nextRetention}).`,
      });
    }

    return notes;
  }

  function requestSave() {
    if (!dirty) {
      toast(strings.parameters.noChanges, "error");
      return;
    }
    if (blocked) {
      toast(strings.parameters.blocked, "error");
      return;
    }
    const notes = consequencesOf(patch);
    if (notes.length > 0) setPendingConfirm(notes);
    else void save();
  }

  async function save() {
    setPendingConfirm(null);
    try {
      await update.mutateAsync(patch);
      const rescoreable = needsRescore(index, patch);
      discard();
      toast(strings.parameters.saved);
      if (rescoreable) setRescorePrompt(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const split = splitValidationDetails(err.details, index);
        setServerFieldErrors(split.fields);
        setServerGroupErrors(split.groups);
      }
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  async function reset(key: string) {
    try {
      await resetParam.mutateAsync(key);
      setDraft((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast(`${index.get(key)?.label ?? key} — ${strings.parameters.resetDone}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : strings.errors.generic, "error");
    }
  }

  if (catalog.isPending) return <Skeleton className="h-96 w-full" />;
  if (catalog.isError || sections.length === 0) {
    return <EmptyState title={strings.parameters.loadFailed} />;
  }

  return (
    <div className="space-y-6">
      {tierMeta && (
        <div>
          <h2 className="text-h3">{tierMeta.title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-regal-navy/70">
            {tierMeta.description}
          </p>
        </div>
      )}

      {/* Tier 2 changes nothing on screen and everything in the ranking, so the
          warning has to be the thing that says a number moved. */}
      {tier === TIER_ANALYTICS && (
        <p className="flex items-start gap-2 rounded-xl border border-gold bg-gold-soft px-4 py-3 text-sm text-regal-navy">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {strings.parameters.analyticsWarning}
        </p>
      )}

      {sections.map((section) => {
        const groups = sumGroupsIn(section);
        const hasCity = section.parameters.some((p) => p.key === PARAM.monitoredCity);
        const hasBands = section.parameters.some(
          (p) => p.key === PARAM.csiBandWatchCeiling,
        );

        return (
          <Card key={section.key} className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-regal-navy">{section.title}</h3>
                {section.description && (
                  <p className="mt-0.5 max-w-2xl text-xs text-regal-navy/60">
                    {section.description}
                  </p>
                )}
              </div>

              {/* A running total per sum group, so the constraint is visible
                  while editing rather than reported after a rejected save. */}
              {groups.map((group) => {
                const total = sumGroupTotal(group, section.parameters, draft);
                const ok = sumGroupSatisfied(total);
                return (
                  <p
                    key={group}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-bold tabular-nums",
                      ok
                        ? "border-mint-leaf bg-mint-leaf-soft text-sea-green"
                        : "border-danger bg-danger-soft text-danger",
                    )}
                  >
                    {strings.parameters.groupTotal}: {total.toFixed(3)}
                    {!ok && ` · ${strings.parameters.groupTotalMustBe}`}
                  </p>
                );
              })}
            </div>

            {groups
              .filter((group) => groupErrors[group])
              .map((group) => (
                <p
                  key={group}
                  className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-xs font-bold text-danger"
                >
                  {groupErrors[group]}
                </p>
              ))}

            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
              {section.parameters.map((param) => {
                const value = effectiveValue(param, draft);
                return (
                  <ParameterField
                    key={param.key}
                    param={param}
                    value={value}
                    error={fieldErrors[param.key] ?? null}
                    advisory={advisoryFor(param, value)}
                    onChange={(next) => setValue(param.key, next)}
                    onReset={() => void reset(param.key)}
                    resetting={resetParam.isPending}
                  />
                );
              })}
            </div>

            {hasBands && (
              <CsiBandPreview
                risky={parseValue(
                  draft[PARAM.csiBandRiskyCeiling] ??
                    index.get(PARAM.csiBandRiskyCeiling)?.value,
                )}
                watch={parseValue(
                  draft[PARAM.csiBandWatchCeiling] ??
                    index.get(PARAM.csiBandWatchCeiling)?.value,
                )}
              />
            )}

            {/* Rendered here, written there: the city belongs in this group,
                but its value must be one of a fixed catalog, which the generic
                setter cannot check. */}
            {hasCity && <CitySelectorForm />}
          </Card>
        );
      })}

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t border-pale-sky bg-white/95 px-1 py-3 backdrop-blur">
        {blocked && (
          <p className="mr-auto text-xs font-bold text-danger">
            {strings.parameters.blocked}
          </p>
        )}
        <Button variant="secondary" onClick={discard} disabled={!dirty || update.isPending}>
          {strings.parameters.discard}
        </Button>
        <Button
          onClick={requestSave}
          loading={update.isPending}
          disabled={!dirty || blocked}
        >
          {strings.parameters.save}
        </Button>
      </div>

      <ConfirmDialog
        open={pendingConfirm !== null}
        // One consequence speaks for itself; two need a heading that does not
        // claim to be either of them.
        title={
          pendingConfirm?.length === 1
            ? pendingConfirm[0].title
            : strings.parameters.confirmTitle
        }
        body={
          <span className="space-y-2">
            {(pendingConfirm ?? []).map((note) => (
              <span key={note.title} className="block">
                {note.body}
              </span>
            ))}
          </span>
        }
        destructive
        loading={update.isPending}
        onConfirm={() => void save()}
        onCancel={() => setPendingConfirm(null)}
      />

      {/* Ranking follows the new weights immediately; each stored score does
          not, so the operator is offered the recomputation rather than left to
          remember it. */}
      <ConfirmDialog
        open={rescorePrompt}
        title={strings.parameters.rescoreTitle}
        body={strings.parameters.rescoreBody}
        confirmLabel={strings.parameters.rescoreAction}
        cancelLabel={strings.parameters.rescoreDismiss}
        loading={rescore.isPending}
        onConfirm={async () => {
          try {
            const count = await rescore.mutateAsync();
            toast(`${count} ${strings.parameters.rescoreDone}`);
          } catch (err) {
            toast(
              err instanceof ApiError ? err.message : strings.errors.generic,
              "error",
            );
          } finally {
            setRescorePrompt(false);
          }
        }}
        onCancel={() => setRescorePrompt(false)}
      />
    </div>
  );
}
