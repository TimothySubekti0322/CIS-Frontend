"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";

export interface InfoTooltipProps {
  /** The explanation. Kept short — this is a hint, not documentation. */
  content: string;
  /** Announced to screen readers and used as the button's tooltip. */
  label?: string;
  /** Which side of the icon the bubble opens on. */
  align?: "start" | "center" | "end";
  className?: string;
}

/**
 * The info icon used by the score-formula hint, the Harm rubric hints and the
 * sentiment gauge.
 *
 * Hover alone is not enough: a keyboard or touch user has no hover, so the
 * bubble opens on focus and on click as well, and closes on Escape or an
 * outside click. The content is always rendered into the DOM and toggled with
 * `hidden`, so assistive tech can reach it through `aria-describedby`.
 */
export function InfoTooltip({
  content,
  label = strings.common.whatIsThis,
  align = "center",
  className,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setOpen((prev) => !prev)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-glaucous transition-colors hover:bg-pale-sky/50 hover:text-regal-navy"
      >
        <Info className="size-4" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={cn(
          "absolute bottom-full z-30 mb-2 w-64 rounded-lg bg-regal-navy px-3 py-2 text-xs leading-relaxed font-normal text-white shadow-lg",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
