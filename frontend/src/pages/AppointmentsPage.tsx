import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  cancelAppointment,
  createAppointment,
  listAppointments,
  listServices,
  listStaff,
  searchCustomers,
  updateAppointment,
  updateAppointmentStatus,
} from "../lib/api";
import { formatCurrency } from "../lib/currency";
import "../styles/appointments.css";
import type {
  AppointmentCheckoutDraft,
  AppointmentResponse,
  AppointmentStatus,
  CustomerResponse,
  ServiceItemResponse,
  StaffProfileResponse,
  UpdateAppointmentRequest,
} from "../lib/types";

type Props = {
  token: string;
  selectedBranchId: number | null;
  selectedBranchName: string;
  canStartCheckout: boolean;
  onStartCheckout: (draft: AppointmentCheckoutDraft) => void;
  onViewReceipt: (receiptNo: string) => void;
};

type ViewMode = "daily" | "weekly";
type BookingMode = "guest" | "customer";
type SheetMode = "create" | "edit";
type Tone = "primary" | "secondary" | "tertiary" | "neutral" | "muted";

type BookingForm = {
  bookingMode: BookingMode;
  customerQuery: string;
  selectedCustomerId: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  selectedServiceId: string;
  selectedStaffId: string;
  scheduledDate: string;
  scheduledTime: string;
  depositAmount: string;
  customerNote: string;
  internalNote: string;
};

type DailyTile = {
  appointment: AppointmentResponse;
  top: number;
  height: number;
  leftPct: number;
  widthPct: number;
  columns: number;
  tone: Tone;
  compact: boolean;
};

const SLOT_HEIGHT = 82;
const START_HOUR = 8;
const END_HOUR = 21;
const STATUSES: AppointmentStatus[] = ["BOOKED", "CHECKED_IN", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW"];
const longDateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const weekDateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const monthDayFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function AppointmentsPage({ token, selectedBranchId, selectedBranchName, canStartCheckout, onStartCheckout, onViewReceipt }: Props) {
  const today = useMemo(() => toDateInput(new Date()), []);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [focusDate, setFocusDate] = useState(today);
  const [services, setServices] = useState<ServiceItemResponse[]>([]);
  const [staff, setStaff] = useState<StaffProfileResponse[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [customerResults, setCustomerResults] = useState<CustomerResponse[]>([]);
  const [filterStatus, setFilterStatus] = useState<"ALL" | AppointmentStatus>("ALL");
  const [filterStaffId, setFilterStaffId] = useState("ALL");
  const [filterQuery, setFilterQuery] = useState("");
  const deferredQuery = useDeferredValue(filterQuery.trim());
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("create");
  const [form, setForm] = useState<BookingForm>(() => emptyForm(today));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState("Customer and public bookings will flow into this scheduler automatically.");
  const [error, setError] = useState("");

  const activeStaff = useMemo(() => staff.filter((item) => item.active), [staff]);
  const servicesById = useMemo(() => new Map(services.map((item) => [item.id, item])), [services]);
  const selectedService = useMemo(() => services.find((item) => item.id === Number(form.selectedServiceId)) ?? null, [form.selectedServiceId, services]);
  const focus = useMemo(() => fromDateInput(focusDate), [focusDate]);
  const weekStart = useMemo(() => startOfWeek(focus), [focus]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const selectedAppointment = useMemo(() => appointments.find((item) => item.id === selectedAppointmentId) ?? null, [appointments, selectedAppointmentId]);
  const visibleAppointments = useMemo(() => {
    const sorted = [...appointments].sort((left, right) => toDate(left.startAt).getTime() - toDate(right.startAt).getTime());
    if (filterStaffId === "ALL") return sorted;
    const staffId = Number(filterStaffId);
    return sorted.filter((item) => item.staffId === staffId);
  }, [appointments, filterStaffId]);
  const dayAppointments = useMemo(() => visibleAppointments.filter((item) => toDateInput(toDate(item.startAt)) === focusDate), [focusDate, visibleAppointments]);
  const dailyTiles = useMemo(() => buildDailyTiles(dayAppointments), [dayAppointments]);
  const hourSlots = useMemo(() => Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index), []);
  const stats = useMemo(() => summarize(visibleAppointments, servicesById, activeStaff.length), [activeStaff.length, servicesById, visibleAppointments]);
  const weekGrouped = useMemo(() => {
    const grouped = new Map<string, AppointmentResponse[]>();
    for (const day of weekDays) grouped.set(toDateInput(day), []);
    for (const item of visibleAppointments) {
      const key = toDateInput(toDate(item.startAt));
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(item);
    }
    for (const entry of grouped.values()) entry.sort((left, right) => toDate(left.startAt).getTime() - toDate(right.startAt).getTime());
    return grouped;
  }, [visibleAppointments, weekDays]);

  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      try {
        const [serviceData, staffData] = await Promise.all([listServices(token), listStaff(token)]);
        if (cancelled) return;
        const active = staffData.filter((item) => item.active);
        setServices(serviceData);
        setStaff(active);
        setForm((current) => ({
          ...current,
          selectedServiceId: current.selectedServiceId || String(serviceData[0]?.id ?? ""),
          selectedStaffId: current.selectedStaffId || String(active[0]?.id ?? ""),
        }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load appointment setup data");
      }
    }

    void loadLookups();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function refreshAppointments(nextSelectionId?: number | null) {
    if (selectedBranchId === null) {
      setAppointments([]);
      setSelectedAppointmentId(null);
      return;
    }

    const from = viewMode === "daily" ? dayStartIso(focusDate) : dayStartIso(toDateInput(weekStart));
    const to = viewMode === "daily" ? dayEndIso(focusDate) : dayEndIso(toDateInput(addDays(weekStart, 6)));

    setLoading(true);
    setError("");
    try {
      const data = await listAppointments(token, {
        from,
        to,
        branchId: selectedBranchId,
        status: filterStatus === "ALL" ? undefined : filterStatus,
        q: deferredQuery || undefined,
      });
      setAppointments(data);
      setSelectedAppointmentId((current) => {
        if (nextSelectionId !== undefined) return nextSelectionId;
        return data.some((item) => item.id === current) ? current : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAppointments();
  }, [deferredQuery, filterStatus, focusDate, selectedBranchId, token, viewMode, weekStart]);

  function openCreateSheet() {
    if (selectedBranchId === null) {
      setError("Select a branch before booking.");
      return;
    }
    setCustomerResults([]);
    setSheetMode("create");
    setForm(emptyForm(focusDate, services[0], activeStaff[0]));
    setSheetOpen(true);
  }

  function openEditSheet(appointment: AppointmentResponse) {
    setSheetMode("edit");
    setForm({
      bookingMode: appointment.customerId ? "customer" : "guest",
      customerQuery: appointment.displayName ?? "",
      selectedCustomerId: appointment.customerId ? String(appointment.customerId) : "",
      guestName: appointment.guestName ?? "",
      guestPhone: appointment.guestPhone ?? "",
      guestEmail: appointment.guestEmail ?? "",
      selectedServiceId: appointment.serviceId ? String(appointment.serviceId) : "",
      selectedStaffId: appointment.staffId ? String(appointment.staffId) : "",
      scheduledDate: toDateInput(toDate(appointment.startAt)),
      scheduledTime: toTimeInput(toDate(appointment.startAt)),
      depositAmount: String(appointment.depositAmount ?? 0),
      customerNote: appointment.customerNote ?? "",
      internalNote: appointment.internalNote ?? "",
    });
    setSheetOpen(true);
  }

  async function handleCustomerSearch() {
    setError("");
    try {
      const data = await searchCustomers(token, form.customerQuery.trim() || undefined);
      setCustomerResults(data);
      if (data[0]) {
        setForm((current) => ({ ...current, selectedCustomerId: String(data[0].id) }));
      }
      setNotice(data.length === 0 ? "No matching customers found." : `Loaded ${data.length} matching customers.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search customers");
    }
  }

  async function handleSaveBooking() {
    if (selectedBranchId === null) {
      setError("Select a branch before saving.");
      return;
    }
    if (form.bookingMode === "customer" && !form.selectedCustomerId) {
      setError("Choose a customer first.");
      return;
    }

    setSaving(true);
    setError("");
    const payload: UpdateAppointmentRequest = {
      branchId: selectedBranchId,
      customerId: form.bookingMode === "customer" && form.selectedCustomerId ? Number(form.selectedCustomerId) : undefined,
      guestName: form.bookingMode === "guest" ? form.guestName.trim() || undefined : undefined,
      guestPhone: form.bookingMode === "guest" ? form.guestPhone.trim() || undefined : undefined,
      guestEmail: form.bookingMode === "guest" ? form.guestEmail.trim() || undefined : undefined,
      serviceId: form.selectedServiceId ? Number(form.selectedServiceId) : undefined,
      staffId: form.selectedStaffId ? Number(form.selectedStaffId) : undefined,
      startAt: combineDateTime(form.scheduledDate, form.scheduledTime).toISOString(),
      depositAmount: Number(form.depositAmount || 0),
      customerNote: form.customerNote.trim() || undefined,
      internalNote: form.internalNote.trim() || undefined,
    };

    try {
      const saved =
        sheetMode === "create"
          ? await createAppointment(token, payload)
          : await updateAppointment(token, selectedAppointment?.id ?? 0, payload);
      setNotice(sheetMode === "create" ? `Appointment ${saved.bookingReference} booked.` : `Appointment ${saved.bookingReference} updated.`);
      setSheetOpen(false);
      await refreshAppointments(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save appointment");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(appointment: AppointmentResponse, status: AppointmentStatus) {
    setBusyId(appointment.id);
    try {
      await updateAppointmentStatus(token, appointment.id, status);
      setNotice(`${appointment.bookingReference} is now ${humanizeStatus(status)}.`);
      await refreshAppointments(appointment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(appointment: AppointmentResponse) {
    const reason = window.prompt("Cancellation reason");
    if (!reason || !reason.trim()) return;
    setBusyId(appointment.id);
    try {
      await cancelAppointment(token, appointment.id, reason.trim());
      setNotice(`Appointment ${appointment.bookingReference} cancelled.`);
      await refreshAppointments(appointment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel appointment");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConvert(appointment: AppointmentResponse) {
    if (!canStartCheckout) {
      setError("This account cannot open POS checkout.");
      return;
    }
    onStartCheckout({
      appointmentId: appointment.id,
      bookingReference: appointment.bookingReference,
      branchId: appointment.branchId,
      customerId: appointment.customerId,
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      customerEmail: appointment.customerEmail,
      guestName: appointment.guestName,
      guestPhone: appointment.guestPhone,
      guestEmail: appointment.guestEmail,
      displayName: appointment.displayName,
      displayPhone: appointment.displayPhone,
      staffId: appointment.staffId,
      staffName: appointment.staffName,
      serviceId: appointment.serviceId,
      serviceName: appointment.serviceName,
    });
    setNotice(`Appointment ${appointment.bookingReference} loaded into POS checkout.`);
  }

  const headline = viewMode === "daily" ? "Daily Appointments" : "Weekly Schedule";
  const subtitle =
    viewMode === "daily"
      ? longDateFormatter.format(focus)
      : `${weekDateFormatter.format(weekStart)} - ${weekDateFormatter.format(addDays(weekStart, 6))}`;
  const estimatedSlot = form.scheduledDate && form.scheduledTime
    ? `${formatTime(combineDateTime(form.scheduledDate, form.scheduledTime))} - ${formatTime(new Date(combineDateTime(form.scheduledDate, form.scheduledTime).getTime() + ((selectedService?.durationMinutes ?? 60) * 60000)))}`
    : "Pick a time";

  return (
    <section className="st-appts-page">
      <header className="st-appts-hero">
        <div>
          <nav className="st-appts-breadcrumb">
            <span>Operations</span>
            <span className="material-symbols-outlined">chevron_right</span>
            <span>Calendar</span>
          </nav>
          <h2>{headline}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="st-appts-hero-actions">
          <div className="st-appts-view-switch">
            <button type="button" className={viewMode === "daily" ? "active" : ""} onClick={() => setViewMode("daily")}>Daily View</button>
            <button type="button" className={viewMode === "weekly" ? "active" : ""} onClick={() => setViewMode("weekly")}>Weekly View</button>
          </div>
          <div className="st-appts-date-nav">
            <button type="button" onClick={() => setFocusDate(toDateInput(addDays(focus, viewMode === "daily" ? -1 : -7)))}><span className="material-symbols-outlined">chevron_left</span></button>
            <button type="button" onClick={() => setFocusDate(today)}>Today</button>
            <button type="button" onClick={() => setFocusDate(toDateInput(addDays(focus, viewMode === "daily" ? 1 : 7)))}><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
        </div>
      </header>

      {error ? <p className="st-error">{error}</p> : <p className="st-appts-notice">{notice}</p>}

      <div className="st-appts-command-row">
        <button type="button" className="st-appts-filter-trigger" onClick={() => setFiltersOpen((current) => !current)}>
          <span className="material-symbols-outlined">filter_list</span>
          Filter Views
        </button>
        <button type="button" className="st-appts-primary-action" onClick={openCreateSheet}>
          <span className="material-symbols-outlined">add_task</span>
          New Booking
        </button>
      </div>

      {filtersOpen ? (
        <section className="st-appts-filter-panel">
          <div className="st-appts-filter-grid">
            <label>
              Status
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as "ALL" | AppointmentStatus)}>
                <option value="ALL">All statuses</option>
                {STATUSES.map((status) => <option key={status} value={status}>{humanizeStatus(status)}</option>)}
              </select>
            </label>
            <label>
              Team Member
              <select value={filterStaffId} onChange={(event) => setFilterStaffId(event.target.value)}>
                <option value="ALL">All staff</option>
                {activeStaff.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}
              </select>
            </label>
            <label>
              Search
              <input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder="Client, phone, ref" />
            </label>
          </div>
        </section>
      ) : null}

      {selectedBranchId === null ? (
        <section className="st-appts-empty-state">
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>Select a branch to load the scheduler.</h3>
          <p>Appointments are shown by branch here, so the board needs a branch context before it can render.</p>
        </section>
      ) : viewMode === "daily" ? (
        <section className="st-appts-daily-layout">
          <div className="st-appts-daily-frame">
            <div className="st-appts-time-rail">
              <div className="st-appts-time-rail-head"><span className="material-symbols-outlined">schedule</span></div>
              {hourSlots.map((hour) => {
                const slot = hourLabel(hour);
                return (
                  <div key={hour} className="st-appts-time-slot">
                    <span>{slot.time}</span>
                    <small>{slot.period}</small>
                  </div>
                );
              })}
            </div>

            <div className="st-appts-daily-board">
              <div className="st-appts-daily-board-head">
                <div className="st-appts-daily-board-meta">
                  <div className="st-appts-featured-team">
                    {(activeStaff.length > 0 ? activeStaff : staff).slice(0, 3).map((member) => (
                      <span key={member.id} className="st-appts-staff-bubble">{initials(member.displayName)}</span>
                    ))}
                  </div>
                  <div>
                    <strong>{selectedBranchName || "Selected branch"}</strong>
                    <span>{loading ? "Refreshing live schedule…" : `${visibleAppointments.length} bookings in view`}</span>
                  </div>
                </div>
                <div className="st-appts-daily-board-controls">
                  <button type="button" onClick={() => setFiltersOpen(true)}><span className="material-symbols-outlined">filter_list</span></button>
                  <button type="button" onClick={openCreateSheet}><span className="material-symbols-outlined">more_horiz</span></button>
                </div>
              </div>

              <div className="st-appts-daily-canvas" style={{ height: `${hourSlots.length * SLOT_HEIGHT}px` }}>
                <div className="st-appts-daily-grid" style={{ gridTemplateRows: `repeat(${hourSlots.length}, ${SLOT_HEIGHT}px)` }}>
                  {hourSlots.map((hour) => <div key={hour} />)}
                </div>
                {dailyTiles.length === 0 ? (
                  <div className="st-appts-daily-empty">
                    <span className="material-symbols-outlined">event_busy</span>
                    <h3>No appointments scheduled for this day.</h3>
                    <p>New customer bookings will appear here as soon as they are created.</p>
                  </div>
                ) : null}
                {dailyTiles.map((tile) => (
                  <button
                    key={tile.appointment.id}
                    type="button"
                    className={`st-appts-daily-tile st-appts-tone-${tile.tone}${tile.compact ? " compact" : ""}${isReceiptCompleted(tile.appointment) ? " st-appts-completed-with-receipt" : ""}`}
                    style={{
                      top: `${tile.top}px`,
                      height: `${tile.height}px`,
                      left: `calc(${tile.leftPct}% + 18px)`,
                      width: `calc(${tile.widthPct}% - ${tile.columns > 1 ? 28 : 36}px)`,
                    }}
                    onClick={() => setSelectedAppointmentId(tile.appointment.id)}
                  >
                    <div className="st-appts-daily-tile-top">
                      <div>
                        <span className="st-appts-chip">{channelLabel(tile.appointment.bookingChannel)}</span>
                        <strong>{timeRange(tile.appointment.startAt, tile.appointment.endAt)}</strong>
                      </div>
                      <span className="material-symbols-outlined">{iconName(tile.appointment)}</span>
                    </div>
                    <h3>{tile.appointment.displayName ?? "Walk-in Guest"}</h3>
                    <p>{tile.appointment.serviceName ?? "General service"} | <span>{tile.appointment.staffName ?? "Unassigned"}</span></p>
                    {!tile.compact ? <div className="st-appts-daily-tile-bottom"><span>{humanizeStatus(tile.appointment.status)}</span><span>{tile.appointment.bookingReference}</span></div> : null}
                  </button>
                ))}
              </div>
            </div>

            <aside className="st-appts-snapshot-rail">
              <div className="st-appts-snapshot-content">
                <h3>Daily Snapshot</h3>
                <article className="st-appts-snapshot-card st-appts-snapshot-primary">
                  <p>Upcoming Peak</p>
                  <h4>{peakWindow(dayAppointments)}</h4>
                  <span>{dayAppointments.length} appointments in today’s board</span>
                </article>
                <article className="st-appts-snapshot-card st-appts-snapshot-secondary">
                  <p>Digital Intake</p>
                  <h4>{visibleAppointments.filter((item) => item.bookingChannel !== "POS").length} online</h4>
                  <span>{visibleAppointments.filter((item) => item.bookingChannel === "POS").length} desk bookings</span>
                </article>
                <article className="st-appts-snapshot-card st-appts-snapshot-tertiary">
                  <p>Schedule Coverage</p>
                  <h4>{visibleAppointments.filter((item) => item.staffId === null).length === 0 ? "Fully staffed" : `${visibleAppointments.filter((item) => item.staffId === null).length} unassigned`}</h4>
                  <span>Forecast {formatCurrency(stats.forecastRevenue)}</span>
                </article>
              </div>
              <div className="st-appts-efficiency-card">
                <p>Branch Efficiency</p>
                <div className="st-appts-efficiency-bar"><div style={{ width: `${stats.efficiency}%` }} /></div>
                <div className="st-appts-efficiency-meta"><strong>{stats.efficiency}%</strong><span>{stats.totalAppointments} appointments in scope</span></div>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        <section className="st-appts-weekly-layout">
          <div className="st-appts-weekly-grid-wrap">
            <div className="st-appts-weekly-grid">
              {weekDays.map((day) => {
                const key = toDateInput(day);
                const items = weekGrouped.get(key) ?? [];
                return (
                  <article key={key} className={`st-appts-week-column${key === today ? " today" : ""}`}>
                    <header className="st-appts-week-column-head">
                      <div><p>{key === today ? "Today" : weekdayFormatter.format(day)}</p><h3>{day.getDate()}</h3></div>
                      <div><span>{items.length} Bookings</span><strong>{items.length === 0 ? "Open" : `${Math.min(99, Math.round((items.length / Math.max(activeStaff.length, 1)) * 18))}% Load`}</strong></div>
                    </header>
                    <div className="st-appts-week-column-body">
                      {items.length === 0 ? (
                        <div className="st-appts-week-empty"><span className="material-symbols-outlined">event_busy</span><p>No bookings</p><small>{monthDayFormatter.format(day)}</small></div>
                      ) : items.map((item) => (
                        <button key={item.id} type="button" className={`st-appts-week-card st-appts-tone-${toneForStatus(item.status)}${isReceiptCompleted(item) ? " st-appts-completed-with-receipt" : ""}`} onClick={() => setSelectedAppointmentId(item.id)}>
                          <div className="st-appts-week-card-top"><span>{timeRange(item.startAt, item.endAt)}</span><span className="material-symbols-outlined">{iconName(item)}</span></div>
                          <h4>{item.displayName ?? "Walk-in Guest"}</h4>
                          <p>{item.serviceName ?? "General service"}</p>
                          <small>{item.staffName ?? "Unassigned"} | {channelLabel(item.bookingChannel)}</small>
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <footer className="st-appts-weekly-footer">
            <div className="st-appts-weekly-footer-left">
              <span><i /> System Online</span>
              <span><i className="alert" /> {visibleAppointments.filter((item) => item.status === "BOOKED").length} pending check-ins</span>
            </div>
            <div className="st-appts-weekly-footer-right">Precision Curator | {selectedBranchName || "Branch schedule"} | 7-day view</div>
          </footer>
        </section>
      )}

      <section className="st-appts-stats-grid">
        <article className="st-appts-stat-card"><p>Total Appts</p><strong>{stats.totalAppointments}</strong></article>
        <article className="st-appts-stat-card"><p>Revenue Forecast</p><strong>{formatCurrency(stats.forecastRevenue)}</strong></article>
        <article className="st-appts-stat-card"><p>Digital Bookings</p><strong>{stats.digitalBookings}</strong></article>
        <article className="st-appts-stat-card"><p>Avg Duration</p><strong>{stats.averageDurationMinutes}m</strong></article>
      </section>

      <button type="button" className="st-appts-fab" onClick={openCreateSheet}><span className="material-symbols-outlined">add</span></button>
      {sheetOpen ? (
        <div className="st-appts-sheet-backdrop">
          <aside className="st-appts-sheet" role="dialog" aria-modal="true">
            <header className="st-appts-sheet-head">
              <div>
                <span>{sheetMode === "create" ? "New Booking" : "Edit Booking"}</span>
                <h3>{sheetMode === "create" ? "Appointment Booking" : "Reschedule Appointment"}</h3>
                <p>{selectedBranchName || "Selected branch"}</p>
              </div>
              <button type="button" onClick={() => setSheetOpen(false)}><span className="material-symbols-outlined">close</span></button>
            </header>
            <div className="st-appts-sheet-body">
              <section className="st-appts-sheet-section">
                <div className="st-appts-sheet-toggle">
                  <button type="button" className={form.bookingMode === "guest" ? "active" : ""} onClick={() => setForm((current) => ({ ...current, bookingMode: "guest", selectedCustomerId: "" }))}>Guest</button>
                  <button type="button" className={form.bookingMode === "customer" ? "active" : ""} onClick={() => setForm((current) => ({ ...current, bookingMode: "customer" }))}>Customer</button>
                </div>
                {form.bookingMode === "customer" ? (
                  <div className="st-appts-sheet-grid">
                    <label className="st-appts-sheet-wide">
                      Customer Search
                      <div className="st-appts-search-row">
                        <input value={form.customerQuery} onChange={(event) => setForm((current) => ({ ...current, customerQuery: event.target.value }))} placeholder="Search by name or phone" />
                        <button type="button" className="st-btn st-btn-secondary" onClick={handleCustomerSearch}>Find</button>
                      </div>
                    </label>
                    <label className="st-appts-sheet-wide">
                      Customer
                      <select value={form.selectedCustomerId} onChange={(event) => setForm((current) => ({ ...current, selectedCustomerId: event.target.value }))}>
                        <option value="">Select customer</option>
                        {form.selectedCustomerId && !customerResults.some((customer) => String(customer.id) === form.selectedCustomerId) ? (
                          <option value={form.selectedCustomerId}>{form.customerQuery || `Customer #${form.selectedCustomerId}`}</option>
                        ) : null}
                        {customerResults.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} | {customer.phone} | {customer.pointsBalance} pts</option>)}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="st-appts-sheet-grid">
                    <label>Guest Name<input value={form.guestName} onChange={(event) => setForm((current) => ({ ...current, guestName: event.target.value }))} /></label>
                    <label>Guest Phone<input value={form.guestPhone} onChange={(event) => setForm((current) => ({ ...current, guestPhone: event.target.value }))} /></label>
                    <label className="st-appts-sheet-wide">Guest Email<input value={form.guestEmail} onChange={(event) => setForm((current) => ({ ...current, guestEmail: event.target.value }))} /></label>
                  </div>
                )}
              </section>
              <section className="st-appts-sheet-section">
                <div className="st-appts-sheet-grid">
                  <label>Service<select value={form.selectedServiceId} onChange={(event) => setForm((current) => ({ ...current, selectedServiceId: event.target.value }))}><option value="">General service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
                  <label>Staff<select value={form.selectedStaffId} onChange={(event) => setForm((current) => ({ ...current, selectedStaffId: event.target.value }))}><option value="">Unassigned</option>{activeStaff.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></label>
                  <label>Date<input type="date" value={form.scheduledDate} onChange={(event) => setForm((current) => ({ ...current, scheduledDate: event.target.value }))} /></label>
                  <label>Time<input type="time" value={form.scheduledTime} onChange={(event) => setForm((current) => ({ ...current, scheduledTime: event.target.value }))} /></label>
                  <label>Deposit<input type="number" min="0" step="0.01" value={form.depositAmount} onChange={(event) => setForm((current) => ({ ...current, depositAmount: event.target.value }))} /></label>
                  <div className="st-appts-duration-card"><span>Estimated Slot</span><strong>{estimatedSlot}</strong></div>
                  <label className="st-appts-sheet-wide">Customer Note<textarea rows={3} value={form.customerNote} onChange={(event) => setForm((current) => ({ ...current, customerNote: event.target.value }))} /></label>
                  <label className="st-appts-sheet-wide">Internal Note<textarea rows={3} value={form.internalNote} onChange={(event) => setForm((current) => ({ ...current, internalNote: event.target.value }))} /></label>
                </div>
              </section>
            </div>
            <footer className="st-appts-sheet-foot">
              <button type="button" className="st-btn st-btn-secondary" onClick={() => setSheetOpen(false)}>Cancel</button>
              <button type="button" className="st-btn" onClick={handleSaveBooking} disabled={saving}>{saving ? "Saving..." : sheetMode === "create" ? "Book Appointment" : "Save Changes"}</button>
            </footer>
          </aside>
        </div>
      ) : null}

      {selectedAppointment ? (
        <div className="st-appts-modal-backdrop">
          <div className="st-appts-detail-modal" role="dialog" aria-modal="true">
            <header className="st-appts-detail-head">
              <div><span>Verification Queue</span><h3>Appointment Details</h3></div>
              <button type="button" onClick={() => setSelectedAppointmentId(null)}><span className="material-symbols-outlined">close</span></button>
            </header>
            <div className="st-appts-detail-body">
              <div className="st-appts-detail-grid">
                <section className="st-appts-detail-customer">
                  <div className="st-appts-detail-customer-head">
                    <div className="st-appts-detail-avatar">{initials(selectedAppointment.displayName ?? "Guest")}</div>
                    <div>
                      <p>Customer Name</p>
                      <h4>{selectedAppointment.displayName ?? "Walk-in Guest"}</h4>
                      <div className="st-appts-detail-tags"><span>{selectedAppointment.customerId ? "Member Profile" : "Guest Booking"}</span><span>{channelLabel(selectedAppointment.bookingChannel)}</span></div>
                    </div>
                  </div>
                  <div className="st-appts-detail-contact">
                    <div><span className="material-symbols-outlined">call</span><strong>{selectedAppointment.displayPhone ?? "No phone provided"}</strong></div>
                    <div><span className="material-symbols-outlined">mail</span><strong>{selectedAppointment.customerEmail ?? selectedAppointment.guestEmail ?? "No email provided"}</strong></div>
                  </div>
                </section>
                <div className="st-appts-detail-side">
                  <section className="st-appts-detail-status"><p>Booking Status</p><div><i className={`st-appts-status-dot st-appts-status-${selectedAppointment.status.toLowerCase()}`} /><strong>{humanizeStatus(selectedAppointment.status)}</strong></div></section>
                  <section className="st-appts-detail-duration"><p>Duration</p><div><span className="material-symbols-outlined">schedule</span><strong>{durationMinutes(selectedAppointment)} Minutes</strong></div></section>
                </div>
                <section className="st-appts-detail-service">
                  <div><label>Service Type</label><div className="st-appts-detail-service-card"><span className="material-symbols-outlined">content_cut</span><div><strong>{selectedAppointment.serviceName ?? "General service"}</strong><span>{selectedAppointment.bookingReference}</span></div></div></div>
                  <div><label>Assigned Stylist</label><div className="st-appts-detail-service-card"><div className="st-appts-detail-mini-avatar">{initials(selectedAppointment.staffName ?? "U")}</div><div><strong>{selectedAppointment.staffName ?? "Unassigned"}</strong><span>{timeRange(selectedAppointment.startAt, selectedAppointment.endAt)}</span></div></div></div>
                </section>
                <section className="st-appts-detail-meta">
                  <div><label>Deposit</label><strong>{formatCurrency(selectedAppointment.depositAmount ?? 0)}</strong></div>
                  <div><label>Confirmation</label><strong>{selectedAppointment.confirmationEmailSentAt ? "Sent" : "Pending"}</strong></div>
                  <div><label>Reminder</label><strong>{selectedAppointment.reminderEmailSentAt ? "Sent" : "Pending"}</strong></div>
                  <div><label>Receipt</label><strong>{selectedAppointment.receiptNo ?? "Not generated"}</strong></div>
                </section>
                {selectedAppointment.customerNote || selectedAppointment.internalNote ? (
                  <section className="st-appts-detail-notes">
                    {selectedAppointment.customerNote ? <div><label>Customer Note</label><p>{selectedAppointment.customerNote}</p></div> : null}
                    {selectedAppointment.internalNote ? <div><label>Internal Note</label><p>{selectedAppointment.internalNote}</p></div> : null}
                  </section>
                ) : null}
                {statusActions(selectedAppointment.status).length > 0 ? (
                  <section className="st-appts-detail-quick-actions">
                    {statusActions(selectedAppointment.status).map((action) => <button key={action.status} type="button" onClick={() => void handleStatusChange(selectedAppointment, action.status)} disabled={busyId === selectedAppointment.id}>{action.label}</button>)}
                  </section>
                ) : null}
              </div>
            </div>
            <footer className="st-appts-detail-foot">
              <div className="st-appts-detail-foot-left">
                <button type="button" onClick={() => openEditSheet(selectedAppointment)}>Reschedule</button>
                <button type="button" className="danger" onClick={() => void handleCancel(selectedAppointment)}>Cancel Appointment</button>
              </div>
              {selectedAppointment.receiptNo ? (
                <button type="button" className="st-appts-detail-convert" onClick={() => onViewReceipt(selectedAppointment.receiptNo!)}>
                  <span className="material-symbols-outlined">receipt_long</span>
                  View Receipt
                </button>
              ) : (
              <button type="button" className="st-appts-detail-convert" onClick={() => void handleConvert(selectedAppointment)} disabled={selectedAppointment.status === "CANCELLED" || selectedAppointment.status === "NO_SHOW" || selectedAppointment.serviceId === null || selectedAppointment.staffId === null || !canStartCheckout || busyId === selectedAppointment.id}>
                <span className="material-symbols-outlined">receipt_long</span>
                Open in POS
              </button>
              )}
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function emptyForm(date: string, firstService?: ServiceItemResponse, firstStaff?: StaffProfileResponse): BookingForm {
  return {
    bookingMode: "guest",
    customerQuery: "",
    selectedCustomerId: "",
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    selectedServiceId: String(firstService?.id ?? ""),
    selectedStaffId: String(firstStaff?.id ?? ""),
    scheduledDate: date,
    scheduledTime: "10:00",
    depositAmount: "0",
    customerNote: "",
    internalNote: "",
  };
}

function buildDailyTiles(appointments: AppointmentResponse[]): DailyTile[] {
  const sorted = [...appointments].sort((left, right) => toDate(left.startAt).getTime() - toDate(right.startAt).getTime());
  const clusters: AppointmentResponse[][] = [];
  let currentCluster: AppointmentResponse[] = [];
  let clusterEnd = 0;

  for (const appointment of sorted) {
    const start = toDate(appointment.startAt).getTime();
    const end = endDate(appointment).getTime();
    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(appointment);
      clusterEnd = Math.max(clusterEnd, end);
      continue;
    }
    clusters.push(currentCluster);
    currentCluster = [appointment];
    clusterEnd = end;
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters.flatMap((cluster) => {
    const laneEnds: number[] = [];
    const placements = cluster.map((appointment) => {
      const start = toDate(appointment.startAt);
      const end = endDate(appointment);
      let lane = laneEnds.findIndex((value) => value <= start.getTime());
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end.getTime());
      } else {
        laneEnds[lane] = end.getTime();
      }
      return { appointment, lane };
    });
    const columns = Math.max(1, laneEnds.length);
    return placements.map(({ appointment, lane }) => {
      const start = toDate(appointment.startAt);
      const end = endDate(appointment);
      const duration = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000));
      const top = ((start.getHours() * 60 + start.getMinutes() - START_HOUR * 60) / 60) * SLOT_HEIGHT;
      const height = Math.max((duration / 60) * SLOT_HEIGHT, 74);
      return { appointment, top, height, leftPct: (lane / columns) * 100, widthPct: 100 / columns, columns, tone: toneForStatus(appointment.status), compact: height < 108 };
    });
  });
}

function summarize(appointments: AppointmentResponse[], servicesById: Map<number, ServiceItemResponse>, staffCount: number) {
  const forecastRevenue = appointments.reduce((sum, item) => sum + (item.serviceId ? servicesById.get(item.serviceId)?.price ?? 0 : 0), 0);
  const totalMinutes = appointments.reduce((sum, item) => sum + durationMinutes(item), 0);
  const capacityMinutes = Math.max(staffCount, 1) * (END_HOUR - START_HOUR) * 60;
  return {
    totalAppointments: appointments.length,
    forecastRevenue,
    digitalBookings: appointments.filter((item) => item.bookingChannel !== "POS").length,
    averageDurationMinutes: appointments.length === 0 ? 0 : Math.round(totalMinutes / appointments.length),
    efficiency: appointments.length === 0 ? 0 : Math.min(99, Math.round((totalMinutes / capacityMinutes) * 100)),
  };
}

function statusActions(status: AppointmentStatus): Array<{ status: AppointmentStatus; label: string }> {
  if (status === "BOOKED") return [{ status: "CHECKED_IN", label: "Check In" }, { status: "NO_SHOW", label: "Mark No Show" }];
  if (status === "CHECKED_IN") return [{ status: "IN_SERVICE", label: "Start Service" }];
  return [];
}

function toneForStatus(status: AppointmentStatus): Tone {
  if (status === "BOOKED") return "primary";
  if (status === "CHECKED_IN") return "secondary";
  if (status === "IN_SERVICE") return "tertiary";
  if (status === "COMPLETED") return "neutral";
  return "muted";
}

function humanizeStatus(status: AppointmentStatus): string {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (value) => value.toUpperCase());
}

function channelLabel(channel: string): string {
  if (channel === "CUSTOMER_APP") return "Member App";
  if (channel === "WEBSITE_GUEST") return "Guest Web";
  if (channel === "POS") return "Front Desk";
  return channel.replaceAll("_", " ");
}

function isReceiptCompleted(appointment: AppointmentResponse): boolean {
  return !!appointment.receiptNo;
}

function iconName(appointment: AppointmentResponse): string {
  if (appointment.status === "IN_SERVICE") return "auto_awesome";
  if (appointment.customerId) return "face";
  if (appointment.bookingChannel === "WEBSITE_GUEST") return "travel_explore";
  return "event_note";
}

function peakWindow(appointments: AppointmentResponse[]): string {
  if (appointments.length === 0) return "No peak window";
  const counts = new Map<number, number>();
  for (const item of appointments) {
    const hour = toDate(item.startAt).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  let bestHour = START_HOUR;
  let highest = 0;
  for (const [hour, count] of counts) {
    if (count > highest) {
      bestHour = hour;
      highest = count;
    }
  }
  const start = hourLabel(bestHour);
  const end = hourLabel(bestHour + 2);
  return `${start.time} ${start.period} - ${end.time} ${end.period}`;
}

function hourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const period = normalized >= 12 ? "PM" : "AM";
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return { time: `${String(hour12).padStart(2, "0")}:00`, period };
}

function durationMinutes(appointment: AppointmentResponse): number {
  return Math.max(15, Math.round((endDate(appointment).getTime() - toDate(appointment.startAt).getTime()) / 60000));
}

function timeRange(startAt: string, endAt: string | null): string {
  return `${formatTime(toDate(startAt))} - ${formatTime(endAt ? toDate(endAt) : new Date(toDate(startAt).getTime() + 60 * 60000))}`;
}

function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function combineDateTime(dateValue: string, timeValue: string): Date {
  return new Date(`${dateValue}T${timeValue}:00`);
}

function toDate(value: string): Date {
  return new Date(value);
}

function endDate(appointment: AppointmentResponse): Date {
  return appointment.endAt ? toDate(appointment.endAt) : new Date(toDate(appointment.startAt).getTime() + 60 * 60000);
}

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function fromDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function dayStartIso(value: string): string {
  const date = fromDateInput(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function dayEndIso(value: string): string {
  const date = fromDateInput(value);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date.getTime());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

function addDays(date: Date, amount: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + amount);
  return copy;
}
