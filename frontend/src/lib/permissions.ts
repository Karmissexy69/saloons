import type { NavKey } from "../layouts/AppShell";

type Role =
  | "OWNER"
  | "IT_ADMIN"
  | "TERMINAL";

const NAV_ROLE_MAP: Record<NavKey, Role[]> = {
  dashboard: ["OWNER"],
  "attendance-kiosk": ["TERMINAL"],
  "attendance-logs": ["OWNER"],
  staff: ["IT_ADMIN"],
  services: ["IT_ADMIN"],
  settings: ["IT_ADMIN"],
  appointments: ["TERMINAL"],
  "pos-terminal": ["TERMINAL"],
  receipts: ["TERMINAL"],
  refunds: ["IT_ADMIN"],
  commission: ["OWNER"],
  sales: ["OWNER"],
  "audit-logs": ["OWNER"],
};

export function isNavAllowedForRole(nav: NavKey, role: string): boolean {
  const normalizedRole = role.trim().toUpperCase() as Role;
  if (normalizedRole === "IT_ADMIN") {
    return true;
  }
  const allowed = NAV_ROLE_MAP[nav];
  return allowed.includes(normalizedRole);
}

export function getAllowedNavKeysForRole(role: string, order: NavKey[]): NavKey[] {
  return order.filter((key) => isNavAllowedForRole(key, role));
}
