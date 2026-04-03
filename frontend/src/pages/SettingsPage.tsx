import { useEffect, useMemo, useState } from "react";
import { Page } from "../components/common/Page";
import { createBranch, listSettings, updateBranch, updateSetting } from "../lib/api";
import type { AppSettingResponse, BranchResponse } from "../lib/types";

type Props = {
  token: string;
  branches: BranchResponse[];
  onBranchesChanged: () => void;
};

type BranchDraft = {
  name: string;
  address: string;
  active: boolean;
};

const RECEIPT_BUSINESS_NAME_KEY = "receipt.businessName";
const DEFAULT_RECEIPT_NAME = "BrowPOS";

export function SettingsPage({ token, branches, onBranchesChanged }: Props) {
  const [settings, setSettings] = useState<AppSettingResponse[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingReceiptName, setSavingReceiptName] = useState(false);
  const [savingBranchId, setSavingBranchId] = useState<number | null>(null);
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [receiptBusinessName, setReceiptBusinessName] = useState(DEFAULT_RECEIPT_NAME);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchActive, setNewBranchActive] = useState(true);
  const [branchDrafts, setBranchDrafts] = useState<Record<number, BranchDraft>>({});

  const [notice, setNotice] = useState("Manage branch setup and receipt branding.");
  const [error, setError] = useState("");

  const currentSavedReceiptName = useMemo(
    () => settings.find((entry) => entry.key === RECEIPT_BUSINESS_NAME_KEY)?.value ?? DEFAULT_RECEIPT_NAME,
    [settings]
  );

  useEffect(() => {
    setBranchDrafts(
      Object.fromEntries(
        branches.map((branch) => [
          branch.id,
          {
            name: branch.name,
            address: branch.address ?? "",
            active: branch.active,
          },
        ])
      )
    );
  }, [branches]);

  useEffect(() => {
    async function loadSettingsData() {
      setLoadingSettings(true);
      setError("");
      try {
        const data = await listSettings(token);
        setSettings(data);
        setReceiptBusinessName(data.find((entry) => entry.key === RECEIPT_BUSINESS_NAME_KEY)?.value ?? DEFAULT_RECEIPT_NAME);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoadingSettings(false);
      }
    }

    void loadSettingsData();
  }, [token]);

  async function handleSaveReceiptName() {
    if (!receiptBusinessName.trim()) {
      setError("Receipt name is required.");
      return;
    }

    setSavingReceiptName(true);
    setError("");
    try {
      const updated = await updateSetting(token, RECEIPT_BUSINESS_NAME_KEY, receiptBusinessName.trim());
      setSettings((current) => mergeSetting(current, updated));
      setReceiptBusinessName(updated.value);
      setNotice("Receipt display name updated. New receipts will use this title.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update receipt name");
    } finally {
      setSavingReceiptName(false);
    }
  }

  async function handleCreateBranch() {
    if (!newBranchName.trim()) {
      setError("Branch name is required.");
      return;
    }

    setCreatingBranch(true);
    setError("");
    try {
      await createBranch(token, {
        name: newBranchName.trim(),
        address: newBranchAddress.trim() || undefined,
        active: newBranchActive,
      });
      setNewBranchName("");
      setNewBranchAddress("");
      setNewBranchActive(true);
      setNotice("Branch created.");
      onBranchesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setCreatingBranch(false);
    }
  }

  async function handleSaveBranch(branchId: number) {
    const draft = branchDrafts[branchId];
    if (!draft || !draft.name.trim()) {
      setError("Branch name is required.");
      return;
    }

    setSavingBranchId(branchId);
    setError("");
    try {
      await updateBranch(token, branchId, {
        name: draft.name.trim(),
        address: draft.address.trim() || undefined,
        active: draft.active,
      });
      setNotice(`Branch ${draft.name.trim()} updated.`);
      onBranchesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update branch");
    } finally {
      setSavingBranchId(null);
    }
  }

  function updateDraft(branchId: number, patch: Partial<BranchDraft>) {
    setBranchDrafts((current) => ({
      ...current,
      [branchId]: {
        ...current[branchId],
        ...patch,
      },
    }));
  }

  return (
    <Page title="Settings" subtitle="Configure receipt branding and branch information for the terminal">
      <section className="st-settings-grid">
        <article className="st-settings-panel">
          <div className="st-settings-panel-head">
            <div>
              <h3>Receipt Branding</h3>
              <p>Change the title printed at the top of newly generated receipts.</p>
            </div>
            <span className="st-badge">{loadingSettings ? "LOADING" : "LIVE"}</span>
          </div>

          <div className="st-grid">
            <label>
              Receipt Display Name
              <input
                value={receiptBusinessName}
                onChange={(event) => setReceiptBusinessName(event.target.value)}
                placeholder="BrowPOS"
              />
            </label>
          </div>

          <p className="st-settings-note">Current saved value: {currentSavedReceiptName}</p>

          <div className="st-actions">
            <button className="st-btn" onClick={handleSaveReceiptName} disabled={savingReceiptName || loadingSettings}>
              {savingReceiptName ? "Saving..." : "Save Receipt Name"}
            </button>
          </div>
        </article>

        <article className="st-settings-panel">
          <div className="st-settings-panel-head">
            <div>
              <h3>Create Branch</h3>
              <p>Add a branch with the receipt address that should print under the branch name.</p>
            </div>
          </div>

          <div className="st-grid">
            <label>
              Branch Name
              <input
                value={newBranchName}
                onChange={(event) => setNewBranchName(event.target.value)}
                placeholder="Mid Valley Branch"
              />
            </label>
            <label>
              Address
              <textarea
                rows={4}
                value={newBranchAddress}
                onChange={(event) => setNewBranchAddress(event.target.value)}
                placeholder="Lot 2-18, Mid Valley Megamall&#10;Kuala Lumpur"
              />
            </label>
            <label>
              Status
              <select
                value={newBranchActive ? "ACTIVE" : "INACTIVE"}
                onChange={(event) => setNewBranchActive(event.target.value === "ACTIVE")}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>

          <div className="st-actions">
            <button className="st-btn" onClick={handleCreateBranch} disabled={creatingBranch}>
              {creatingBranch ? "Creating..." : "Create Branch"}
            </button>
          </div>
        </article>
      </section>

      <section className="st-settings-panel">
        <div className="st-settings-panel-head">
          <div>
            <h3>Branch Directory</h3>
            <p>Edit branch names, addresses, and active status. Receipt printing uses the saved address here.</p>
          </div>
        </div>

        <div className="st-settings-branch-list">
          {branches.length === 0 ? (
            <p className="st-settings-note">No branches available.</p>
          ) : (
            branches.map((branch) => {
              const draft = branchDrafts[branch.id];
              if (!draft) {
                return null;
              }

              return (
                <article key={branch.id} className="st-settings-branch-card">
                  <div className="st-settings-branch-row">
                    <strong>{branch.name}</strong>
                    <span className={draft.active ? "st-badge st-badge-success" : "st-badge"}>{draft.active ? "ACTIVE" : "INACTIVE"}</span>
                  </div>

                  <div className="st-grid">
                    <label>
                      Branch Name
                      <input value={draft.name} onChange={(event) => updateDraft(branch.id, { name: event.target.value })} />
                    </label>
                    <label>
                      Address
                      <textarea
                        rows={3}
                        value={draft.address}
                        onChange={(event) => updateDraft(branch.id, { address: event.target.value })}
                        placeholder="Branch address for receipts"
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={draft.active ? "ACTIVE" : "INACTIVE"}
                        onChange={(event) => updateDraft(branch.id, { active: event.target.value === "ACTIVE" })}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </label>
                  </div>

                  <div className="st-actions">
                    <button className="st-btn st-btn-secondary" onClick={() => handleSaveBranch(branch.id)} disabled={savingBranchId === branch.id}>
                      {savingBranchId === branch.id ? "Saving..." : "Save Branch"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {error ? <p className="st-error">{error}</p> : <p>{notice}</p>}
    </Page>
  );
}

function mergeSetting(current: AppSettingResponse[], updated: AppSettingResponse): AppSettingResponse[] {
  const existing = current.find((entry) => entry.key === updated.key);
  if (!existing) {
    return [...current, updated].sort((left, right) => left.key.localeCompare(right.key));
  }
  return current.map((entry) => (entry.key === updated.key ? updated : entry));
}
