import { useEffect, useMemo, useState } from "react";
import { Page } from "../components/common/Page";
import { getAttendanceReport, listStaff } from "../lib/api";
import type { AttendanceReportItemResponse, StaffProfileResponse } from "../lib/types";

type Props = { token: string };

export function AttendanceLogsPage({ token }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [staff, setStaff] = useState<StaffProfileResponse[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<AttendanceReportItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStaff() {
      try {
        const data = await listStaff(token);
        setStaff(data.filter((item) => item.active));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team list");
      }
    }

    loadStaff();
  }, [token]);

  async function runReport() {
    setLoading(true);
    setError("");
    try {
      const data = await getAttendanceReport(token, {
        staffId: selectedStaff ? Number(selectedStaff) : undefined,
        branchId: 1,
        from,
        to,
        page: 0,
        size: 100,
      });
      setRows(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title="Attendance Logs" subtitle="Review verified staff attendance records">
      <section className="st-attendance-filters">
        <label>
          Staff Member
          <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
            <option value="">All Team Members</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Date To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="st-btn" onClick={runReport} disabled={loading}>
          {loading ? "Loading..." : "Load Attendance"}
        </button>
      </section>

      <section className="st-attendance-table-panel">
        <h3>Attendance History</h3>
        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Staff Name</th>
                <th>Branch</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Break</th>
                <th>Worked</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>No attendance records loaded.</td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td>{item.staffName}</td>
                    <td>{item.branchId}</td>
                    <td>{new Date(item.clockInAt).toLocaleString()}</td>
                    <td>{item.clockOutAt ? new Date(item.clockOutAt).toLocaleString() : "-"}</td>
                    <td>{item.breakMinutes ? `${item.breakMinutes} min` : "0 min"}</td>
                    <td>{item.workedMinutes ? `${item.workedMinutes} min` : "-"}</td>
                    <td>{item.attendanceStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error ? <p className="st-error">{error}</p> : null}
    </Page>
  );
}
