import { useMemo, useState } from "react";
import { Page } from "../components/common/Page";
import { exportReceiptHistoryCsv, getReceipt, getReceiptHistory } from "../lib/api";
import type { ReceiptHistoryItemResponse, TransactionStatus } from "../lib/types";

type Props = { token: string };

type ReceiptPayload = {
  branchId?: number;
  cashierId?: number;
  soldAt?: string;
  receiptNo?: string;
  subtotal?: number;
  discountTotal?: number;
  total?: number;
  payments?: Array<{ method?: string; amount?: number; referenceNo?: string }>;
  items?: Array<{ serviceName?: string; qty?: number; unitPrice?: number; discountAmount?: number }>;
};

const STATUSES: Array<TransactionStatus | "ALL"> = ["ALL", "PAID", "REFUNDED", "VOIDED"];

function parseReceiptPayload(raw: string): ReceiptPayload | null {
  try {
    return JSON.parse(raw) as ReceiptPayload;
  } catch {
    return null;
  }
}

export function ReceiptsPage({ token }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [receiptNo, setReceiptNo] = useState("");
  const [status, setStatus] = useState<"ALL" | TransactionStatus>("ALL");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [history, setHistory] = useState<ReceiptHistoryItemResponse[]>([]);
  const [selectedReceiptNo, setSelectedReceiptNo] = useState("");
  const [receiptContent, setReceiptContent] = useState("Select a receipt to preview.");

  const [notice, setNotice] = useState("Use filters to review transaction receipts.");
  const [error, setError] = useState("");

  const parsedReceipt = useMemo(() => parseReceiptPayload(receiptContent), [receiptContent]);
  const soldAtDate = parsedReceipt?.soldAt ? new Date(parsedReceipt.soldAt) : null;
  const soldAtDay = soldAtDate ? soldAtDate.toLocaleDateString() : "-";
  const soldAtTime = soldAtDate ? soldAtDate.toLocaleTimeString() : "-";

  async function handleLoadHistory() {
    setError("");
    try {
      const data = await getReceiptHistory(token, {
        receiptNo: receiptNo.trim() || undefined,
        status: status === "ALL" ? undefined : status,
        from,
        to,
        page: 0,
        size: 50,
      });

      setHistory(data.items);
      if (data.items.length === 0) {
        setNotice("No receipts found for selected filters.");
      } else {
        setNotice(`Loaded ${data.items.length} receipts.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch receipt history");
    }
  }

  async function handlePreview(receiptNumber: string) {
    setError("");
    try {
      const data = await getReceipt(token, receiptNumber);
      setSelectedReceiptNo(receiptNumber);
      setReceiptContent(data.receiptJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch receipt details");
    }
  }

  async function handleExportCsv() {
    setError("");
    try {
      const csv = await exportReceiptHistoryCsv(token, {
        receiptNo: receiptNo.trim() || undefined,
        status: status === "ALL" ? undefined : status,
        from,
        to,
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `receipt-history-${from}-to-${to}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("Receipt CSV export downloaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export receipt history");
    }
  }

  return (
    <Page title="Receipts" subtitle="Review receipt history and preview transaction receipts">
      <section className="st-receipts-filters">
        <h3>Receipt Filters</h3>
        <div className="st-grid four">
          <label>
            Receipt Number
            <input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="Search by receipt no" />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as "ALL" | TransactionStatus)}>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "All Statuses" : item}
                </option>
              ))}
            </select>
          </label>
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
          <button className="st-btn" onClick={handleLoadHistory}>
            Load Receipts
          </button>
          <button className="st-btn st-btn-secondary" onClick={handleExportCsv}>
            Export CSV
          </button>
        </div>
      </section>

      <section className="st-receipts-history">
        <h3>Receipt History</h3>
        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>Receipt Number</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5}>No receipts loaded.</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.receiptNo}>
                    <td>{item.receiptNo}</td>
                    <td>{new Date(item.generatedAt).toLocaleString()}</td>
                    <td>{item.transactionStatus}</td>
                    <td>${item.total.toFixed(2)}</td>
                    <td>
                      <button className="st-link-btn" onClick={() => handlePreview(item.receiptNo)}>
                        Preview
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="st-receipt-paper-wrap">
        <div className="st-receipt-vertical-frame">
          <article className="st-receipt-vertical-paper">
            <header className="st-receipt-v-head">
              <h4>BrowPOS</h4>
              <p>Downtown Branch</p>
              <small>742 Precision Ave, Level 4</small>
              <small>San Francisco, CA 94105</small>
              <small>+1 (555) 012-3456</small>
            </header>

            <div className="st-receipt-v-badge">
              <span className="material-symbols-outlined">verified</span>
              <span>Verified Transaction</span>
            </div>

            <section className="st-receipt-v-items">
              {(parsedReceipt?.items || []).length === 0 ? (
                <p className="st-receipt-v-empty">Select a receipt to preview.</p>
              ) : (
                (parsedReceipt?.items || []).map((item, index) => (
                  <div key={`${item.serviceName || "item"}-${index}`} className="st-receipt-v-item">
                    <div>
                      <strong>{item.serviceName || "Service"}</strong>
                      <small>Qty: {item.qty ?? 1}</small>
                    </div>
                    <span>${(((item.unitPrice || 0) * (item.qty || 1)) - (item.discountAmount || 0)).toFixed(2)}</span>
                  </div>
                ))
              )}
            </section>

            <div className="st-receipt-v-divider" />

            <section className="st-receipt-v-totals">
              <div>
                <span>Subtotal</span>
                <span>${(parsedReceipt?.subtotal || 0).toFixed(2)}</span>
              </div>
              <div>
                <span>Discount</span>
                <span>${(parsedReceipt?.discountTotal || 0).toFixed(2)}</span>
              </div>
              <div className="st-receipt-v-grand">
                <strong>Total</strong>
                <strong>${(parsedReceipt?.total || 0).toFixed(2)}</strong>
              </div>
            </section>

            <section className="st-receipt-v-payment">
              <div className="st-receipt-v-payment-head">
                <span className="material-symbols-outlined">payments</span>
                <div>
                  <p>Payment Method</p>
                  <strong>{parsedReceipt?.payments?.[0]?.method || "-"}</strong>
                </div>
              </div>
              <div className="st-receipt-v-payment-meta">
                <div>
                  <small>Date</small>
                  <span>{soldAtDay}</span>
                </div>
                <div>
                  <small>Time</small>
                  <span>{soldAtTime}</span>
                </div>
              </div>
            </section>

            <footer className="st-receipt-v-footer">
              <div>
                <small>Receipt Number</small>
                <p>{selectedReceiptNo || parsedReceipt?.receiptNo || "-"}</p>
              </div>
              <div>
                <small>Branch / Cashier</small>
                <p>
                  {parsedReceipt?.branchId ?? "-"} / {parsedReceipt?.cashierId ?? "-"}
                </p>
              </div>
              <h5>Thank you for choosing BrowPOS.</h5>
            </footer>

            <div className="st-receipt-v-edge" />
          </article>

          <div className="st-receipt-v-actions">
            <button type="button">Download PDF</button>
            <button type="button" className="primary">
              Email Receipt
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="st-error">{error}</p> : <p>{notice}</p>}
    </Page>
  );
}
