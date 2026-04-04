import { useEffect, useState } from "react";
import { getCustomerMe, listPointsHistory } from "../lib/api";
import { formatDateTime, formatPoints } from "../lib/format";
import { useStoredSession } from "../lib/session";
import type { LoyaltyTransaction } from "../lib/types";

export function PointsPage() {
  const session = useStoredSession();
  const [entries, setEntries] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [history] = await Promise.all([listPointsHistory(), getCustomerMe()]);
        if (!cancelled) {
          setEntries(history);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load points history");
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

  return (
    <section className="ve-account-section">
      <div className="ve-section-head">
        <div>
          <p className="ve-eyebrow">My Points</p>
          <h1 className="ve-display-md">Track every earn, redemption, and adjustment tied to your customer record.</h1>
        </div>
      </div>

      <div className="ve-points-hero">
        <div>
          <p className="ve-eyebrow">Current Balance</p>
          <h2 className="ve-display-xl">{session?.customer.pointsBalance ?? 0}</h2>
        </div>
        <div className="ve-story-list ve-story-list-compact">
          <div className="ve-story-item">
            <span className="material-symbols-outlined">payments</span>
            <div>
              <p>Total visits</p>
              <small>{session?.customer.totalVisits ?? 0}</small>
            </div>
          </div>
          <div className="ve-story-item">
            <span className="material-symbols-outlined">monitoring</span>
            <div>
              <p>Last visit</p>
              <small>{session?.customer.lastVisitAt ? formatDateTime(session.customer.lastVisitAt) : "Not yet recorded"}</small>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="ve-inline-note ve-inline-note-error">{error}</div> : null}

      {loading ? (
        <div className="ve-list">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ve-list-row ve-skeleton-card" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="ve-panel ve-panel-muted">
          <p className="ve-panel-title">No points activity yet</p>
          <p className="ve-panel-copy">Your earn and redemption ledger will appear here once the customer account starts moving.</p>
        </div>
      ) : (
        <div className="ve-list">
          {entries.map((entry) => (
            <article key={entry.id} className="ve-list-row">
              <div>
                <strong>{entry.entryType.replaceAll("_", " ")}</strong>
                <p>{entry.remarks || "No remarks"}</p>
              </div>
              <div className="ve-list-row-side">
                <strong className={entry.pointsDelta >= 0 ? "ve-positive" : "ve-negative"}>
                  {entry.pointsDelta >= 0 ? `+${formatPoints(entry.pointsDelta)}` : formatPoints(entry.pointsDelta)}
                </strong>
                <span>{formatDateTime(entry.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
