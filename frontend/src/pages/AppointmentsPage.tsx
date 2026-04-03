import { useEffect, useMemo, useState } from "react";
import { Page } from "../components/common/Page";
import {
  convertAppointmentToBill,
  createAppointment,
  listAppointments,
  listServices,
  listStaff,
  updateAppointmentStatus,
} from "../lib/api";
import type { AppointmentResponse, AppointmentStatus, PaymentMethod, ServiceItemResponse, StaffProfileResponse } from "../lib/types";

type Props = { token: string };

const STATUSES: AppointmentStatus[] = ["BOOKED", "CHECKED_IN", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW"];

export function AppointmentsPage({ token }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [services, setServices] = useState<ServiceItemResponse[]>([]);
  const [staff, setStaff] = useState<StaffProfileResponse[]>([]);

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(today);
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [depositAmount, setDepositAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const [filterStatus, setFilterStatus] = useState<"ALL" | AppointmentStatus>("ALL");
  const [filterFrom, setFilterFrom] = useState(today);
  const [filterTo, setFilterTo] = useState(today);

  const [convertPaymentMethod, setConvertPaymentMethod] = useState<PaymentMethod>("CARD");
  const [convertPaymentReference, setConvertPaymentReference] = useState("");

  const [notice, setNotice] = useState("Schedule and manage appointments.");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLookups() {
      try {
        const [serviceData, staffData] = await Promise.all([listServices(token), listStaff(token)]);
        setServices(serviceData);
        setStaff(staffData.filter((item) => item.active));

        if (serviceData.length > 0) {
          setSelectedServiceId(String(serviceData[0].id));
        }
        if (staffData.length > 0) {
          setSelectedStaffId(String(staffData[0].id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load appointment data");
      }
    }

    loadLookups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadAppointments() {
    setLoadingList(true);
    setError("");
    try {
      const data = await listAppointments(token, {
        from: filterFrom,
        to: filterTo,
        status: filterStatus === "ALL" ? undefined : filterStatus,
      });
      setAppointments(data);
      setNotice(data.length === 0 ? "No appointments found." : `Loaded ${data.length} appointments.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list appointments");
    } finally {
      setLoadingList(false);
    }
  }

  async function handleCreate() {
    if (selectedServiceId.trim().length === 0 || selectedStaffId.trim().length === 0) {
      setError("Please choose service and staff member.");
      return;
    }

    setError("");
    try {
      const startAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      const created = await createAppointment(token, {
        branchId: 1,
        serviceId: Number(selectedServiceId),
        staffId: Number(selectedStaffId),
        startAt,
        status: "BOOKED",
        depositAmount: Number(depositAmount || 0),
        notes: notes.trim() || undefined,
      });

      setNotice(`Appointment booked for ${new Date(created.startAt).toLocaleString()}.`);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create appointment");
    }
  }

  async function handleStatusUpdate(appointment: AppointmentResponse, status: AppointmentStatus) {
    setError("");
    try {
      await updateAppointmentStatus(token, appointment.id, status);
      setNotice(`Appointment status updated to ${status}.`);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment status");
    }
  }

  async function handleConvertToBill(appointment: AppointmentResponse) {
    if (appointment.status !== "COMPLETED") {
      setError("Only completed appointments can be converted to a bill.");
      return;
    }

    const service = services.find((item) => item.id === appointment.serviceId);
    const amount = service ? service.price : 0;

    setError("");
    try {
      const receipt = await convertAppointmentToBill(token, appointment.id, {
        cashierId: 3,
        discountTotal: 0,
        payments: [{ method: convertPaymentMethod, amount, referenceNo: convertPaymentReference.trim() || undefined }],
      });
      setNotice(`Appointment converted. Receipt ${receipt.receiptNo} generated.`);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert appointment to bill");
    }
  }

  return (
    <Page title="Appointments" subtitle="Schedule and progress customer visits">
      <section className="st-appointments-layout">
        <div className="st-appointments-book-panel">
          <h3>Book Appointment</h3>
          <div className="st-grid four">
            <label>
              Service
              <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                <option value="">Select service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Team Member
              <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
                <option value="">Select team member</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Date
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </label>
            <label>
              Time
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
            </label>
          </div>

          <div className="st-grid two">
            <label>
              Deposit
              <input type="number" step="0.01" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </label>
            <label>
              Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional appointment note" />
            </label>
          </div>

          <div className="st-actions">
            <button className="st-btn" onClick={handleCreate}>
              Book Appointment
            </button>
          </div>
        </div>

        <aside className="st-appointments-side-panel">
          <h3>Schedule Filters</h3>
          <div className="st-grid">
            <label>
              Status
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "ALL" | AppointmentStatus)}>
                <option value="ALL">All Statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              From
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </label>
            <label>
              Conversion Method
              <select value={convertPaymentMethod} onChange={(e) => setConvertPaymentMethod(e.target.value as PaymentMethod)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="QR">QR</option>
              </select>
            </label>
            <label>
              Conversion Reference
              <input value={convertPaymentReference} onChange={(e) => setConvertPaymentReference(e.target.value)} />
            </label>
          </div>

          <button className="st-btn st-btn-secondary" onClick={loadAppointments} disabled={loadingList}>
            {loadingList ? "Refreshing..." : "Load Schedule"}
          </button>
        </aside>
      </section>

      <section className="st-appointments-table-panel">
        <h3>Schedule Board</h3>
        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Service</th>
                <th>Team Member</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5}>No appointments loaded.</td>
                </tr>
              ) : (
                appointments.map((item) => {
                  const service = services.find((serviceItem) => serviceItem.id === item.serviceId);
                  const staffMember = staff.find((member) => member.id === item.staffId);

                  return (
                    <tr key={item.id}>
                      <td>{new Date(item.startAt).toLocaleString()}</td>
                      <td>{service ? service.name : "General Service"}</td>
                      <td>{staffMember ? staffMember.displayName : "Unassigned"}</td>
                      <td>{item.status}</td>
                      <td>
                        <div className="st-inline-actions">
                          <button className="st-link-btn" onClick={() => handleStatusUpdate(item, "CHECKED_IN")}>Check In</button>
                          <button className="st-link-btn" onClick={() => handleStatusUpdate(item, "COMPLETED")}>Complete</button>
                          <button className="st-link-btn" onClick={() => handleConvertToBill(item)}>Convert To Bill</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {error ? <p className="st-error">{error}</p> : <p>{notice}</p>}
    </Page>
  );
}
