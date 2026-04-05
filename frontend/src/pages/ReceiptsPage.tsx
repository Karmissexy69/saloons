import { useEffect, useMemo, useState } from "react";
import { Page } from "../components/common/Page";
import { exportReceiptHistoryCsv, getReceipt, getReceiptHistory, listStaff } from "../lib/api";
import { formatCurrency } from "../lib/currency";
import type { ReceiptHistoryItemResponse, StaffProfileResponse, TransactionStatus } from "../lib/types";

type Props = {
  token: string;
  selectedBranchId: number | null;
  selectedBranchName: string;
};

type ReceiptPayload = {
  businessName?: string;
  branchId?: number;
  branchName?: string;
  branchAddress?: string;
  cashierId?: number;
  cashierName?: string;
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

export function ReceiptsPage({ token, selectedBranchId, selectedBranchName }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const receiptFromQuery = useMemo(() => new URLSearchParams(window.location.search).get("receiptNo")?.trim() ?? "", []);

  const [receiptNo, setReceiptNo] = useState("");
  const [status, setStatus] = useState<"ALL" | TransactionStatus>("ALL");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [history, setHistory] = useState<ReceiptHistoryItemResponse[]>([]);
  const [selectedReceiptNo, setSelectedReceiptNo] = useState("");
  const [receiptContent, setReceiptContent] = useState("");
  const [staff, setStaff] = useState<StaffProfileResponse[]>([]);

  const [notice, setNotice] = useState("Today's receipts load automatically when this page opens.");
  const [error, setError] = useState("");

  const parsedReceipt = useMemo(() => parseReceiptPayload(receiptContent), [receiptContent]);
  const hasPreview = selectedReceiptNo.length > 0 && parsedReceipt !== null;
  const dateRangeLabel = from === to ? from : `${from} to ${to}`;
  const soldAtDate = parsedReceipt?.soldAt ? new Date(parsedReceipt.soldAt) : null;
  const soldAtDay = soldAtDate ? soldAtDate.toLocaleDateString() : "-";
  const soldAtTime = soldAtDate ? soldAtDate.toLocaleTimeString() : "-";
  const receiptBusinessName = parsedReceipt?.businessName || "BrowPOS";
  const receiptBranchName =
    parsedReceipt?.branchName ||
    selectedBranchName ||
    (parsedReceipt?.branchId ? `Branch ${parsedReceipt.branchId}` : "Branch not set");
  const receiptBranchAddress = parsedReceipt?.branchAddress?.trim() || "";
  const receiptCashierName =
    parsedReceipt?.cashierName ||
    staff.find((member) => member.id === parsedReceipt?.cashierId)?.displayName ||
    parsedReceipt?.cashierId ||
    "-";

  useEffect(() => {
    let cancelled = false;

    async function loadStaff() {
      try {
        const data = await listStaff(token);
        if (!cancelled) {
          setStaff(data);
        }
      } catch {
        if (!cancelled) {
          setStaff([]);
        }
      }
    }

    void loadStaff();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!receiptFromQuery) {
      return;
    }

    let cancelled = false;

    async function loadReceiptFromQuery() {
      setError("");
      setReceiptNo(receiptFromQuery);

      try {
        const [receiptData, historyData] = await Promise.all([
          getReceipt(token, receiptFromQuery),
          getReceiptHistory(token, {
            receiptNo: receiptFromQuery,
            branchId: selectedBranchId ?? undefined,
            page: 0,
            size: 50,
          }),
        ]);

        if (cancelled) {
          return;
        }

        setSelectedReceiptNo(receiptFromQuery);
        setReceiptContent(receiptData.receiptJson);
        setHistory(historyData.items);
        setNotice(`Loaded receipt ${receiptFromQuery}.`);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to fetch receipt details");
      }
    }

    loadReceiptFromQuery();

    return () => {
      cancelled = true;
    };
  }, [receiptFromQuery, token, selectedBranchId]);

  useEffect(() => {
    if (receiptFromQuery) {
      return;
    }
    if (selectedBranchId === null) {
      setHistory([]);
      setSelectedReceiptNo("");
      setReceiptContent("");
      setNotice("Select a branch in the header to load today's receipts.");
      return;
    }
    void handleLoadHistory();
  }, [receiptFromQuery, selectedBranchId, token]);

  async function handleLoadHistory() {
    if (selectedBranchId === null) {
      setError("Select a branch in the header before loading receipts.");
      return;
    }

    setError("");
    try {
      const data = await getReceiptHistory(token, {
        receiptNo: receiptNo.trim() || undefined,
        branchId: selectedBranchId,
        status: status === "ALL" ? undefined : status,
        from,
        to,
        page: 0,
        size: 50,
      });

      setHistory(data.items);
      setSelectedReceiptNo("");
      setReceiptContent("");
      if (data.items.length === 0) {
        setNotice(`No receipts found for ${dateRangeLabel}.`);
      } else {
        setNotice(`Loaded ${data.items.length} receipts for ${dateRangeLabel}.`);
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
      setNotice(`Previewing receipt ${receiptNumber}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch receipt details");
    }
  }

  function handleClosePreview() {
    setSelectedReceiptNo("");
    setReceiptContent("");
    setNotice("Receipt preview hidden.");
  }

  async function handleExportCsv() {
    if (selectedBranchId === null) {
      setError("Select a branch in the header before exporting receipts.");
      return;
    }

    setError("");
    try {
      const csv = await exportReceiptHistoryCsv(token, {
        receiptNo: receiptNo.trim() || undefined,
        branchId: selectedBranchId,
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
                  <td colSpan={5}>No receipts found.</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.receiptNo}>
                    <td>{item.receiptNo}</td>
                    <td>{new Date(item.generatedAt).toLocaleString()}</td>
                    <td>{item.transactionStatus}</td>
                    <td>{formatCurrency(item.total)}</td>
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

      {hasPreview ? (
        <section className="st-receipt-paper-wrap">
          <div className="st-inline-actions">
            <button type="button" className="st-link-btn" onClick={handleClosePreview}>
              Hide Preview
            </button>
          </div>

          <div className="st-receipt-vertical-frame">
            <article className="st-receipt-vertical-paper">
              <header className="st-receipt-v-head">
                <h4>{receiptBusinessName}</h4>
                <p>{receiptBranchName}</p>
                {receiptBranchAddress ? <small className="st-receipt-v-address">{receiptBranchAddress}</small> : null}
                <small>Branch Receipt</small>
                <small>Generated from POS Terminal</small>
                <small>Internal Operations Copy</small>
              </header>

              <div className="st-receipt-v-badge">
                <span className="material-symbols-outlined">verified</span>
                <span>Verified Transaction</span>
              </div>

              <section className="st-receipt-v-items">
                {(parsedReceipt?.items || []).map((item, index) => (
                  <div key={`${item.serviceName || "item"}-${index}`} className="st-receipt-v-item">
                    <div>
                      <strong>{item.serviceName || "Service"}</strong>
                      <small>Qty: {item.qty ?? 1}</small>
                    </div>
                    <span>{formatCurrency(((item.unitPrice || 0) * (item.qty || 1)) - (item.discountAmount || 0))}</span>
                  </div>
                ))}
              </section>

              <div className="st-receipt-v-divider" />

              <section className="st-receipt-v-totals">
                <div>
                  <span>Subtotal</span>
                  <span>{formatCurrency(parsedReceipt?.subtotal || 0)}</span>
                </div>
                <div>
                  <span>Discount</span>
                  <span>{formatCurrency(parsedReceipt?.discountTotal || 0)}</span>
                </div>
                <div className="st-receipt-v-grand">
                  <strong>Total</strong>
                  <strong>{formatCurrency(parsedReceipt?.total || 0)}</strong>
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
                    {receiptBranchName} / {receiptCashierName}
                  </p>
                </div>
                <h5>Thank you for choosing {receiptBusinessName}.</h5>
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
      ) : null}

      {error ? <p className="st-error">{error}</p> : <p>{notice}</p>}
    </Page>
  );
}
