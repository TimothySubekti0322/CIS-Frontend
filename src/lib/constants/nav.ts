import {
  Bell,
  LayoutList,
  Network,
  Settings,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { strings } from "./strings";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** F-code from the PRD, shown as a small badge in the sidebar. */
  code: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/claims", label: strings.nav.claims, icon: LayoutList, code: "F1" },
  { href: "/policies", label: strings.nav.policies, icon: ShieldAlert, code: "F2" },
  { href: "/alerts", label: strings.nav.alerts, icon: Bell, code: "F3" },
  { href: "/admin", label: strings.nav.admin, icon: Settings, code: "F4" },
  {
    href: "/coordinated-network",
    label: strings.nav.coordinatedNetwork,
    icon: Network,
    code: "F5",
  },
];
