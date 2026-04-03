import { useMemo, useState } from "react";
import { Card, Page } from "../components/common/Page";
import { getSalesSummary } from "../lib/api";
import { formatCurrency } from "../lib/currency";
import type { SalesSummaryResponse } from "../lib/types";

type Props = {
  token: string;
  selectedBranchId: number | null;
};

export function SalesReportPage({ token, selectedBranchId }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [summary, setSummary] = useState<SalesSummaryResponse | null>(null);
  const [error, setError] = useState("");

  async function handleLoad() {
    if (selectedBranchId === null) {
      setError("Select a branch in the header before loading sales.");
      return;
    }

    setError("");
    try {
      const data = await getSalesSummary(token, from, to, selectedBranchId);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales summary");
    }
  }

  return (
    <Page title="Sales Report" subtitle="Performance report for the selected period">
      <Card title="Date Range">
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
          <button className="st-btn" onClick={handleLoad}>
            Load Sales Report
          </button>
        </div>
      </Card>

      <div className="st-cards-grid">
        <Card title="Gross Sales">
          <h2>{summary ? formatCurrency(summary.grossSales) : "-"}</h2>
        </Card>
        <Card title="Net Sales">
          <h2>{summary ? formatCurrency(summary.netSales) : "-"}</h2>
        </Card>
        <Card title="Discount Total">
          <h2>{summary ? formatCurrency(summary.discountTotal) : "-"}</h2>
        </Card>
        <Card title="Refund Total">
          <h2>{summary ? formatCurrency(summary.refundTotal) : "-"}</h2>
        </Card>
        <Card title="Avg Bill">
          <h2>{summary ? formatCurrency(summary.averageBill) : "-"}</h2>
        </Card>
        <Card title="Transaction Count">
          <h2>{summary ? summary.transactionCount : "-"}</h2>
        </Card>
      </div>

      {error ? <p className="st-error">{error}</p> : null}
    </Page>
  );
}
