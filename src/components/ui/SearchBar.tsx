"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Live-filter search input — reused on F1 (S1/S2), F2, F3. */
export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-glaucous"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full rounded-lg border border-pale-sky bg-white pl-9 pr-9 text-sm",
          "placeholder:text-glaucous focus-visible:border-sea-green focus-visible:outline-none",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-glaucous transition-colors hover:bg-pale-sky/50 hover:text-regal-navy"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
