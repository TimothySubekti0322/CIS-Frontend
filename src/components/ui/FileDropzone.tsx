"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXT = [".pdf", ".doc", ".docx"];

export interface FileDropzoneProps {
  file: File | null;
  onFile: (file: File | null) => void;
  /** Inline error message for a rejected file type. */
  rejectMessage: string;
  hint?: string;
}

function isAccepted(file: File): boolean {
  if (ACCEPTED.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => name.endsWith(ext));
}

/** PDF/Word only, no size limit — size not advertised. */
export function FileDropzone({ file, onFile, rejectMessage, hint }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = (selected: File | undefined) => {
    if (!selected) return;
    if (!isAccepted(selected)) {
      setError(rejectMessage);
      onFile(null);
      return;
    }
    setError(null);
    onFile(selected);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragOver
            ? "border-sea-green bg-sea-green-soft"
            : "border-pale-sky bg-mint-cream hover:border-glaucous",
        )}
      >
        {file ? (
          <>
            <FileText className="size-6 text-sea-green" aria-hidden />
            <span className="text-sm font-bold text-regal-navy">{file.name}</span>
            <span className="text-xs text-regal-navy/60">Click to choose a different file</span>
          </>
        ) : (
          <>
            <UploadCloud className="size-6 text-glaucous" aria-hidden />
            <span className="text-sm font-bold text-regal-navy">
              Drop a file here or click to browse
            </span>
            {hint && <span className="text-xs text-regal-navy/60">{hint}</span>}
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED, ...ACCEPTED_EXT].join(",")}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
