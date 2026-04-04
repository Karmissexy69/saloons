import { useEffect, useState } from "react";
import { Page } from "../components/common/Page";
import {
  adjustCustomerPoints,
  createAdminVoucher,
  createCustomer,
  getCustomer,
  getCustomerPointsHistory,
  getCustomerVouchers,
  getLoyaltySettings,
  listAdminVouchers,
  redeemCustomerVoucher,
  searchCustomers,
  updateAdminVoucher,
  updateLoyaltySettings,
} from "../lib/api";
import type {
  BranchResponse,
  CustomerResponse,
  CustomerVoucherResponse,
  LoyaltyPointsTransactionResponse,
  LoyaltySettingsResponse,
  SaveVoucherCatalogRequest,
  VoucherCatalogResponse,
} from "../lib/types";

type Props = {
  token: string;
  branches: BranchResponse[];
};

const EMPTY_VOUCHER: SaveVoucherCatalogRequest = {
  code: "",
  name: "",
  voucherType: "FIXED_AMOUNT",
  discountValue: 0,
  pointsCost: 0,
  active: true,
};

export function LoyaltyVouchersPage({ token, branches }: Props) {
  const [settings, setSettings] = useState<LoyaltySettingsResponse | null>(null);
  const [voucherCatalog, setVoucherCatalog] = useState<VoucherCatalogResponse[]>([]);
  const [voucherDraft, setVoucherDraft] = useState<SaveVoucherCatalogRequest>(EMPTY_VOUCHER);
  const [editingVoucherId, setEditingVoucherId] = useState<number | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResponse[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [pointsHistory, setPointsHistory] = useState<LoyaltyPointsTransactionResponse[]>([]);
  const [customerVouchers, setCustomerVouchers] = useState<CustomerVoucherResponse[]>([]);
  const [pointsDelta, setPointsDelta] = useState("0");
  const [pointsRemarks, setPointsRemarks] = useState("");
  const [redeemCatalogId, setRedeemCatalogId] = useState("");
  const [notice, setNotice] = useState("Configure loyalty settings and manage member rewards.");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInitial() {
      try {
        const [settingsData, vouchersData] = await Promise.all([getLoyaltySettings(token), listAdminVouchers(token)]);
        setSettings(settingsData);
        setVoucherCatalog(vouchersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load loyalty data");
      }
    }

    void loadInitial();
  }, [token]);

  async function refreshCustomer(customerId: number) {
    const [customer, history, vouchers] = await Promise.all([
      getCustomer(token, customerId),
      getCustomerPointsHistory(token, customerId),
      getCustomerVouchers(token, customerId),
    ]);
    setSelectedCustomer(customer);
    setPointsHistory(history);
    setCustomerVouchers(vouchers);
  }

  async function handleSearchCustomers() {
    try {
      const data = await searchCustomers(token, customerQuery || undefined);
      setCustomerResults(data);
      setNotice(data.length === 0 ? "No matching customers found." : `Loaded ${data.length} customers.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search customers");
    }
  }

  async function handleCreateCustomer() {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      setError("Customer name and phone are required.");
      return;
    }
    try {
      const created = await createCustomer(token, {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim() || undefined,
      });
      setNewCustomer({ name: "", phone: "", email: "" });
      await handleSearchCustomers();
      await refreshCustomer(created.id);
      setNotice(`Customer ${created.name} created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
    }
  }

  async function handleSaveSettings() {
    if (!settings) return;
    try {
      const updated = await updateLoyaltySettings(token, {
        pointsEarnPercent: settings.pointsEarnPercent,
        pointsEnabled: settings.pointsEnabled,
        voucherRedemptionEnabled: settings.voucherRedemptionEnabled,
        reminderLeadHours: settings.reminderLeadHours,
      });
      setSettings(updated);
      setNotice("Loyalty settings updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update loyalty settings");
    }
  }

  async function handleSaveVoucher() {
    try {
      const saved = editingVoucherId === null
        ? await createAdminVoucher(token, voucherDraft)
        : await updateAdminVoucher(token, editingVoucherId, voucherDraft);
      setVoucherCatalog(editingVoucherId === null ? [saved, ...voucherCatalog] : voucherCatalog.map((item) => (item.id === saved.id ? saved : item)));
      setVoucherDraft(EMPTY_VOUCHER);
      setEditingVoucherId(null);
      setNotice(`Voucher ${saved.code} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save voucher");
    }
  }

  async function handleAdjustPoints() {
    if (!selectedCustomer) return;
    try {
      await adjustCustomerPoints(token, selectedCustomer.id, { pointsDelta: Number(pointsDelta), remarks: pointsRemarks.trim() });
      await refreshCustomer(selectedCustomer.id);
      setPointsDelta("0");
      setPointsRemarks("");
      setNotice("Points updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust points");
    }
  }

  async function handleRedeemVoucher() {
    if (!selectedCustomer || !redeemCatalogId) return;
    try {
      await redeemCustomerVoucher(token, selectedCustomer.id, Number(redeemCatalogId));
      await refreshCustomer(selectedCustomer.id);
      setNotice("Voucher redeemed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem voucher");
    }
  }

  return (
    <Page title="Loyalty & Vouchers" subtitle="Points rules, voucher catalog, and member balances">
      <section className="st-settings-grid">
        <article className="st-settings-panel">
          <h3>Loyalty Settings</h3>
          {settings ? (
            <>
              <div className="st-grid two">
                <label>
                  Earn %
                  <input type="number" value={settings.pointsEarnPercent} onChange={(e) => setSettings({ ...settings, pointsEarnPercent: Number(e.target.value) })} />
                </label>
                <label>
                  Reminder Hours
                  <input type="number" value={settings.reminderLeadHours} onChange={(e) => setSettings({ ...settings, reminderLeadHours: Number(e.target.value) })} />
                </label>
                <label>
                  Points
                  <select value={settings.pointsEnabled ? "true" : "false"} onChange={(e) => setSettings({ ...settings, pointsEnabled: e.target.value === "true" })}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </label>
                <label>
                  Vouchers
                  <select value={settings.voucherRedemptionEnabled ? "true" : "false"} onChange={(e) => setSettings({ ...settings, voucherRedemptionEnabled: e.target.value === "true" })}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </label>
              </div>
              <div className="st-actions"><button className="st-btn" onClick={handleSaveSettings}>Save Settings</button></div>
            </>
          ) : <p>Loading...</p>}
        </article>

        <article className="st-settings-panel">
          <h3>Voucher Catalog</h3>
          <div className="st-grid two">
            <label>Code<input value={voucherDraft.code} onChange={(e) => setVoucherDraft({ ...voucherDraft, code: e.target.value })} /></label>
            <label>Name<input value={voucherDraft.name} onChange={(e) => setVoucherDraft({ ...voucherDraft, name: e.target.value })} /></label>
            <label>Type<select value={voucherDraft.voucherType} onChange={(e) => setVoucherDraft({ ...voucherDraft, voucherType: e.target.value as SaveVoucherCatalogRequest["voucherType"] })}><option value="FIXED_AMOUNT">Fixed</option><option value="PERCENTAGE">Percent</option><option value="SERVICE">Service</option></select></label>
            <label>Discount<input type="number" value={voucherDraft.discountValue} onChange={(e) => setVoucherDraft({ ...voucherDraft, discountValue: Number(e.target.value) })} /></label>
            <label>Points Cost<input type="number" value={voucherDraft.pointsCost} onChange={(e) => setVoucherDraft({ ...voucherDraft, pointsCost: Number(e.target.value) })} /></label>
            <label>Branch<select value={voucherDraft.branchId ?? ""} onChange={(e) => setVoucherDraft({ ...voucherDraft, branchId: e.target.value ? Number(e.target.value) : undefined })}><option value="">All Branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          </div>
          <div className="st-actions"><button className="st-btn" onClick={handleSaveVoucher}>{editingVoucherId === null ? "Create Voucher" : "Update Voucher"}</button></div>
        </article>
      </section>

      <section className="st-settings-grid">
        <article className="st-settings-panel">
          <h3>Create Member</h3>
          <div className="st-grid two">
            <label>Name<input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} /></label>
            <label>Phone<input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} /></label>
            <label>Email<input value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} /></label>
          </div>
          <div className="st-actions"><button className="st-btn" onClick={handleCreateCustomer}>Create Member</button></div>
        </article>

        <article className="st-settings-panel">
          <h3>Customer Search</h3>
          <div className="st-grid two">
            <label>Search<input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Name, phone, email" /></label>
          </div>
          <div className="st-actions"><button className="st-btn st-btn-secondary" onClick={handleSearchCustomers}>Search</button></div>
          <div className="st-table-wrap">
            <table className="st-table"><thead><tr><th>Name</th><th>Phone</th><th>Points</th><th /></tr></thead><tbody>{customerResults.map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.phone}</td><td>{customer.pointsBalance}</td><td><button className="st-link-btn" onClick={() => void refreshCustomer(customer.id)}>View</button></td></tr>)}</tbody></table>
          </div>
        </article>
      </section>

      <section className="st-settings-panel">
        <h3>Voucher Directory</h3>
        <div className="st-table-wrap">
          <table className="st-table"><thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Points</th><th>Status</th><th /></tr></thead><tbody>{voucherCatalog.map((voucher) => <tr key={voucher.id}><td>{voucher.code}</td><td>{voucher.name}</td><td>{voucher.voucherType}</td><td>{voucher.pointsCost}</td><td>{voucher.active ? "ACTIVE" : "INACTIVE"}</td><td><button className="st-link-btn" onClick={() => { setEditingVoucherId(voucher.id); setVoucherDraft({ code: voucher.code, name: voucher.name, description: voucher.description ?? undefined, voucherType: voucher.voucherType as SaveVoucherCatalogRequest["voucherType"], discountValue: voucher.discountValue, pointsCost: voucher.pointsCost, minSpend: voucher.minSpend ?? undefined, branchId: voucher.branchId ?? undefined, serviceId: voucher.serviceId ?? undefined, active: voucher.active, validFrom: voucher.validFrom ?? undefined, validTo: voucher.validTo ?? undefined, dailyRedemptionLimit: voucher.dailyRedemptionLimit ?? undefined }); }}>Edit</button></td></tr>)}</tbody></table>
        </div>
      </section>

      {selectedCustomer ? (
        <section className="st-settings-grid">
          <article className="st-settings-panel">
            <h3>Customer Summary</h3>
            <p>{selectedCustomer.name} • {selectedCustomer.phone}</p>
            <p>Points: {selectedCustomer.pointsBalance} • Visits: {selectedCustomer.totalVisits} • Spend: {selectedCustomer.totalSpend}</p>
            <div className="st-grid two">
              <label>Points Delta<input type="number" value={pointsDelta} onChange={(e) => setPointsDelta(e.target.value)} /></label>
              <label>Remarks<input value={pointsRemarks} onChange={(e) => setPointsRemarks(e.target.value)} /></label>
              <label>Redeem Voucher<select value={redeemCatalogId} onChange={(e) => setRedeemCatalogId(e.target.value)}><option value="">Select voucher</option>{voucherCatalog.filter((item) => item.active).map((voucher) => <option key={voucher.id} value={voucher.id}>{voucher.code} • {voucher.pointsCost} pts</option>)}</select></label>
            </div>
            <div className="st-actions"><button className="st-btn st-btn-secondary" onClick={handleAdjustPoints}>Adjust Points</button><button className="st-btn" onClick={handleRedeemVoucher}>Redeem Voucher</button></div>
          </article>
          <article className="st-settings-panel">
            <h3>Points Ledger</h3>
            <div className="st-table-wrap">
              <table className="st-table"><thead><tr><th>Date</th><th>Type</th><th>Delta</th><th>Balance</th></tr></thead><tbody>{pointsHistory.map((entry) => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString()}</td><td>{entry.entryType}</td><td>{entry.pointsDelta}</td><td>{entry.balanceAfter}</td></tr>)}</tbody></table>
            </div>
          </article>
          <article className="st-settings-panel">
            <h3>Customer Vouchers</h3>
            <div className="st-table-wrap">
              <table className="st-table"><thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Redeemed</th></tr></thead><tbody>{customerVouchers.map((voucher) => <tr key={voucher.id}><td>{voucher.code}</td><td>{voucher.name}</td><td>{voucher.status}</td><td>{new Date(voucher.redeemedAt).toLocaleString()}</td></tr>)}</tbody></table>
            </div>
          </article>
        </section>
      ) : null}

      {error ? <p className="st-error">{error}</p> : <p>{notice}</p>}
    </Page>
  );
}
