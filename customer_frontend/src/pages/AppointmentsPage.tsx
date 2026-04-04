import { useEffect, useMemo, useState } from "react";
import { cancelCustomerAppointment, listCustomerAppointments } from "../lib/api";
import { formatDateTime, formatStatus } from "../lib/format";
import { navigate } from "../lib/router";
import type { AppointmentRecord } from "../lib/types";

function isUpcoming(item: AppointmentRecord) {
  return new Date(item.startAt).getTime() >= Date.now() && item.status !== "CANCELLED";
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeCancelReference, setActiveCancelReference] = useState("");
  const [cancelReason, setCancelReason] = useState("Customer cancelled appointment");
  const [savingCancel, setSavingCancel] = useState(false);

  async function loadAppointments() {
    setLoading(true);
    setError("");
    try {
      const data = await listCustomerAppointments();
      setAppointments([...data].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAppointments();
  }, []);

  const upcoming = useMemo(() => appointments.filter(isUpcoming), [appointments]);
  const history = useMemo(() => appointments.filter((item) => !isUpcoming(item)), [appointments]);

  async function handleCancel(bookingReference: string) {
    setSavingCancel(true);
    setError("");
    setNotice("");
    try {
      await cancelCustomerAppointment(bookingReference, cancelReason.trim() || "Customer cancelled appointment");
      setActiveCancelReference("");
      setNotice("Appointment cancelled.");
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel appointment");
    } finally {
      setSavingCancel(false);
    }
  }

  return (
    <section className="ve-account-section">
      <div className="ve-section-head">
        <div>
          <p className="ve-eyebrow">Appointments</p>
          <h1 className="ve-display-md">Manage upcoming bookings and review your visit history.</h1>
        </div>
        <button className="ve-button ve-button-primary" onClick={() => navigate("/book")}>
          Book Another Visit
        </button>
      </div>

      {notice ? <div className="ve-inline-note ve-inline-note-success">{notice}</div> : null}
      {error ? <div className="ve-inline-note ve-inline-note-error">{error}</div> : null}

      {loading ? (
        <div className="ve-card-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="ve-panel ve-skeleton-card" />
          ))}
        </div>
      ) : (
        <>
          <section className="ve-stack-lg">
            <div className="ve-subhead">
              <h2 className="ve-display-sm">Upcoming</h2>
            </div>
            {upcoming.length === 0 ? (
              <div className="ve-panel ve-panel-muted">
                <p className="ve-panel-title">No upcoming appointments</p>
                <p className="ve-panel-copy">Your next booking will appear here as soon as it is created.</p>
              </div>
            ) : (
              <div className="ve-card-grid">
                {upcoming.map((appointment) => (
                  <article key={appointment.id} className="ve-panel ve-panel-elevated">
                    <p className="ve-card-kicker">{appointment.bookingReference}</p>
                    <h3 className="ve-card-title">{appointment.serviceName || "Service confirmed on arrival"}</h3>
                    <p className="ve-card-copy">{formatDateTime(appointment.startAt)}</p>
                    <p className="ve-card-copy">{appointment.staffName || "No specialist preference"}</p>
                    <div className="ve-chip-row">
                      <span className="ve-chip">{formatStatus(appointment.status)}</span>
                      <span className="ve-chip ve-chip-muted">{appointment.bookingChannel}</span>
                    </div>
                    {activeCancelReference === appointment.bookingReference ? (
                      <div className="ve-inline-form">
                        <textarea
                          className="ve-input ve-textarea"
                          value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                        />
                        <div className="ve-action-row">
                          <button className="ve-button ve-button-danger" onClick={() => void handleCancel(appointment.bookingReference)} disabled={savingCancel}>
                            {savingCancel ? "Cancelling..." : "Confirm Cancel"}
                          </button>
                          <button className="ve-button ve-button-ghost" onClick={() => setActiveCancelReference("")}>
                            Close
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="ve-button ve-button-ghost" onClick={() => setActiveCancelReference(appointment.bookingReference)}>
                        Cancel Appointment
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="ve-stack-lg">
            <div className="ve-subhead">
              <h2 className="ve-display-sm">History</h2>
            </div>
            {history.length === 0 ? (
              <div className="ve-panel ve-panel-muted">
                <p className="ve-panel-title">No past appointments yet</p>
              </div>
            ) : (
              <div className="ve-list">
                {history.map((appointment) => (
                  <article key={appointment.id} className="ve-list-row">
                    <div>
                      <strong>{appointment.serviceName || "Service visit"}</strong>
                      <p>{formatDateTime(appointment.startAt)}</p>
                    </div>
                    <div className="ve-list-row-side">
                      <span className="ve-chip">{formatStatus(appointment.status)}</span>
                      <span>{appointment.staffName || "Any specialist"}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
