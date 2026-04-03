import { useMemo, useState } from "react";
import { Card, Page } from "../components/common/Page";
import { getAuditLogs } from "../lib/api";
import type { AuditLogResponse } from "../lib/types";

type Props = { token: string };

export function AuditLogsPage({ token }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [rows, setRows] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLoad() {
    setLoading(true);
    setError("");
    try {
      const data = await getAuditLogs(token, {
        entityType: entityType.trim() || undefined,
        action: action.trim() || undefined,
        from,
        to,
        page: 0,
        size: 100,
      });
      setRows(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title="Audit Logs" subtitle="Track system actions and operational changes">
      <Card title="Filters">
        <div className="st-grid four">
          <label>
            Entity
            <input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="TRANSACTION / ATTENDANCE / SERVICE" />
          </label>
          <label>
            Action
            <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="CREATE / UPDATE / REFUND" />
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
          <button className="st-btn" onClick={handleLoad} disabled={loading}>
            {loading ? "Loading..." : "Load Audit Logs"}
          </button>
        </div>
      </Card>

      <Card title="Audit Trail">
        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>No audit logs loaded.</td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                    <td>{item.actorUsername || "System"}</td>
                    <td>{item.entityType}</td>
                    <td>{item.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {error ? <p className="st-error">{error}</p> : null}
    </Page>
  );
}
