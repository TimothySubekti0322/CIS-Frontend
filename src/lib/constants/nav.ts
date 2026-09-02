import {
  Bell,
  LayoutDashboard,
  LayoutList,
  Network,
  Settings,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { strings } from "./strings";
import { HOME_HREF } from "./routes";

/** Which live counter, if any, the sidebar renders beside this item. */
export type NavBadge = "alertCrossings";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Present only where a counter is defined; see `Sidebar`. */
  badge?: NavBadge;
}

/**
 * Sidebar order is a product decision, not an implementation detail: US66 puts
 * the Overview first, ahead of F1–F5, because leadership should meet the big
 * picture before drilling into individual claims.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: HOME_HREF, label: strings.nav.overview, icon: LayoutDashboard },
  { href: "/claims", label: strings.nav.claims, icon: LayoutList },
  { href: "/policies", label: strings.nav.policies, icon: ShieldAlert },
  {
    href: "/alerts",
    label: strings.nav.alerts,
    icon: Bell,
    // US71 — threshold crossings since this user last opened the Alert page.
    badge: "alertCrossings",
  },
  { href: "/admin", label: strings.nav.admin, icon: Settings },
  {
    href: "/coordinated-network",
    label: strings.nav.coordinatedNetwork,
    icon: Network,
  },
];
