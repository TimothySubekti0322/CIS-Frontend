"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { Button, type ButtonProps } from "./Button";
import { useToast } from "./Toast";

export interface CopyButtonProps
  extends Omit<ButtonProps, "onClick" | "children" | "value"> {
  /** `null` disables the button — there is nothing to put on the clipboard. */
  value: string | null;
  /** Overrides the default "Copy" label, e.g. per audience segment. */
  label?: string;
}

/**
 * Copy-to-clipboard with a two-second confirmed state.
 *
 * Shared by the single Debunk/Prebunk box and by each segmented recommendation
 * card, so every copy action in the product confirms identically — the
 * clipboard gives no feedback of its own, and a silent copy reads as a failed
 * one.
 */
export function CopyButton({
  value,
  label = strings.common.copy,
  variant = "secondary",
  size = "sm",
  disabled,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  // The confirmed state is a timer, and the component can unmount inside it —
  // a tab switch mid-copy, say — so it is always cleared.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast(strings.common.copied);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(strings.errors.generic, "error");
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={copy}
      disabled={disabled || !value}
      {...props}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      {copied ? strings.common.copied : label}
    </Button>
  );
}
