import { useEffect, useMemo, useState } from "react";
import { listCustomerVouchers } from "../lib/api";
import { formatCurrency, formatDate, formatStatus } from "../lib/format";
import type { CustomerVoucher } from "../lib/types";

export function VoucherHistoryPage() {
  const [vouchers, setVouchers] = useState<CustomerVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await listCustomerVouchers();
        if (!cancelled) {
          setVouchers(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load voucher history");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const history = useMemo(
    () => vouchers.filter((voucher) => voucher.status !== "AVAILABLE" || !!voucher.usedAt),
    [vouchers]
  );

  return (
    <section className="ve-account-section">
      <div className="ve-section-head">
        <div>
          <p className="ve-eyebrow">Voucher History</p>
          <h1 className="ve-display-md">Track redeemed, used, expired, and closed rewards.</h1>
        </div>
      </div>

      {error ? <div className="ve-inline-note ve-inline-note-error">{error}</div> : null}

      {loading ? (
        <div className="ve-list">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ve-list-row ve-skeleton-card" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="ve-panel ve-panel-muted">
          <p className="ve-panel-title">No voucher history yet</p>
        </div>
      ) : (
        <div className="ve-list">
          {history.map((voucher) => (
            <article key={voucher.id} className="ve-list-row">
              <div>
                <strong>{voucher.name}</strong>
                <p>{voucher.code}</p>
              </div>
              <div className="ve-list-row-side">
                <span className="ve-chip">{formatStatus(voucher.status)}</span>
                <span>{voucher.discountValue ? formatCurrency(voucher.discountValue) : voucher.voucherType}</span>
                <span>{voucher.usedAt ? formatDate(voucher.usedAt) : formatDate(voucher.redeemedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
