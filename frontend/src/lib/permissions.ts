import type { NavKey } from "../layouts/AppShell";

type Role =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "CASHIER"
  | "STYLIST"
  | "IT_ADMIN"
  | "ATTENDANCE_TERMINAL";

const NAV_ROLE_MAP: Record<NavKey, Role[]> = {
  dashboard: ["OWNER", "ADMIN", "MANAGER"],
  "attendance-kiosk": ["ADMIN", "MANAGER", "CASHIER", "STYLIST", "ATTENDANCE_TERMINAL"],
  "attendance-logs": ["OWNER", "ADMIN", "MANAGER", "CASHIER", "STYLIST", "ATTENDANCE_TERMINAL"],
  staff: ["ADMIN", "MANAGER", "CASHIER", "IT_ADMIN"],
  services: ["ADMIN", "MANAGER", "CASHIER"],
  appointments: ["ADMIN", "MANAGER", "CASHIER", "STYLIST"],
  "pos-terminal": ["ADMIN", "MANAGER", "CASHIER"],
  receipts: ["ADMIN", "MANAGER", "CASHIER"],
  refunds: ["ADMIN", "MANAGER"],
  commission: ["OWNER", "ADMIN", "MANAGER", "STYLIST"],
  sales: ["OWNER", "ADMIN", "MANAGER"],
  "audit-logs": ["OWNER", "ADMIN", "MANAGER"],
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
