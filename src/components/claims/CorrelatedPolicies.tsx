import Link from "next/link";
import { FileText } from "lucide-react";
import type { PolicyRef } from "@/types/claim";
import { strings } from "@/lib/constants/strings";

export function CorrelatedPolicies({
  title,
  policies,
}: {
  title: string;
  policies: PolicyRef[];
}) {
  return (
    <div className="rounded-xl border border-pale-sky bg-white p-4">
      <h3 className="text-h3">{title}</h3>
      {policies.length === 0 ? (
        <p className="mt-2 text-sm text-regal-navy/60">{strings.claims.noPolicies}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {policies.map((p) => (
            <li key={p.id}>
              <Link
                href={`/policies/${p.id}`}
                className="flex items-center gap-2 rounded-lg border border-pale-sky px-3 py-2 text-sm font-bold text-regal-navy hover:border-sea-green hover:text-sea-green"
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{p.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
