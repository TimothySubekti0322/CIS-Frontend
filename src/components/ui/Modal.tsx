"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** max-width utility, defaults to a compact dialog. */
  className?: string;
}

/** Base dialog — overlay, ESC to close, focus moves in, scroll lock. */
export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Callers pass `onClose` as a plain arrow or a function declared in their
  // body, so its identity changes on every render. Reading it through a ref
  // keeps the effect below keyed on `open` alone — otherwise every keystroke
  // in a field would re-run the effect and pull focus back to the panel.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    // Restore focus to whatever opened the dialog once it closes.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-regal-navy/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "w-full max-w-md rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl",
          "max-h-[90vh] overflow-y-auto",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-pale-sky p-4">
          <h2 className="text-h3">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-1">
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-pale-sky p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
