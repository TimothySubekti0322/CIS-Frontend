import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * The AI service writes its drafts as plain text with light Markdown emphasis
 * and blank-line paragraphs. This renders exactly that much — `**bold**` and
 * `_italic_`, split on newlines — and nothing more.
 *
 * Deliberately not a Markdown library: the text is copied to a clipboard and
 * pasted into someone else's channel, so what is rendered here has to stay
 * recognisably the same string. A renderer that resolved links, images or raw
 * HTML would also be a place for AI-authored content to inject markup.
 */
export function RichText({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {value.split("\n").map((line, i) => (
        <p key={i} className={line.trim() === "" ? "h-1" : undefined}>
          {renderInline(line)}
        </p>
      ))}
    </div>
  );
}

/** Minimal `**bold**` / `_italic_` inline rendering for a single line. */
export function renderInline(line: string) {
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
