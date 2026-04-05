import { useEffect, useState } from "react";
import { AppShell, NAV_ORDER, type NavKey } from "./layouts/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AttendanceKioskPage } from "./pages/AttendanceKioskPage";
import { AttendanceLogsPage } from "./pages/AttendanceLogsPage";
import { StaffManagementPage } from "./pages/StaffManagementPage";
import { ServiceCatalogPage } from "./pages/ServiceCatalogPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoyaltyVouchersPage } from "./pages/LoyaltyVouchersPage";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { PosTerminalPage } from "./pages/PosTerminalPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { RefundsPage } from "./pages/RefundsPage";
import { CommissionPage } from "./pages/CommissionPage";
import { SalesReportPage } from "./pages/SalesReportPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { listBranches } from "./lib/api";
import type { AppointmentCheckoutDraft, AuthLoginResponse, BranchResponse } from "./lib/types";
import { getAllowedNavKeysForRole, isNavAllowedForRole } from "./lib/permissions";

const TOKEN_KEY = "browpos_token";
const USERNAME_KEY = "browpos_username";
const ROLE_KEY = "browpos_role";
const BRANCH_ID_KEY = "browpos_branch_id";

const DEFAULT_TAB: NavKey = "dashboard";
const LOGIN_PATH = "/login";

function parsePathToNavKey(pathname: string): NavKey {
  const normalized = pathname.replace(/^\/+/, "").trim() as NavKey;
  const allowed: NavKey[] = [
    "dashboard",
    "attendance-kiosk",
    "attendance-logs",
    "staff",
    "services",
    "settings",
    "loyalty",
    "appointments",
    "pos-terminal",
    "receipts",
    "refunds",
    "commission",
    "sales",
    "audit-logs",
  ];

  return allowed.includes(normalized) ? normalized : DEFAULT_TAB;
}

function setPath(path: string) {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath !== path) {
    window.history.pushState({}, "", path);
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavKey>(DEFAULT_TAB);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [branchError, setBranchError] = useState("");
  const [branchReloadToken, setBranchReloadToken] = useState(0);
  const [appointmentCheckoutDraft, setAppointmentCheckoutDraft] = useState<AppointmentCheckoutDraft | null>(null);
  const isAuthenticated = !!token && !!username && !!role;
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) ?? null;

  function resolveAllowedTab(current: NavKey, roleName: string): NavKey {
    const allowed = getAllowedNavKeysForRole(roleName, NAV_ORDER);
    if (allowed.length === 0) {
      return "attendance-kiosk";
    }
    return allowed.includes(current) ? current : allowed[0];
  }

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUsername = localStorage.getItem(USERNAME_KEY);
    const storedRole = localStorage.getItem(ROLE_KEY);

    setToken(storedToken);
    setUsername(storedUsername);
    setRole(storedRole);

    const authenticated = !!storedToken && !!storedUsername && !!storedRole;
    const fromPath = parsePathToNavKey(window.location.pathname);

    if (authenticated && storedRole) {
      const allowedTab = resolveAllowedTab(fromPath, storedRole);
      setActiveTab(allowedTab);
      if (window.location.pathname === "/" || window.location.pathname === LOGIN_PATH) {
        setPath(`/${allowedTab}`);
      }
    } else {
      setActiveTab(DEFAULT_TAB);
      if (window.location.pathname !== LOGIN_PATH) {
        setPath(LOGIN_PATH);
      }
    }

    function onPopState() {
      setActiveTab(parsePathToNavKey(window.location.pathname));
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function handleLogin(response: AuthLoginResponse) {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USERNAME_KEY, response.username);
    localStorage.setItem(ROLE_KEY, response.role);

    setToken(response.accessToken);
    setUsername(response.username);
    setRole(response.role);

    const allowedTab = resolveAllowedTab(DEFAULT_TAB, response.role);
    setActiveTab(allowedTab);
    setPath(`/${allowedTab}`);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(ROLE_KEY);

    setToken(null);
    setUsername(null);
    setRole(null);
  }

  function handleNavigate(tab: NavKey) {
    if (role && !isNavAllowedForRole(tab, role)) {
      return;
    }
    setActiveTab(tab);
    setPath(`/${tab}`);
  }

  function handleOpenReceipt(receiptNo: string) {
    setActiveTab("receipts");
    setPath(`/receipts?receiptNo=${encodeURIComponent(receiptNo)}`);
  }

  function handleStartAppointmentCheckout(draft: AppointmentCheckoutDraft) {
    setAppointmentCheckoutDraft(draft);
    setActiveTab("pos-terminal");
    setPath("/pos-terminal");
  }

  useEffect(() => {
    if (!isAuthenticated && window.location.pathname !== LOGIN_PATH) {
      setPath(LOGIN_PATH);
    }
    if (isAuthenticated && role) {
      const allowedTab = resolveAllowedTab(activeTab, role);
      if (allowedTab !== activeTab) {
        setActiveTab(allowedTab);
        setPath(`/${allowedTab}`);
        return;
      }
      if (window.location.pathname === LOGIN_PATH) {
        setPath(`/${allowedTab}`);
      }
    }
  }, [isAuthenticated, activeTab, role]);

  useEffect(() => {
    if (!token) {
      setBranches([]);
      setSelectedBranchId(null);
      setBranchError("");
      return;
    }

    let cancelled = false;

    async function loadBranches() {
      setBranchError("");
      try {
        const data = await listBranches(token);
        if (cancelled) {
          return;
        }

        setBranches(data);
        if (data.length === 0) {
          setSelectedBranchId(null);
          localStorage.removeItem(BRANCH_ID_KEY);
          return;
        }

        const storedBranchId = Number(localStorage.getItem(BRANCH_ID_KEY));
        const fallbackBranch =
          data.find((branch) => branch.id === storedBranchId) ?? data.find((branch) => branch.active) ?? data[0];

        setSelectedBranchId(fallbackBranch.id);
        localStorage.setItem(BRANCH_ID_KEY, String(fallbackBranch.id));
      } catch (err) {
        if (cancelled) {
          return;
        }
        setBranches([]);
        setSelectedBranchId(null);
        setBranchError(err instanceof Error ? err.message : "Failed to load branches");
      }
    }

    void loadBranches();

    return () => {
      cancelled = true;
    };
  }, [token, branchReloadToken]);

  function handleBranchChange(branchId: number) {
    setSelectedBranchId(branchId);
    localStorage.setItem(BRANCH_ID_KEY, String(branchId));
  }

  function handleBranchesChanged() {
    setBranchReloadToken((current) => current + 1);
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AppShell
      username={username}
      role={role}
      active={activeTab}
      branches={branches}
      selectedBranchId={selectedBranchId}
      branchError={branchError}
      onBranchChange={handleBranchChange}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {activeTab === "dashboard" ? <DashboardPage token={token} role={role} selectedBranchId={selectedBranchId} /> : null}
      {activeTab === "attendance-kiosk" ? (
        <AttendanceKioskPage token={token} selectedBranchId={selectedBranchId} selectedBranchName={selectedBranch?.name ?? ""} />
      ) : null}
      {activeTab === "attendance-logs" ? (
        <AttendanceLogsPage token={token} selectedBranchId={selectedBranchId} selectedBranchName={selectedBranch?.name ?? ""} />
      ) : null}
      {activeTab === "staff" ? <StaffManagementPage token={token} /> : null}
      {activeTab === "services" ? <ServiceCatalogPage token={token} /> : null}
      {activeTab === "settings" ? (
        <SettingsPage token={token} branches={branches} onBranchesChanged={handleBranchesChanged} />
      ) : null}
      {activeTab === "loyalty" ? (
        <LoyaltyVouchersPage token={token} branches={branches} />
      ) : null}
      {activeTab === "appointments" ? (
        <AppointmentsPage
          token={token}
          selectedBranchId={selectedBranchId}
          selectedBranchName={selectedBranch?.name ?? ""}
          selectedBranchOpeningTime={selectedBranch?.openingTime ?? null}
          selectedBranchClosingTime={selectedBranch?.closingTime ?? null}
          canStartCheckout={isNavAllowedForRole("pos-terminal", role)}
          onStartCheckout={handleStartAppointmentCheckout}
          onViewReceipt={handleOpenReceipt}
        />
      ) : null}
      {activeTab === "pos-terminal" ? (
        <PosTerminalPage
          token={token}
          selectedBranchId={selectedBranchId}
          onViewReceipt={handleOpenReceipt}
          appointmentCheckoutDraft={appointmentCheckoutDraft}
          onAppointmentCheckoutDraftConsumed={() => setAppointmentCheckoutDraft(null)}
        />
      ) : null}
      {activeTab === "receipts" ? (
        <ReceiptsPage token={token} selectedBranchId={selectedBranchId} selectedBranchName={selectedBranch?.name ?? ""} />
      ) : null}
      {activeTab === "refunds" ? <RefundsPage token={token} /> : null}
      {activeTab === "commission" ? <CommissionPage token={token} /> : null}
      {activeTab === "sales" ? <SalesReportPage token={token} selectedBranchId={selectedBranchId} /> : null}
      {activeTab === "audit-logs" ? <AuditLogsPage token={token} /> : null}
    </AppShell>
  );
}
