import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
}

/** Labelled text/number/date input — reused across auth, admin and modals. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-bold text-regal-navy">
          {label}
        </label>
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
          <p className="text-xs text-regal-navy/60">{hint}</p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Field.displayName = "Field";
