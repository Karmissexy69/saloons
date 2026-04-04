import { useEffect, useMemo, useState } from "react";
import { getCustomerMe } from "./lib/api";
import { getCurrentLocation, installRouteListener, navigate, readSearchParam, subscribeRoute } from "./lib/router";
import { getPendingOtpEmail, useStoredSession } from "./lib/session";
import { AccountLayout } from "./components/AccountLayout";
import { PublicLayout } from "./components/PublicLayout";
import { LandingPage } from "./pages/LandingPage";
import { ServicesPage } from "./pages/ServicesPage";
import { LoginPage } from "./pages/LoginPage";
import { VerifyPage } from "./pages/VerifyPage";
import { BookingPage } from "./pages/BookingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { PointsPage } from "./pages/PointsPage";
import { VouchersPage } from "./pages/VouchersPage";
import { VoucherHistoryPage } from "./pages/VoucherHistoryPage";

function useLocationState() {
  const [location, setLocation] = useState(() => getCurrentLocation());

  useEffect(() => {
    const uninstallPopState = installRouteListener();
    const unsubscribe = subscribeRoute(() => setLocation(getCurrentLocation()));
    return () => {
      unsubscribe();
      uninstallPopState();
    };
  }, []);

  return location;
}

export default function App() {
  const session = useStoredSession();
  const location = useLocationState();
  const pathname = window.location.pathname;
  const search = window.location.search;

  useEffect(() => {
    if (!session) {
      return;
    }
    void getCustomerMe().catch(() => {
      // Auth recovery is handled inside the API layer.
    });
  }, [session?.refreshToken]);

  useEffect(() => {
    const isAccountPath = pathname.startsWith("/account");
    if (isAccountPath && !session) {
      navigate(`/login?next=${encodeURIComponent(`${pathname}${search}`)}`, true);
    }
  }, [pathname, search, session]);

  const nextTarget = useMemo(() => readSearchParam("next") || "/account/profile", [location]);
  const pendingEmail = readSearchParam("email") || getPendingOtpEmail();

  if (pathname.startsWith("/account")) {
    if (!session) {
      return null;
    }

    return (
      <AccountLayout activePath={pathname}>
        {pathname === "/account/profile" ? <ProfilePage /> : null}
        {pathname === "/account/appointments" ? <AppointmentsPage /> : null}
        {pathname === "/account/points" ? <PointsPage /> : null}
        {pathname === "/account/vouchers" ? <VouchersPage /> : null}
        {pathname === "/account/vouchers/history" ? <VoucherHistoryPage /> : null}
      </AccountLayout>
    );
  }

  return (
    <PublicLayout currentPath={pathname}>
      {pathname === "/" ? <LandingPage /> : null}
      {pathname === "/services" ? <ServicesPage /> : null}
      {pathname === "/book" ? <BookingPage /> : null}
      {pathname === "/login" ? <LoginPage nextTarget={nextTarget} /> : null}
      {pathname === "/verify" ? <VerifyPage pendingEmail={pendingEmail} nextTarget={nextTarget} /> : null}
      {pathname !== "/" &&
      pathname !== "/services" &&
      pathname !== "/book" &&
      pathname !== "/login" &&
      pathname !== "/verify" ? (
        <section className="ve-section ve-empty-page">
          <div className="ve-panel ve-panel-elevated">
            <p className="ve-eyebrow">Page Not Found</p>
            <h1 className="ve-display-sm">This route is not part of the customer app.</h1>
            <p className="ve-supporting-copy">Use the customer navigation to continue through the public site or your account.</p>
          </div>
        </section>
      ) : null}
    </PublicLayout>
  );
}
