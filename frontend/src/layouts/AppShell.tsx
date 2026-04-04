import type { ReactNode } from "react";
import { getAllowedNavKeysForRole } from "../lib/permissions";
import type { BranchResponse } from "../lib/types";

export type NavKey =
  | "dashboard"
  | "attendance-kiosk"
  | "attendance-logs"
  | "staff"
  | "services"
  | "settings"
  | "loyalty"
  | "appointments"
  | "pos-terminal"
  | "receipts"
  | "refunds"
  | "commission"
  | "sales"
  | "audit-logs";

type NavItem = {
  key: NavKey;
  label: string;
  icon: string;
  group: "ops" | "commerce" | "management";
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", group: "ops" },
  { key: "attendance-kiosk", label: "Attendance Kiosk", icon: "fingerprint", group: "ops" },
  { key: "attendance-logs", label: "Attendance Logs", icon: "history", group: "ops" },
  { key: "staff", label: "Staff", icon: "group", group: "ops" },
  { key: "services", label: "Services", icon: "content_cut", group: "ops" },
  { key: "settings", label: "Settings", icon: "settings", group: "management" },
  { key: "loyalty", label: "Loyalty", icon: "loyalty", group: "management" },
  { key: "appointments", label: "Appointments", icon: "calendar_today", group: "ops" },
  { key: "pos-terminal", label: "POS Terminal", icon: "point_of_sale", group: "commerce" },
  { key: "receipts", label: "Receipts", icon: "receipt_long", group: "commerce" },
  { key: "refunds", label: "Refunds", icon: "undo", group: "commerce" },
  { key: "commission", label: "Commission", icon: "payments", group: "management" },
  { key: "sales", label: "Sales Report", icon: "bar_chart", group: "management" },
  { key: "audit-logs", label: "Audit Logs", icon: "assignment", group: "management" },
];

export const NAV_ORDER: NavKey[] = NAV_ITEMS.map((item) => item.key);

const GROUP_LABELS: Record<NavItem["group"], string> = {
  ops: "Operations",
  commerce: "Commerce",
  management: "Management",
};

type Props = {
  username: string;
  role: string;
  active: NavKey;
  branches: BranchResponse[];
  selectedBranchId: number | null;
  branchError: string;
  onBranchChange: (branchId: number) => void;
  onNavigate: (key: NavKey) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({
  username,
  role,
  active,
  branches,
  selectedBranchId,
  branchError,
  onBranchChange,
  onNavigate,
  onLogout,
  children,
}: Props) {
  const allowedKeys = getAllowedNavKeysForRole(role, NAV_ORDER);
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? null;
  const branchSelectValue = selectedBranchId === null ? "" : String(selectedBranchId);
  const branchStatusLabel = selectedBranch?.active ? "Open" : "Inactive";

  return (
    <div className="st-app">
      <aside className="st-sidebar">
        <div className="st-brand">
          <div className="st-brand-icon">B</div>
          <div>
            <h1>BrowPOS</h1>
            <p>Internal Ops</p>
          </div>
        </div>

        <nav className="st-nav">
          {(["ops", "commerce", "management"] as const).map((group) => (
            <div key={group} className="st-nav-group">
              <p className="st-nav-group-title">{GROUP_LABELS[group]}</p>
              {NAV_ITEMS.filter((item) => item.group === group && allowedKeys.includes(item.key)).map((item) => {
                const selected = item.key === active;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={selected ? "st-nav-item active" : "st-nav-item"}
                    onClick={() => onNavigate(item.key)}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="st-user-box">
          <p>{username}</p>
          <small>{role}</small>
          <button type="button" className="st-btn st-btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <header className="st-topbar">
        <div className="st-topbar-left">
          <div className="st-topbar-branch-picker">
            <span className="material-symbols-outlined" aria-hidden="true">
              storefront
            </span>
            <select
              aria-label="Current branch"
              className="st-topbar-branch-select"
              value={branchSelectValue}
              onChange={(event) => {
                const nextBranchId = Number(event.target.value);
                if (Number.isFinite(nextBranchId) && nextBranchId > 0) {
                  onBranchChange(nextBranchId);
                }
              }}
              disabled={branches.length === 0}
            >
              {branches.length === 0 ? (
                <option value="">{branchError || "No branches available"}</option>
              ) : null}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          {selectedBranch ? (
            <span className={selectedBranch.active ? "st-topbar-pill" : "st-topbar-pill st-topbar-pill-muted"}>
              {branchStatusLabel}
            </span>
          ) : null}
        </div>
        <div className="st-topbar-right">
          <div className="st-topbar-search">
            <span className="material-symbols-outlined">search</span>
            <input placeholder="Search transactions, staff, receipts..." />
          </div>
          <button type="button" className="st-icon-btn" aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button type="button" className="st-icon-btn" aria-label="Help">
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>
      </header>

      <main className="st-main">
        <div className="st-main-inner">{children}</div>
      </main>
    </div>
  );
}
