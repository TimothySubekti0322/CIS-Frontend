"use client";

import { LogOut, Menu, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { strings } from "@/lib/constants/strings";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";

export function TopBar({
  title,
  onOpenMobileNav,
}: {
  title: string;
  onOpenMobileNav: () => void;
}) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-pale-sky bg-mint-cream/90 px-4 backdrop-blur">
      <IconButton
        label="Open menu"
        onClick={onOpenMobileNav}
        className="lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </IconButton>

      <h1 className="flex-1 truncate text-h3">{title}</h1>

      <div className="hidden items-center gap-1.5 text-sm text-regal-navy/70 sm:flex">
        <UserIcon className="size-4" aria-hidden />
        {user?.name || user?.email || "—"}
      </div>
      <Button variant="ghost" size="sm" onClick={() => void logout()}>
        <LogOut className="size-4" aria-hidden />
        <span className="hidden sm:inline">{strings.auth.logout}</span>
      </Button>
    </header>
  );
}
