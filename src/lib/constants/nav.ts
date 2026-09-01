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
  /** F-code from the PRD, shown as a small badge in the sidebar. */
  code: string;
  /** Present only where a counter is defined; see `Sidebar`. */
  badge?: NavBadge;
}

/**
 * Sidebar order is a product decision, not an implementation detail: US66 puts
 * the Overview first, ahead of F1–F5, because leadership should meet the big
 * picture before drilling into individual claims.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: HOME_HREF,
    label: strings.nav.overview,
    icon: LayoutDashboard,
    code: "F6",
  },
  { href: "/claims", label: strings.nav.claims, icon: LayoutList, code: "F1" },
  { href: "/policies", label: strings.nav.policies, icon: ShieldAlert, code: "F2" },
  {
    href: "/alerts",
    label: strings.nav.alerts,
    icon: Bell,
    code: "F3",
    // US71 — threshold crossings since this user last opened F3.
    badge: "alertCrossings",
  },
  { href: "/admin", label: strings.nav.admin, icon: Settings, code: "F4" },
  {
    href: "/coordinated-network",
    label: strings.nav.coordinatedNetwork,
    icon: Network,
    code: "F5",
  },
];
