import { type ReactNode, useState } from "react";
import { navigate } from "../lib/router";
import { useStoredSession } from "../lib/session";

interface Props {
  children: ReactNode;
  currentPath: string;
}

const navItems = [
  { path: "/", label: "Home" },
  { path: "/services", label: "Services" },
  { path: "/about", label: "About" },
];

export function PublicLayout({ children, currentPath }: Props) {
  const session = useStoredSession();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNav(path: string) {
    if (path === "/about") {
      if (window.location.pathname !== "/") {
        navigate("/");
        window.setTimeout(() => {
          document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
        return;
      }
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    navigate(path);
  }

  return (
    <div className="ve-app-shell">
      <header className="ve-topbar">
        <div className="ve-topbar-inner">
          <button className="ve-wordmark" onClick={() => navigate("/")}>
            Brow Waxing and Threading Studio
          </button>
          <nav className="ve-nav ve-desktop-nav">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`ve-nav-link ${currentPath === item.path ? "is-active" : ""}`}
                onClick={() => handleNav(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="ve-topbar-actions">
            <button
              className="ve-button ve-button-secondary"
              onClick={() => navigate(session ? "/account/profile" : "/login")}
            >
              {session ? "My Account" : "Login"}
            </button>
            <button className="ve-button ve-button-primary" onClick={() => navigate("/book")}>
              Book Now
            </button>
            <button className="ve-mobile-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu">
              <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="ve-mobile-menu">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`ve-mobile-link ${currentPath === item.path ? "is-active" : ""}`}
                onClick={() => {
                  setMenuOpen(false);
                  handleNav(item.path);
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              className="ve-mobile-link"
              onClick={() => {
                setMenuOpen(false);
                navigate("/book");
              }}
            >
              Book Now
            </button>
            <button
              className="ve-mobile-link"
              onClick={() => {
                setMenuOpen(false);
                navigate(session ? "/account/profile" : "/login");
              }}
            >
              {session ? "My Account" : "Customer Login"}
            </button>
          </div>
        ) : null}
      </header>
      <main className="ve-main">{children}</main>
      <footer className="ve-footer">
        <div className="ve-footer-grid">
          <div>
            <p className="ve-footer-brand">Brow Waxing and Threading Studio</p>
            <p className="ve-footer-copy">
              Defining the standards of beauty through precision, artistry, and an editorial eye for detail.
            </p>
          </div>
          <div>
            <p className="ve-footer-heading">Studio Access</p>
            <div className="ve-footer-links">
              <button type="button">Instagram</button>
              <button type="button">Facebook</button>
              <button type="button">Contact Us</button>
            </div>
          </div>
          <div>
            <p className="ve-footer-heading">Legal</p>
            <div className="ve-footer-links">
              <button type="button">Privacy Policy</button>
              <button type="button">© 2024 Brow Waxing and Threading Studio. All rights reserved.</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
