"use client";

import { Lock, RotateCcw } from "lucide-react";
import type { ConfigParameter } from "@/types/settings";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

export interface ParameterFieldProps {
  param: ConfigParameter;
  value: string;
  /** A bound failure or a 422 detail keyed to this parameter. */
  error?: string | null;
  /** Legal but consequential — never blocks a save. */
  advisory?: string | null;
  onChange: (value: string) => void;
  /** Absent for a parameter already at its default, or one that is read-only. */
  onReset?: () => void;
  resetting?: boolean;
  disabled?: boolean;
}

/** "0–1 cosine", "7–365 days", "≥1 items" — whatever the catalog actually bounds. */
function boundsHint(param: ConfigParameter): string | null {
  const { min, max, unit } = param;
  const suffix = unit ? ` ${unit}` : "";
  if (min !== null && max !== null) return `${min}–${max}${suffix}`;
  if (min !== null) return `≥ ${min}${suffix}`;
  if (max !== null) return `≤ ${max}${suffix}`;
  return unit ? unit : null;
}

/**
 * One parameter's control.
 *
 * Everything that constrains the input — type, bounds, unit, default — is read
 * off the catalog row rather than restated here, which is the whole reason the
 * catalog carries them. A parameter added to the registry renders correctly
 * without this file changing.
 *
 * A non-writable parameter is shown, not hidden: `csi.risk_threshold` only
 * makes sense beside the threshold it mirrors, and the monitored city belongs
 * in the operational group even though it is written through its own endpoint.
 */
export function ParameterField({
  param,
  value,
  error,
  advisory,
  onChange,
  onReset,
  resetting,
  disabled,
}: ParameterFieldProps) {
  const inputId = `param-${param.key}`;
  const hint = boundsHint(param);
  const numeric = param.type === "number" || param.type === "integer";
  const editable = param.writable && !disabled;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <label htmlFor={inputId} className="text-sm font-bold text-regal-navy">
          {param.label}
        </label>
        {param.paramId && (
          <span className="rounded bg-glaucous-soft px-1.5 py-0.5 font-mono text-[10px] text-glaucous-deep">
            {param.paramId}
          </span>
        )}
        {param.description && (
          <InfoTooltip
            content={param.description}
            label={param.label}
            align="start"
          />
        )}
      </div>

      {param.type === "boolean" ? (
        <label className="flex h-10 items-center gap-2 text-sm text-regal-navy">
          <input
            id={inputId}
            type="checkbox"
            checked={value.trim() === "true"}
            disabled={!editable}
            onChange={(e) => onChange(String(e.target.checked))}
            className="size-4 accent-sea-green"
          />
          {param.unit ?? ""}
        </label>
      ) : (
        <div className="flex items-stretch">
          <input
            id={inputId}
            type={numeric ? "number" : "text"}
            inputMode={numeric ? "decimal" : undefined}
            step={param.type === "integer" ? 1 : "any"}
            min={param.min ?? undefined}
            max={param.max ?? undefined}
            value={value}
            readOnly={!editable}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={`${inputId}-hint`}
            className={cn(
              "h-10 w-full min-w-0 rounded-lg border bg-white px-3 text-sm text-regal-navy tabular-nums",
              "focus-visible:border-sea-green focus-visible:outline-none",
              param.unit && "rounded-r-none border-r-0",
              error ? "border-danger" : "border-pale-sky",
              !editable && "cursor-not-allowed bg-pale-sky/20 text-regal-navy/70",
            )}
          />
          {param.unit && (
            <span
              className={cn(
                "inline-flex h-10 shrink-0 items-center rounded-r-lg border border-l-0 bg-mint-cream px-2 text-xs text-regal-navy/60",
                error ? "border-danger" : "border-pale-sky",
              )}
            >
              {param.unit}
            </span>
          )}
        </div>
      )}

      <div id={`${inputId}-hint`} className="space-y-0.5">
        {!param.writable && (
          <p className="flex items-start gap-1 text-xs font-bold text-glaucous-deep">
            <Lock className="mt-0.5 size-3 shrink-0" aria-hidden />
            {param.derived
              ? strings.parameters.derived
              : param.managedBy
                ? `${strings.parameters.managedElsewhere} ${param.managedBy}`
                : strings.parameters.readOnly}
          </p>
        )}
        {hint && (
          <p className="text-xs text-regal-navy/60">
            {strings.parameters.range}: {hint} · {strings.parameters.defaultIs}{" "}
            <span className="tabular-nums">{param.default}</span>
          </p>
        )}
        {/* The note carries the caveat the bounds cannot express — several of
            them explain why a value has the ceiling it has. */}
        {param.note && <p className="text-xs text-regal-navy/60">{param.note}</p>}
        {advisory && !error && (
          <p className="rounded border border-gold bg-gold-soft px-2 py-1 text-xs text-regal-navy">
            {advisory}
          </p>
        )}
        {error && <p className="text-xs font-bold text-danger">{error}</p>}
      </div>

      {param.writable && (
        <div className="min-h-5">
          {param.isSet ? (
            <button
              type="button"
              onClick={onReset}
              disabled={resetting || disabled}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-sea-green hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="size-3" aria-hidden />
              {strings.parameters.reset}
            </button>
          ) : (
            // `is_set` is a comparison against the default, not "a row exists"
            // — every parameter has a row, so row existence would mean nothing.
            <span className="text-xs text-regal-navy/40">
              {strings.parameters.isDefault}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
