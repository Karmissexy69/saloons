import { useEffect, useMemo, useState } from "react";
import { Card, Page } from "../components/common/Page";
import { getCommissionStatement, listStaff } from "../lib/api";
import { formatCurrency } from "../lib/currency";
import type { CommissionStatementResponse, StaffProfileResponse } from "../lib/types";

type Props = { token: string };

export function CommissionPage({ token }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [team, setTeam] = useState<StaffProfileResponse[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [statement, setStatement] = useState<CommissionStatementResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeam() {
      try {
        const data = await listStaff(token);
        const active = data.filter((item) => item.active);
        setTeam(active);
        if (active.length > 0) {
          setSelectedStaffId(String(active[0].id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team members");
      }
    }

    loadTeam();
  }, [token]);

  async function handleLoad() {
    if (selectedStaffId.trim().length === 0) {
      setError("Please choose a team member.");
      return;
    }

    setError("");
    try {
      const data = await getCommissionStatement(token, Number(selectedStaffId), from, to);
      setStatement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load commission statement");
    }
  }

  return (
    <Page title="Commission" subtitle="Team earnings, reversals, and net payout">
      <Card title="Statement Filters">
        <div className="st-grid three">
          <label>
            Team Member
            <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
              <option value="">Select team member</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
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
          <button className="st-btn" onClick={handleLoad}>
            Load Statement
          </button>
        </div>
      </Card>

      <div className="st-cards-grid">
        <Card title="Earned">
          <h2>{statement ? formatCurrency(statement.earned) : "-"}</h2>
        </Card>
        <Card title="Reversal">
          <h2>{statement ? formatCurrency(statement.reversal) : "-"}</h2>
        </Card>
        <Card title="Net">
          <h2>{statement ? formatCurrency(statement.net) : "-"}</h2>
        </Card>
      </div>

      {error ? <p className="st-error">{error}</p> : null}
    </Page>
  );
}
