import { useEffect, useState } from "react";
import { Page } from "../components/common/Page";
import { createService, listServices } from "../lib/api";
import type { CommissionRuleType, ServiceItemResponse } from "../lib/types";

type Props = { token: string };

export function ServiceCatalogPage({ token }: Props) {
  const [services, setServices] = useState<ServiceItemResponse[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [categoryName, setCategoryName] = useState("Brows");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("65");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [commissionType, setCommissionType] = useState<CommissionRuleType>("PERCENTAGE");
  const [commissionValue, setCommissionValue] = useState("10");

  const [notice, setNotice] = useState("Maintain your active service catalog.");
  const [error, setError] = useState("");

  async function refreshServices() {
    setLoadingServices(true);
    setError("");
    try {
      const data = await listServices(token);
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setLoadingServices(false);
    }
  }

  useEffect(() => {
    refreshServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Service name is required.");
      return;
    }

    setError("");
    try {
      const created = await createService(token, {
        categoryName,
        name: name.trim(),
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        commissionType,
        commissionValue: Number(commissionValue),
        active: true,
      });

      setNotice(`${created.name} has been added to the service catalog.`);
      setName("");
      await refreshServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create service");
    }
  }

  return (
    <Page title="Service Catalog" subtitle="Refine treatment offerings, pricing, and payouts">
      <section className="st-service-layout">
        <div className="st-service-table-panel">
          <div className="st-service-toolbar">
            <h3>Active Services</h3>
            <button className="st-btn st-btn-secondary" onClick={refreshServices} disabled={loadingServices}>
              {loadingServices ? "Refreshing..." : "Refresh Catalog"}
            </button>
          </div>

          <div className="st-table-wrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No services available.</td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id}>
                      <td>{service.name}</td>
                      <td>{service.categoryName}</td>
                      <td>{service.durationMinutes} min</td>
                      <td>${service.price.toFixed(2)}</td>
                      <td>
                        {service.commissionType === "PERCENTAGE"
                          ? `${service.commissionValue}%`
                          : `$${service.commissionValue.toFixed(2)}`}
                      </td>
                      <td>
                        <span className="st-badge st-badge-success">ACTIVE</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="st-service-side-panel">
          <h3>Create Service</h3>
          <p>Define pricing, duration, and commission structure.</p>

          <div className="st-grid">
            <label>
              Category
              <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Brows / Facials / Lashes" />
            </label>
            <label>
              Service Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Signature Brow Sculpt" />
            </label>
            <label>
              Price
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <label>
              Duration (minutes)
              <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
            </label>
            <label>
              Commission Type
              <select value={commissionType} onChange={(e) => setCommissionType(e.target.value as CommissionRuleType)}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </select>
            </label>
            <label>
              Commission Value
              <input type="number" step="0.01" value={commissionValue} onChange={(e) => setCommissionValue(e.target.value)} />
            </label>
          </div>

          <div className="st-actions">
            <button className="st-btn" onClick={handleCreate}>
              Add Service
            </button>
          </div>
        </aside>
      </section>

      {error ? <p className="st-error">{error}</p> : <p>{notice}</p>}
    </Page>
  );
}
