import { useEffect, useMemo, useState } from "react";
import { getCustomerMe, listCustomerVouchers, listVoucherCatalog, redeemVoucher } from "../lib/api";
import { formatCurrency, formatDate, formatPoints, formatStatus } from "../lib/format";
import { useStoredSession } from "../lib/session";
import type { CustomerProfile, CustomerVoucher, VoucherCatalogItem } from "../lib/types";

export function VouchersPage() {
  const session = useStoredSession();
  const [customer, setCustomer] = useState<CustomerProfile | null>(session?.customer ?? null);
  const [vouchers, setVouchers] = useState<CustomerVoucher[]>([]);
  const [catalog, setCatalog] = useState<VoucherCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    setCatalogError("");
    try {
      const customerPromise = getCustomerMe();
      const voucherPromise = listCustomerVouchers();
      const catalogPromise = listVoucherCatalog().catch((err) => {
        setCatalogError(err instanceof Error ? err.message : "Voucher catalog is not available yet.");
        return [];
      });
      const [customerData, voucherData, catalogData] = await Promise.all([customerPromise, voucherPromise, catalogPromise]);
      setCustomer(customerData);
      setVouchers(voucherData);
      setCatalog(catalogData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load vouchers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (session?.customer) {
      setCustomer(session.customer);
    }
  }, [session?.customer]);

  const ownedVouchers = useMemo(
    () =>
      [...vouchers].sort((left, right) => {
        const availabilityDelta = getVoucherStatusRank(left.status) - getVoucherStatusRank(right.status);
        if (availabilityDelta !== 0) {
          return availabilityDelta;
        }
        return new Date(right.redeemedAt).getTime() - new Date(left.redeemedAt).getTime();
      }),
    [vouchers]
  );
  const availableCount = useMemo(
    () => vouchers.filter((voucher) => voucher.status === "AVAILABLE").length,
    [vouchers]
  );

  async function handleRedeem(catalogId: number) {
    setRedeemingId(catalogId);
    setError("");
    setNotice("");
    try {
      await redeemVoucher(catalogId);
      setNotice("Voucher redeemed.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to redeem voucher");
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <section className="ve-account-section">
      <div className="ve-section-head">
        <div>
          <p className="ve-eyebrow">Rewards</p>
          <h1 className="ve-display-md">Your available vouchers and redeemable catalog in one place.</h1>
        </div>
      </div>

      <div className="ve-panel ve-panel-elevated ve-balance-strip">
        <div>
          <p className="ve-eyebrow">Points Balance</p>
          <h2 className="ve-display-sm">{formatPoints(customer?.pointsBalance)}</h2>
          <p className="ve-panel-copy">Redeem your points for customer rewards and keep them in your wallet.</p>
        </div>
        <div className="ve-summary-stack">
          <div>
            <span>Available vouchers</span>
            <strong>{availableCount}</strong>
          </div>
          <div>
            <span>Catalog rewards</span>
            <strong>{catalog.length}</strong>
          </div>
        </div>
      </div>

      {notice ? <div className="ve-inline-note ve-inline-note-success">{notice}</div> : null}
      {error ? <div className="ve-inline-note ve-inline-note-error">{error}</div> : null}
      {catalogError ? <div className="ve-inline-note ve-inline-note-warning">{catalogError}</div> : null}

      <section className="ve-stack-lg">
        <div className="ve-subhead">
          <h2 className="ve-display-sm">Owned vouchers</h2>
        </div>
        {loading ? (
          <div className="ve-card-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="ve-panel ve-skeleton-card" />
            ))}
          </div>
        ) : ownedVouchers.length === 0 ? (
          <div className="ve-panel ve-panel-muted">
            <p className="ve-panel-title">No vouchers yet</p>
            <p className="ve-panel-copy">Rewards you redeem will appear here once they are issued to your customer wallet.</p>
          </div>
        ) : (
          <div className="ve-card-grid">
            {ownedVouchers.map((voucher) => (
              <article key={voucher.id} className="ve-panel ve-panel-elevated">
                <p className="ve-card-kicker">{voucher.code}</p>
                <h3 className="ve-card-title">{voucher.name}</h3>
                <p className="ve-card-copy">{voucher.serviceName || voucher.voucherType}</p>
                <div className="ve-chip-row">
                  <span className="ve-chip">{formatStatus(voucher.status)}</span>
                  {voucher.discountValue ? <span className="ve-chip ve-chip-muted">{formatCurrency(voucher.discountValue)}</span> : null}
                  {voucher.expiresAt ? <span className="ve-chip ve-chip-muted">Expires {formatDate(voucher.expiresAt)}</span> : null}
                </div>
                <p className="ve-panel-copy">
                  Redeemed {formatDate(voucher.redeemedAt)}
                  {voucher.usedAt ? ` • Used ${formatDate(voucher.usedAt)}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="ve-stack-lg">
        <div className="ve-subhead">
          <h2 className="ve-display-sm">Redeem points</h2>
        </div>
        {catalog.length === 0 ? (
          <div className="ve-panel ve-panel-muted">
            <p className="ve-panel-title">Redeemable catalog pending</p>
            <p className="ve-panel-copy">This section will activate once `GET /api/customer/me/voucher-catalog` is available.</p>
          </div>
        ) : (
          <div className="ve-card-grid">
            {catalog.map((item) => (
              <article key={item.catalogId} className="ve-panel ve-panel-elevated">
                <p className="ve-card-kicker">{item.code || item.voucherType}</p>
                <h3 className="ve-card-title">{item.name}</h3>
                <p className="ve-card-copy">{item.description || item.serviceName || item.branchName || "Salon reward"}</p>
                <div className="ve-chip-row">
                  <span className="ve-chip">{formatPoints(item.pointsCost)}</span>
                  {item.discountValue ? <span className="ve-chip ve-chip-muted">{formatCurrency(item.discountValue)}</span> : null}
                  {item.validTo ? <span className="ve-chip ve-chip-muted">Valid until {formatDate(item.validTo)}</span> : null}
                </div>
                {!item.redeemable && item.redemptionBlockedReason ? (
                  <p className="ve-panel-copy">{item.redemptionBlockedReason}</p>
                ) : null}
                <button
                  className="ve-button ve-button-primary ve-button-block"
                  onClick={() => void handleRedeem(item.catalogId)}
                  disabled={redeemingId === item.catalogId || !item.redeemable}
                >
                  {redeemingId === item.catalogId ? "Redeeming..." : item.redeemable ? "Redeem" : "Unavailable"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function getVoucherStatusRank(status: string) {
  switch (status) {
    case "AVAILABLE":
      return 0;
    case "USED":
      return 1;
    case "EXPIRED":
      return 2;
    default:
      return 3;
  }
}
