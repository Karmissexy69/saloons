import { useEffect, useMemo, useState } from "react";
import { createTransaction, listServices, listStaff } from "../lib/api";
import type { PaymentMethod, ServiceItemResponse, StaffProfileResponse } from "../lib/types";

type Props = { token: string };

type CartLine = {
  serviceId: number;
  serviceName: string;
  unitPrice: number;
  qty: number;
  assignedStaffId?: number;
};

const PAYMENT_OPTIONS: PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "QR"];

export function PosTerminalPage({ token }: Props) {
  const [services, setServices] = useState<ServiceItemResponse[]>([]);
  const [staff, setStaff] = useState<StaffProfileResponse[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [cashierId, setCashierId] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountTotal, setDiscountTotal] = useState("0");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [paymentReference, setPaymentReference] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("Select services to begin a new transaction.");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setError("");
      try {
        const [serviceData, staffData] = await Promise.all([listServices(token), listStaff(token)]);
        setServices(serviceData);
        setStaff(staffData.filter((item) => item.active));

        const firstCashier = staffData.find((item) => item.active && item.roleType.toUpperCase().includes("CASH"));
        if (firstCashier) {
          setCashierId(String(firstCashier.id));
        } else if (staffData.length > 0) {
          setCashierId(String(staffData[0].id));
        }

        const firstActiveStaff = staffData.find((item) => item.active);
        if (firstActiveStaff) {
          setAssignedStaffId(String(firstActiveStaff.id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load terminal data");
      }
    }

    loadData();
  }, [token]);

  const categories = useMemo(() => {
    const all = Array.from(new Set(services.map((item) => item.categoryName))).sort();
    return ["ALL", ...all];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const byCategory = categoryFilter === "ALL" || service.categoryName === categoryFilter;
      const bySearch = `${service.name} ${service.categoryName}`.toLowerCase().includes(search.toLowerCase().trim());
      return byCategory && bySearch;
    });
  }, [services, categoryFilter, search]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0), [cart]);

  const netBeforeTax = useMemo(() => {
    const total = subtotal - Number(discountTotal || 0);
    return total > 0 ? total : 0;
  }, [subtotal, discountTotal]);

  const gstAmount = useMemo(() => netBeforeTax * 0.1, [netBeforeTax]);
  const finalTotal = useMemo(() => netBeforeTax + gstAmount, [netBeforeTax, gstAmount]);

  function addService(service: ServiceItemResponse) {
    setCart((current) => {
      const existing = current.find((line) => line.serviceId === service.id);
      if (existing) {
        return current.map((line) => (line.serviceId === service.id ? { ...line, qty: line.qty + 1 } : line));
      }

      return [
        ...current,
        {
          serviceId: service.id,
          serviceName: service.name,
          unitPrice: service.price,
          qty: 1,
          assignedStaffId: assignedStaffId ? Number(assignedStaffId) : undefined,
        },
      ];
    });
  }

  function removeLine(serviceId: number) {
    setCart((current) => current.filter((line) => line.serviceId !== serviceId));
  }

  function changeAssignedStaff(staffId: string) {
    setAssignedStaffId(staffId);
    setCart((current) =>
      current.map((line) => ({
        ...line,
        assignedStaffId: staffId ? Number(staffId) : undefined,
      }))
    );
  }

  function staffNameById(id?: number) {
    if (!id) return "Unassigned";
    return staff.find((member) => member.id === id)?.displayName ?? "Unassigned";
  }

  function shortStaffName(id?: number) {
    const full = staffNameById(id);
    if (full === "Unassigned") return full;
    const parts = full.trim().split(/\s+/);
    if (parts.length < 2) return parts[0];
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  }

  function categoryIcon(name: string): string {
    const normalized = name.toLowerCase();
    if (normalized.includes("brow")) return "face";
    if (normalized.includes("facial") || normalized.includes("skin")) return "spa";
    if (normalized.includes("lash")) return "visibility";
    if (normalized.includes("wax")) return "front_hand";
    return "content_cut";
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      setError("Add at least one service to cart.");
      return;
    }

    if (cashierId.trim().length === 0) {
      setError("Please choose cashier profile.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await createTransaction(token, {
        branchId: 1,
        cashierId: Number(cashierId),
        discountTotal: Number(discountTotal || 0),
        lines: cart.map((line) => ({
          serviceId: line.serviceId,
          qty: line.qty,
          discountAmount: 0,
          assignedStaffId: line.assignedStaffId,
        })),
        payments: [
          {
            method: paymentMethod,
            amount: finalTotal,
            referenceNo: paymentReference.trim() || undefined,
          },
        ],
      });

      setNotice(`Transaction complete. Receipt ${response.receiptNo} generated.`);
      setCart([]);
      setPaymentReference("");
      setDiscountTotal("0");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit transaction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="st-pos-terminal-page">
      <div className="st-pos-terminal-main">
        <section className="st-pos-services">
          <header className="st-pos-top-row">
            <div className="st-pos-search-wrap">
              <span className="material-symbols-outlined">search</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services or categories..." />
            </div>
            <div className="st-pos-top-actions">
              <button type="button" className="st-icon-btn" aria-label="Notifications">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button type="button" className="st-icon-btn" aria-label="Help">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>
          </header>

          <div className="st-pos-categories">
            {categories.map((category) => {
              const active = categoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  className={active ? "st-pos-cat-btn active" : "st-pos-cat-btn"}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category === "ALL" ? "All Services" : category}
                </button>
              );
            })}
          </div>

          <div className="st-pos-services-grid">
            {filteredServices.map((service) => (
              <button key={service.id} type="button" className="st-pos-service-card" onClick={() => addService(service)}>
                <div className="st-pos-service-head">
                  <span className="st-pos-service-icon material-symbols-outlined">{categoryIcon(service.categoryName)}</span>
                  <small>{`${service.categoryName.slice(0, 3).toUpperCase()}-${service.id}`}</small>
                </div>
                <h4>{service.name}</h4>
                <p>{service.categoryName}</p>
                <div className="st-pos-service-meta">
                  <span>
                    <span className="material-symbols-outlined">schedule</span>
                    {service.durationMinutes} min
                  </span>
                  <strong>${service.price.toFixed(2)}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="st-pos-cart">
          <h2>Current Transaction</h2>

          <div className="st-pos-assignment">
            <label>Assigned Staff</label>
            <div className="st-pos-select-card">
              <div className="st-pos-select-lead">
                <span className="st-pos-avatar material-symbols-outlined">badge</span>
                <select value={assignedStaffId} onChange={(e) => changeAssignedStaff(e.target.value)}>
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <span className="material-symbols-outlined">expand_more</span>
            </div>

            <label>Select Customer</label>
            <div className="st-pos-select-card static">
              <div className="st-pos-select-lead">
                <span className="st-pos-avatar material-symbols-outlined">person</span>
                <span>Walk-in Customer</span>
              </div>
              <span className="material-symbols-outlined">search</span>
            </div>
          </div>

          <div className="st-pos-lines">
            {cart.length === 0 ? (
              <p className="st-pos-empty">No services in cart.</p>
            ) : (
              cart.map((line) => (
                <div key={line.serviceId} className="st-pos-line">
                  <div className="st-pos-line-left">
                    <div className="st-pos-qty-chip">{line.qty}x</div>
                    <div>
                      <h4>{line.serviceName}</h4>
                      <p>{shortStaffName(line.assignedStaffId)}</p>
                    </div>
                  </div>
                  <div className="st-pos-line-right">
                    <strong>${(line.qty * line.unitPrice).toFixed(2)}</strong>
                    <button type="button" onClick={() => removeLine(line.serviceId)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="st-pos-total-card">
            <div className="st-pos-total-row">
              <span>Subtotal</span>
              <span>${netBeforeTax.toFixed(2)}</span>
            </div>
            <div className="st-pos-total-row">
              <span>GST (10%)</span>
              <span>${gstAmount.toFixed(2)}</span>
            </div>
            {Number(discountTotal) > 0 ? (
              <div className="st-pos-total-row">
                <span>Discount</span>
                <span>-${Number(discountTotal).toFixed(2)}</span>
              </div>
            ) : null}

            <div className="st-pos-total-divider" />

            <div className="st-pos-total-due">
              <small>Total Due</small>
              <strong>${finalTotal.toFixed(2)}</strong>
            </div>

            <button type="button" className="st-pos-checkout" onClick={handleCheckout} disabled={submitting || cart.length === 0}>
              <span className="material-symbols-outlined">payments</span>
              {submitting ? "Processing..." : "Checkout"}
            </button>

            <div className="st-pos-payment-details">
              <label>
                Cashier
                <select value={cashierId} onChange={(e) => setCashierId(e.target.value)}>
                  <option value="">Select cashier</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Payment
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_OPTIONS.map((method) => (
                    <option key={method} value={method}>
                      {method.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reference
                <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Optional" />
              </label>
              <label>
                Discount
                <input type="number" step="0.01" value={discountTotal} onChange={(e) => setDiscountTotal(e.target.value)} />
              </label>
            </div>
          </div>
        </aside>
      </div>

      {error ? <p className="st-error">{error}</p> : <p className="st-pos-notice">{notice}</p>}
    </section>
  );
}
