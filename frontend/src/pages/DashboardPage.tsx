import { useMemo, useState } from "react";
import { Page } from "../components/common/Page";
import { getAttendanceReport, getReceiptHistory, getSalesSummary } from "../lib/api";
import { formatCurrency } from "../lib/currency";
import type { AttendanceReportItemResponse, ReceiptHistoryItemResponse, SalesSummaryResponse } from "../lib/types";

type Props = {
  token: string;
  role: string;
  selectedBranchId: number | null;
};

export function DashboardPage({ token, role, selectedBranchId }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [sales, setSales] = useState<SalesSummaryResponse | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<ReceiptHistoryItemResponse[]>([]);
  const [attendance, setAttendance] = useState<AttendanceReportItemResponse[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    if (selectedBranchId === null) {
      setError("Select a branch in the header before loading the dashboard.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const normalizedRole = role.trim().toUpperCase();
      const salesSummary = await getSalesSummary(token, from, to, selectedBranchId);
      setSales(salesSummary);

      if (normalizedRole === "OWNER") {
        setRecentReceipts([]);
        setAttendance([]);
        return;
      }

      const [receipts, attendanceSnapshot] = await Promise.all([
        getReceiptHistory(token, { from, to, branchId: selectedBranchId, page: 0, size: 5 }),
        getAttendanceReport(token, { from, to, branchId: selectedBranchId, page: 0, size: 5 }),
      ]);

      setRecentReceipts(receipts.items);
      setAttendance(attendanceSnapshot.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  const isOwner = role.trim().toUpperCase() === "OWNER";

  return (
    <Page title="Dashboard" subtitle="Daily snapshot of branch operations">
      <section className="st-dashboard-range">
        <div className="st-grid three">
          <label>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="st-actions">
          <button className="st-btn" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Dashboard"}
          </button>
        </div>
      </section>

      <section className="st-dashboard-kpi-grid">
        <article className="st-dashboard-kpi st-dashboard-kpi-primary">
          <p>Gross Sales</p>
          <h3>{sales ? formatCurrency(sales.grossSales) : "-"}</h3>
        </article>
        <article className="st-dashboard-kpi">
          <p>Net Sales</p>
          <h3>{sales ? formatCurrency(sales.netSales) : "-"}</h3>
        </article>
        <article className="st-dashboard-kpi">
          <p>Transaction Count</p>
          <h3>{sales ? sales.transactionCount : "-"}</h3>
        </article>
        <article className="st-dashboard-kpi">
          <p>Refund Total</p>
          <h3>{sales ? formatCurrency(sales.refundTotal) : "-"}</h3>
        </article>
      </section>

      {isOwner ? null : (
        <section className="st-dashboard-secondary-grid">
          <article className="st-card">
            <h3>Attendance</h3>
            <div className="st-dashboard-attendance-row">
              <strong>{attendance.length}</strong>
              <span>Staff Clocked In</span>
            </div>
            <button className="st-dashboard-quick-btn" type="button">
              Attendance Kiosk
            </button>
          </article>

          <article className="st-card">
            <h3>Recent Receipts</h3>
            <div className="st-table-wrap">
              <table className="st-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No receipts loaded.</td>
                    </tr>
                  ) : (
                    recentReceipts.map((item) => (
                      <tr key={item.receiptNo}>
                        <td>{item.receiptNo}</td>
                        <td>{new Date(item.generatedAt).toLocaleString()}</td>
                        <td>{item.transactionStatus}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {error ? <p className="st-error">{error}</p> : null}
    </Page>
  );
}
