import { FormEvent, useEffect, useMemo, useState } from "react";
import { createCustomerAppointment, createGuestAppointment } from "../lib/api";
import { combineDateAndTime, formatCurrency, formatDateTime, getNearestTimeInput, getTodayDateInput } from "../lib/format";
import { loadPublicBranchesCached, loadPublicServicesCached, loadPublicStaffCached } from "../lib/lookups";
import { useStoredSession } from "../lib/session";
import type { AppointmentRecord, PublicBranch, PublicService, PublicStaff } from "../lib/types";

const SLOT_INTERVAL_MINUTES = 15;

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
  const branchHoursLabel = useMemo(() => formatBranchHoursLabel(selectedBranch), [selectedBranch]);
  const bookingTimeState = useMemo(
    () => buildBookingTimeState(selectedBranch, selectedService, dateValue),
    [dateValue, selectedBranch, selectedService]
  );

  useEffect(() => {
    const nextValues = bookingTimeState.options.map((option) => option.value);
    setTimeValue((current) => {
      if (nextValues.length === 0) {
        return "";
      }
      return nextValues.includes(current) ? current : nextValues[0];
    });
  }, [bookingTimeState.options]);

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
      if (bookingTimeState.options.length === 0) {
        throw new Error(bookingTimeState.warningText || "No bookable appointment times are available for this branch.");
      }
      if (!timeValue) {
        throw new Error("Choose one of the available appointment times before submitting.");
      }
      if (!bookingTimeState.options.some((option) => option.value === timeValue)) {
        throw new Error(`Choose a time within ${branchHoursLabel} for ${selectedBranch?.name || "the selected branch"}.`);
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

  const bookingDisabled = loadingLookups || !!lookupError || !branchId || bookingTimeState.options.length === 0 || !timeValue;

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
              <p className="ve-panel-copy">
                {selectedBranch ? `Online booking hours: ${branchHoursLabel}` : "Select a branch to see available booking hours."}
              </p>
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
              <input
                className="ve-input"
                type="date"
                value={dateValue}
                min={getTodayDateInput()}
                onChange={(event) => setDateValue(event.target.value)}
                required
              />
            </label>
            <label className="ve-field">
              <span>Time</span>
              <select
                className="ve-input"
                value={timeValue}
                onChange={(event) => setTimeValue(event.target.value)}
                disabled={!selectedBranch || bookingTimeState.options.length === 0}
                required
              >
                <option value="">
                  {!selectedBranch
                    ? "Choose branch first"
                    : bookingTimeState.options.length === 0
                      ? "No times available"
                      : "Choose time"}
                </option>
                {bookingTimeState.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="ve-panel-copy">{bookingTimeState.helperText}</p>
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
          {!lookupError && selectedBranch && bookingTimeState.warningText ? (
            <div className="ve-inline-note ve-inline-note-warning">{bookingTimeState.warningText}</div>
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
              <span>Hours</span>
              <strong>{selectedBranch ? branchHoursLabel : "Select a branch"}</strong>
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
              <strong>{formatDateTime(branchId && timeValue ? combineDateAndTime(dateValue, timeValue) : "")}</strong>
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

interface BookingTimeOption {
  label: string;
  value: string;
}

interface BookingTimeState {
  helperText: string;
  options: BookingTimeOption[];
  warningText: string;
}

function buildBookingTimeState(branch: PublicBranch | null, service: PublicService | null, dateValue: string): BookingTimeState {
  if (!branch) {
    return {
      helperText: "Select a branch to see the available booking times.",
      options: [],
      warningText: "",
    };
  }

  const openingMinutes = toMinutes(branch.openingTime);
  const closingMinutes = toMinutes(branch.closingTime);
  const hoursLabel = formatBranchHoursLabel(branch);

  if (openingMinutes == null || closingMinutes == null || closingMinutes <= openingMinutes) {
    return {
      helperText: "This branch has no valid online booking hours yet.",
      options: [],
      warningText: `Online booking is unavailable because ${branch.name} does not have a valid booking window configured.`,
    };
  }

  const durationMinutes = Math.max(service?.durationMinutes ?? 0, 0);
  const sameDay = dateValue === getTodayDateInput();
  const nowMinutes = sameDay ? roundUpToSlot(getNowInMinutes()) : openingMinutes;
  const earliestStart = roundUpToSlot(Math.max(openingMinutes, nowMinutes));
  const latestStartBase = durationMinutes > 0 ? closingMinutes - durationMinutes : closingMinutes - SLOT_INTERVAL_MINUTES;
  const latestStart = roundDownToSlot(latestStartBase);
  const helperText =
    durationMinutes > 0
      ? `Available ${hoursLabel}. Last start time already reflects the ${durationMinutes}-minute service duration.`
      : `Available ${hoursLabel}.`;

  if (latestStart < earliestStart) {
    return {
      helperText,
      options: [],
      warningText:
        durationMinutes > 0 && service
          ? `${service.name} no longer fits inside ${branch.name}'s booking hours for the selected date.`
          : `No bookable times remain for ${branch.name} on the selected date.`,
    };
  }

  const options: BookingTimeOption[] = [];
  for (let minutes = earliestStart; minutes <= latestStart; minutes += SLOT_INTERVAL_MINUTES) {
    const value = fromMinutes(minutes);
    options.push({
      label: formatClockTime(value),
      value,
    });
  }

  return {
    helperText,
    options,
    warningText: "",
  };
}

function formatBranchHoursLabel(branch: PublicBranch | null) {
  const opening = normalizeTime(branch?.openingTime);
  const closing = normalizeTime(branch?.closingTime);

  if (!opening || !closing) {
    return "Hours unavailable";
  }

  return `${formatClockTime(opening)} - ${formatClockTime(closing)}`;
}

function normalizeTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const [hours = "", minutes = ""] = value.trim().split(":");
  const normalizedHours = Number(hours);
  const normalizedMinutes = Number(minutes);

  if (!Number.isInteger(normalizedHours) || !Number.isInteger(normalizedMinutes)) {
    return "";
  }

  return `${String(normalizedHours).padStart(2, "0")}:${String(normalizedMinutes).padStart(2, "0")}`;
}

function toMinutes(value?: string | null) {
  const normalized = normalizeTime(value);
  if (!normalized) {
    return null;
  }

  const [hours, minutes] = normalized.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function fromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatClockTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2024, 0, 1, hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-MY", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getNowInMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function roundUpToSlot(minutes: number) {
  return Math.ceil(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
}

function roundDownToSlot(minutes: number) {
  return Math.floor(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
}
