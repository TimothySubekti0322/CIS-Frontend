"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldHalf, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/constants/strings";
import { NAV_ITEMS } from "@/lib/constants/nav";
import { IconButton } from "@/components/ui/IconButton";

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-regal-navy/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-regal-navy text-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link href="/claims" className="flex items-center gap-2" onClick={onCloseMobile}>
            <ShieldHalf className="size-6 text-mint-leaf" aria-hidden />
            <span className="font-bold leading-tight">
              {strings.app.shortName}
              <span className="block text-[11px] font-normal text-white/60">
                {strings.app.name}
              </span>
            </span>
          </Link>
          <IconButton
            label="Close menu"
            onClick={onCloseMobile}
            className="text-white hover:bg-white/10 lg:hidden"
          >
            <X className="size-5" aria-hidden />
          </IconButton>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/10 font-bold text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] font-bold text-white/40">{item.code}</span>
              </Link>
            );
          })}
        </nav>

        <p className="px-4 py-3 text-[11px] text-white/40">PRD v1.3 · Phase 1</p>
      </aside>
    </>
  );
}
