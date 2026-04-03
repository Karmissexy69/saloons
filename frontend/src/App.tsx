import { useEffect, useState } from "react";
import { AppShell, NAV_ORDER, type NavKey } from "./layouts/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AttendanceKioskPage } from "./pages/AttendanceKioskPage";
import { AttendanceLogsPage } from "./pages/AttendanceLogsPage";
import { StaffManagementPage } from "./pages/StaffManagementPage";
import { ServiceCatalogPage } from "./pages/ServiceCatalogPage";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { PosTerminalPage } from "./pages/PosTerminalPage";
import { ReceiptsPage } from "./pages/ReceiptsPage";
import { RefundsPage } from "./pages/RefundsPage";
import { CommissionPage } from "./pages/CommissionPage";
import { SalesReportPage } from "./pages/SalesReportPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import type { AuthLoginResponse } from "./lib/types";
import { getAllowedNavKeysForRole, isNavAllowedForRole } from "./lib/permissions";

const TOKEN_KEY = "browpos_token";
const USERNAME_KEY = "browpos_username";
const ROLE_KEY = "browpos_role";

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
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavKey>(DEFAULT_TAB);
  const isAuthenticated = !!token && !!username && !!role;

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

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AppShell username={username} role={role} active={activeTab} onNavigate={handleNavigate} onLogout={handleLogout}>
      {activeTab === "dashboard" ? <DashboardPage token={token} role={role} /> : null}
      {activeTab === "attendance-kiosk" ? <AttendanceKioskPage token={token} /> : null}
      {activeTab === "attendance-logs" ? <AttendanceLogsPage token={token} /> : null}
      {activeTab === "staff" ? <StaffManagementPage token={token} /> : null}
      {activeTab === "services" ? <ServiceCatalogPage token={token} /> : null}
      {activeTab === "appointments" ? <AppointmentsPage token={token} /> : null}
      {activeTab === "pos-terminal" ? <PosTerminalPage token={token} /> : null}
      {activeTab === "receipts" ? <ReceiptsPage token={token} /> : null}
      {activeTab === "refunds" ? <RefundsPage token={token} /> : null}
      {activeTab === "commission" ? <CommissionPage token={token} /> : null}
      {activeTab === "sales" ? <SalesReportPage token={token} /> : null}
      {activeTab === "audit-logs" ? <AuditLogsPage token={token} /> : null}
    </AppShell>
  );
}
