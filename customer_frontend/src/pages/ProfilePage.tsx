import { FormEvent, useEffect, useState } from "react";
import { getCustomerMe, updateCustomerMe } from "../lib/api";
import { toDateInputValue } from "../lib/format";
import { loadPublicStaffCached } from "../lib/lookups";
import { useStoredSession } from "../lib/session";
import type { PublicStaff } from "../lib/types";

export function ProfilePage() {
  const session = useStoredSession();
  const customer = session?.customer;
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [birthday, setBirthday] = useState(toDateInputValue(customer?.birthday));
  const [favoriteStaffId, setFavoriteStaffId] = useState(customer?.favoriteStaffId ? String(customer.favoriteStaffId) : "");
  const [secondaryFavoriteStaffId, setSecondaryFavoriteStaffId] = useState(
    customer?.secondaryFavoriteStaffId ? String(customer.secondaryFavoriteStaffId) : ""
  );
  const [marketingOptIn, setMarketingOptIn] = useState(customer?.marketingOptIn ?? false);
  const [notes, setNotes] = useState(customer?.notes ?? "");

  useEffect(() => {
    if (!customer) {
      return;
    }
    setName(customer.name ?? "");
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setBirthday(toDateInputValue(customer.birthday));
    setFavoriteStaffId(customer.favoriteStaffId ? String(customer.favoriteStaffId) : "");
    setSecondaryFavoriteStaffId(customer.secondaryFavoriteStaffId ? String(customer.secondaryFavoriteStaffId) : "");
    setMarketingOptIn(customer.marketingOptIn);
    setNotes(customer.notes ?? "");
  }, [customer]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingStaff(true);
      try {
        const [staffData] = await Promise.all([loadPublicStaffCached(), getCustomerMe()]);
        if (!cancelled) {
          setStaff(staffData);
          setLookupError("");
        }
      } catch (err) {
        if (!cancelled) {
          setLookupError(err instanceof Error ? err.message : "Unable to load staff options");
        }
      } finally {
        if (!cancelled) {
          setLoadingStaff(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");

    try {
      await updateCustomerMe({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        birthday: birthday || null,
        favoriteStaffId: favoriteStaffId ? Number(favoriteStaffId) : null,
        secondaryFavoriteStaffId: secondaryFavoriteStaffId ? Number(secondaryFavoriteStaffId) : null,
        marketingOptIn,
        notes: notes.trim(),
      });
      setNotice("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update your profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ve-account-section">
      <div className="ve-section-head">
        <div>
          <p className="ve-eyebrow">Profile</p>
          <h1 className="ve-display-md">Update your customer identity, contact info, and preferred specialists.</h1>
        </div>
      </div>

      <form className="ve-panel ve-panel-elevated ve-form-stack" onSubmit={handleSubmit}>
        <div className="ve-form-grid">
          <label className="ve-field">
            <span>Full name</span>
            <input className="ve-input" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="ve-field">
            <span>Phone</span>
            <input className="ve-input" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="ve-field">
            <span>Email</span>
            <input className="ve-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="ve-field">
            <span>Birthday</span>
            <input className="ve-input" type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} />
          </label>
          <label className="ve-field">
            <span>Favorite specialist</span>
            <select className="ve-input" value={favoriteStaffId} onChange={(event) => setFavoriteStaffId(event.target.value)} disabled={loadingStaff}>
              <option value="">No preference</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="ve-field">
            <span>Backup specialist</span>
            <select
              className="ve-input"
              value={secondaryFavoriteStaffId}
              onChange={(event) => setSecondaryFavoriteStaffId(event.target.value)}
              disabled={loadingStaff}
            >
              <option value="">No preference</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="ve-field ve-field-span">
            <span>Notes</span>
            <textarea
              className="ve-input ve-textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Sensitivity notes, preferred brow style, or visit preferences"
            />
          </label>
        </div>

        <label className="ve-check">
          <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} />
          <span>Send me promotions, loyalty campaigns, and appointment reminders.</span>
        </label>

        {lookupError ? <div className="ve-inline-note ve-inline-note-warning">{lookupError}</div> : null}
        {notice ? <div className="ve-inline-note ve-inline-note-success">{notice}</div> : null}
        {error ? <div className="ve-inline-note ve-inline-note-error">{error}</div> : null}

        <button className="ve-button ve-button-primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </section>
  );
}
