import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
}

/** Labelled multi-line input — policy descriptions and reviewer notes. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? `textarea-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-bold text-regal-navy">
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "rounded-lg border bg-white px-3 py-2 text-sm text-regal-navy",
            "placeholder:text-glaucous focus-visible:border-sea-green focus-visible:outline-none",
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
TextArea.displayName = "TextArea";
