import type { ReactNode } from "react";
import { strings } from "@/lib/constants/strings";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        {/* ciis_logo_1 is the reversed (white) mark, so it sits on a dark chip. */}
        <div className="rounded-2xl bg-regal-navy px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG mark, no optimisation benefit */}
          <img
            src="/brand/ciis_logo_1.svg"
            alt="Climate Immune System"
            className="h-auto w-56"
          />
        </div>
        <p className="mt-3 max-w-xs text-sm text-regal-navy/60">
          {strings.app.tagline}
        </p>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-pale-sky bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
