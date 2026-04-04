import { FormEvent, useEffect, useMemo, useState } from "react";
import { createCustomerAppointment, createGuestAppointment } from "../lib/api";
import { combineDateAndTime, formatCurrency, formatDateTime, getNearestTimeInput, getTodayDateInput } from "../lib/format";
import { loadPublicBranchesCached, loadPublicServicesCached, loadPublicStaffCached } from "../lib/lookups";
import { useStoredSession } from "../lib/session";
import type { AppointmentRecord, PublicBranch, PublicService, PublicStaff } from "../lib/types";

export function BookingPage() {
  const session = useStoredSession();
  const [branches, setBranches] = useState<PublicBranch[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [lookupError, setLookupError] = useState("");
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<AppointmentRecord | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState(session?.customer.email ?? "");
  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [dateValue, setDateValue] = useState(getTodayDateInput());
  const [timeValue, setTimeValue] = useState(getNearestTimeInput());
  const [customerNote, setCustomerNote] = useState("");

  useEffect(() => {
    if (session?.customer.email) {
      setGuestEmail(session.customer.email);
    }
  }, [session?.customer.email]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingLookups(true);
      try {
        const [branchData, serviceData, staffData] = await Promise.all([
          loadPublicBranchesCached(),
          loadPublicServicesCached(),
          loadPublicStaffCached(),
        ]);
        if (cancelled) {
          return;
        }
        setBranches(branchData);
        setServices(serviceData);
        setStaff(staffData);
        setBranchId((current) => current || String(branchData[0]?.id ?? ""));
        setLookupError("");
      } catch (err) {
        if (!cancelled) {
          setLookupError(err instanceof Error ? err.message : "Unable to load booking lookups");
        }
      } finally {
        if (!cancelled) {
          setLoadingLookups(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedService = useMemo(
    () => services.find((item) => item.id === Number(serviceId)) ?? null,
    [serviceId, services]
  );
  const selectedBranch = useMemo(
    () => branches.find((item) => item.id === Number(branchId)) ?? null,
    [branchId, branches]
  );
  const selectedStaff = useMemo(
    () => staff.find((item) => item.id === Number(staffId)) ?? null,
    [staffId, staff]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setCreated(null);

    try {
      const startAt = combineDateAndTime(dateValue, timeValue);
      const selectedBranchId = Number(branchId);

      if (!selectedBranchId) {
        throw new Error("Choose a branch before submitting the appointment.");
      }

      let response: AppointmentRecord;
      if (session) {
        response = await createCustomerAppointment({
          branchId: selectedBranchId,
          serviceId: serviceId ? Number(serviceId) : null,
          staffId: staffId ? Number(staffId) : null,
          startAt,
          customerNote: customerNote.trim() || undefined,
        });
      } else {
        response = await createGuestAppointment({
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim(),
          branchId: selectedBranchId,
          serviceId: serviceId ? Number(serviceId) : null,
          staffId: staffId ? Number(staffId) : null,
          startAt,
          customerNote: customerNote.trim() || undefined,
        });
      }

      setCreated(response);
      setNotice("Appointment created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create appointment");
    } finally {
      setSaving(false);
    }
  }

  const bookingDisabled = loadingLookups || !!lookupError || !branchId;

  return (
    <section className="ve-section ve-booking-page">
      <div className="ve-section-head">
        <div>
          <p className="ve-eyebrow">{session ? "Customer Booking" : "Guest Booking"}</p>
          <h1 className="ve-display-lg">Reserve a treatment using the customer-safe booking flow.</h1>
        </div>
      </div>

      <div className="ve-booking-grid">
        <form className="ve-panel ve-panel-elevated ve-form-stack" onSubmit={handleSubmit}>
          {!session ? (
            <div className="ve-form-grid">
              <label className="ve-field">
                <span>Full name</span>
                <input className="ve-input" value={guestName} onChange={(event) => setGuestName(event.target.value)} required />
              </label>
              <label className="ve-field">
                <span>Phone number</span>
                <input className="ve-input" value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} required />
              </label>
              <label className="ve-field ve-field-span">
                <span>Email address</span>
                <input className="ve-input" type="email" value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} required />
              </label>
            </div>
          ) : (
            <div className="ve-panel ve-panel-muted">
              <p className="ve-panel-title">Booking as {session.customer.name}</p>
              <p className="ve-panel-copy">{session.customer.email || session.customer.phone || "Your saved contact details will be used."}</p>
            </div>
          )}

          <div className="ve-form-grid">
            <label className="ve-field">
              <span>Branch</span>
              <select className="ve-input" value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
                <option value="">Choose branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ve-field">
              <span>Service</span>
              <select className="ve-input" value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
                <option value="">Select later</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ve-field">
              <span>Preferred specialist</span>
              <select className="ve-input" value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                <option value="">No preference</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="ve-field">
              <span>Date</span>
              <input className="ve-input" type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} required />
            </label>
            <label className="ve-field">
              <span>Time</span>
              <input className="ve-input" type="time" value={timeValue} onChange={(event) => setTimeValue(event.target.value)} required />
            </label>
            <label className="ve-field ve-field-span">
              <span>Notes</span>
              <textarea
                className="ve-input ve-textarea"
                value={customerNote}
                onChange={(event) => setCustomerNote(event.target.value)}
                placeholder="Preferred shape, sensitivity notes, or arrival requests"
              />
            </label>
          </div>

          {lookupError ? (
            <div className="ve-inline-note ve-inline-note-error">
              Public lookup APIs are not available yet. Booking is blocked until branches, services, and staff can load.
              <br />
              {lookupError}
            </div>
          ) : null}
          {notice ? <div className="ve-inline-note ve-inline-note-success">{notice}</div> : null}
          {error ? <div className="ve-inline-note ve-inline-note-error">{error}</div> : null}

          <button className="ve-button ve-button-primary ve-button-block" type="submit" disabled={saving || bookingDisabled}>
            {saving ? "Submitting..." : session ? "Book as Customer" : "Book as Guest"}
          </button>
        </form>

        <aside className="ve-panel ve-booking-summary">
          <p className="ve-eyebrow">Booking Summary</p>
          <div className="ve-summary-stack">
            <div>
              <span>Branch</span>
              <strong>{selectedBranch?.name || "Choose a branch"}</strong>
            </div>
            <div>
              <span>Service</span>
              <strong>{selectedService?.name || "You can choose later"}</strong>
            </div>
            <div>
              <span>Specialist</span>
              <strong>{selectedStaff?.displayName || "No preference"}</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>{formatDateTime(branchId ? combineDateAndTime(dateValue, timeValue) : "")}</strong>
            </div>
            <div>
              <span>Estimate</span>
              <strong>{selectedService ? formatCurrency(selectedService.price) : "Quoted after selection"}</strong>
            </div>
          </div>
          {created ? (
            <div className="ve-panel ve-panel-success">
              <p className="ve-panel-title">Booking reference: {created.bookingReference}</p>
              <p className="ve-panel-copy">Scheduled for {formatDateTime(created.startAt)}.</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
