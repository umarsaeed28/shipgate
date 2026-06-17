import type { Capability } from "@qa/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** If set, the item is only shown to roles with this capability. */
  requires?: Capability;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/coverage", label: "Coverage", icon: "▣" },
  { href: "/tests", label: "Tests", icon: "✓" },
  { href: "/failures", label: "Failures", icon: "⚠" },
  { href: "/trends", label: "Trends", icon: "📈" },
  { href: "/review", label: "Review", icon: "👁", requires: "reviewScenarios" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];
