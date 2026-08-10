/**
 * lib/navigation.ts
 * Single source of truth for all navigation items in Aegis.
 *
 * Both the top Navbar and the left Sidebar import from here so link targets,
 * labels, and icons can never drift apart between the two components.
 *
 * topNav: true  → item appears in the top Navbar (landing + demo pages)
 * topNav: false → sidebar-only item (app-internal pages)
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Activity,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  /** Lucide icon — used by the Sidebar; Navbar renders text-only links. */
  icon: LucideIcon;
  /** When true, this item is also rendered in the top Navbar. */
  topNav: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard, topNav: true  },
  { label: "Demo",         href: "/demo",         icon: Activity,        topNav: true  },
  { label: "Logs",         href: "/logs",         icon: FileText,        topNav: false },
  { label: "Analytics",    href: "/analytics",    icon: BarChart3,       topNav: false },
  { label: "Settings",     href: "/settings",     icon: Settings,        topNav: false },
];

/**
 * Subset shown in the top Navbar.
 * Matches the original four visible items: Dashboard, Demo, Architecture, Docs.
 * Docs href is now correctly "/docs" (was "#" in the old inline list).
 */
export const TOP_NAV_ITEMS = NAV_ITEMS.filter((item) => item.topNav);
