import type { ReactNode } from "react";
import { logoutCustomer } from "../lib/api";
import { formatPoints } from "../lib/format";
import { navigate } from "../lib/router";
import { useStoredSession } from "../lib/session";

interface Props {
  activePath: string;
  children: ReactNode;
}

const accountLinks = [
  { path: "/account/profile", label: "Profile", icon: "person" },
  { path: "/account/appointments", label: "Appointments", icon: "event" },
  { path: "/account/points", label: "My Points", icon: "stars" },
  { path: "/account/vouchers", label: "Rewards", icon: "confirmation_number" },
  { path: "/account/vouchers/history", label: "History", icon: "history" },
];

export function AccountLayout({ activePath, children }: Props) {
  const session = useStoredSession();
  const customer = session?.customer;
  const firstName = customer?.name?.split(" ")[0] ?? "Guest";

  async function handleLogout() {
    await logoutCustomer();
    navigate("/", true);
  }

  return (
    <div className="ve-account-shell">
      <aside className="ve-account-sidebar">
        <button className="ve-wordmark ve-sidebar-brand" onClick={() => navigate("/")}>
          Brow Waxing and Threading Studio
        </button>
        <div className="ve-account-identity">
          <div className="ve-avatar">{firstName.slice(0, 1).toUpperCase()}</div>
          <div>
            <p className="ve-account-name">{customer?.name ?? "Customer"}</p>
            <p className="ve-account-meta">{formatPoints(customer?.pointsBalance)}</p>
          </div>
        </div>
        <nav className="ve-account-nav">
          {accountLinks.map((item) => (
            <button
              key={item.path}
              className={`ve-account-link ${activePath === item.path ? "is-active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="ve-account-sidebar-actions">
          <button className="ve-button ve-button-primary ve-button-block" onClick={() => navigate("/book")}>
            Book New Session
          </button>
          <button className="ve-button ve-button-ghost ve-button-block" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>
      <div className="ve-account-content">
        <div className="ve-account-mobilebar">
          <button className="ve-wordmark" onClick={() => navigate("/")}>
            Brow Waxing and Threading Studio
          </button>
          <button className="ve-button ve-button-secondary" onClick={() => navigate("/book")}>
            Book
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
