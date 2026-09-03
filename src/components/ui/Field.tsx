import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "./InfoTooltip";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  /** Explanation surfaced via a hover/focus info button beside the label, instead of text below the input. */
  tooltip?: string;
}

/** Labelled text/number/date input — reused across auth, admin and modals. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, tooltip, className, id, ...props }, ref) => {
    const inputId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <label htmlFor={inputId} className="text-sm font-bold text-regal-navy">
            {label}
          </label>
          {tooltip && (
            <InfoTooltip content={tooltip} label={label} align="start" />
          )}
        </div>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-regal-navy",
            "placeholder:text-glaucous focus-visible:outline-none focus-visible:border-sea-green",
            error ? "border-danger" : "border-pale-sky",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {hint && !error && (
          <p className="mt-4 text-xs text-regal-navy/60">{hint}</p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Field.displayName = "Field";
