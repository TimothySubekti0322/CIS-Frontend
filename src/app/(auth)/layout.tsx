import type { ReactNode } from "react";
import { ShieldHalf } from "lucide-react";
import { strings } from "@/lib/constants/strings";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <ShieldHalf className="size-10 text-sea-green" aria-hidden />
        <h1 className="mt-2 text-h2 text-regal-navy">{strings.app.name}</h1>
        <p className="mt-1 max-w-xs text-sm text-regal-navy/60">
          {strings.app.tagline}
        </p>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-pale-sky bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
