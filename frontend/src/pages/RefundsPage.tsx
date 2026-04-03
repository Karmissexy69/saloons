import { useState } from "react";
import { Card, Page } from "../components/common/Page";
import { createRefund } from "../lib/api";

type Props = { token: string };

export function RefundsPage({ token }: Props) {
  const [receiptNo, setReceiptNo] = useState("");
  const [reason, setReason] = useState("Service quality issue");
  const [totalRefund, setTotalRefund] = useState("0");
  const [managerApprovalName, setManagerApprovalName] = useState("Manager On Duty");
  const [notice, setNotice] = useState("Issue refunds by receipt reference.");
  const [error, setError] = useState("");

  async function handleRefund() {
    if (receiptNo.trim().length === 0) {
      setError("Receipt number is required.");
      return;
    }

    if (reason.trim().length === 0) {
      setError("Refund reason is required.");
      return;
    }

    setError("");
    try {
      const data = await createRefund(token, {
        receiptNo: receiptNo.trim(),
        approvedBy: 4,
        reason: reason.trim(),
        totalRefund: totalRefund.trim() ? Number(totalRefund) : undefined,
      });
      setNotice(`Refund ${data.refundId} completed for receipt ${data.receiptNo}.`);
      setReceiptNo("");
      setTotalRefund("0");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create refund");
    }
  }

  return (
    <Page title="Refunds" subtitle="Process approved refund requests for completed receipts">
      <Card title="Refund Request">
        <div className="st-grid two">
          <label>
            Receipt Number
            <input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="e.g. B1-20260402-0102" />
          </label>
          <label>
            Approved By
            <input value={managerApprovalName} onChange={(e) => setManagerApprovalName(e.target.value)} />
          </label>
          <label>
            Refund Amount (optional)
            <input type="number" step="0.01" value={totalRefund} onChange={(e) => setTotalRefund(e.target.value)} />
          </label>
        </div>

        <label>
          Refund Reason
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>

        <div className="st-actions">
          <button className="st-btn" onClick={handleRefund}>
            Submit Refund
          </button>
        </div>
      </Card>

      {error ? <p className="st-error">{error}</p> : <p>{notice}</p>}
    </Page>
  );
}
