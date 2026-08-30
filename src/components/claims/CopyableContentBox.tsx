"use client";

import { useState, Fragment } from "react";
import { Check, Copy } from "lucide-react";
import { strings } from "@/lib/constants/strings";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

export interface CopyableContentBoxProps {
  title: string;
  content: string;
}

/** AI-generated Debunk/Prebunk draft with a copy action (PRD US12 / US20). */
export function CopyableContentBox({ title, content }: CopyableContentBoxProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast(strings.common.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(strings.errors.generic, "error");
    }
  }

  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-h3">{title}</h3>
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copied ? strings.common.copied : strings.common.copy}
        </Button>
      </div>
      <div className="mt-3 space-y-2 rounded-lg bg-mint-cream p-3 text-sm leading-relaxed text-regal-navy">
        {content.split("\n").map((line, i) => (
          <p key={i} className={line.trim() === "" ? "h-1" : undefined}>
            {renderInline(line)}
          </p>
        ))}
      </div>
      <p className="mt-2 text-xs text-regal-navy/50">
        AI-generated draft — treat as a starting point, not a final decision.
      </p>
    </div>
  );
}

/** Minimal **bold** / _italic_ inline rendering. */
function renderInline(line: string) {
  return line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
