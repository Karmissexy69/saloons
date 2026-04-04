import { useEffect, useMemo, useRef, useState } from "react";
import { createTransaction, getCustomerVouchers, listServices, listStaff, searchCustomers } from "../lib/api";
import { formatCurrency } from "../lib/currency";
import type { AppointmentCheckoutDraft, CustomerResponse, CustomerVoucherResponse, PaymentMethod, ServiceItemResponse, StaffProfileResponse } from "../lib/types";

type Props = {
  token: string;
  selectedBranchId: number | null;
  onViewReceipt: (receiptNo: string) => void;
  appointmentCheckoutDraft: AppointmentCheckoutDraft | null;
  onAppointmentCheckoutDraftConsumed: () => void;
};

type CartLine = {
  serviceId: number;
  serviceName: string;
  unitPrice: number;
  qty: number;
  assignedStaffId?: number;
};

const PAYMENT_OPTIONS: PaymentMethod[] = ["CASH", "CARD", "QR", "BANK_TRANSFER"];

export function PosTerminalPage({ token, selectedBranchId, onViewReceipt, appointmentCheckoutDraft, onAppointmentCheckoutDraftConsumed }: Props) {
  const [services, setServices] = useState<ServiceItemResponse[]>([]);
  const [staff, setStaff] = useState<StaffProfileResponse[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const [cashierId, setCashierId] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResponse[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerVouchers, setCustomerVouchers] = useState<CustomerVoucherResponse[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountTotal, setDiscountTotal] = useState("0");
  const [checkoutSource, setCheckoutSource] = useState<AppointmentCheckoutDraft | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofBlob, setPaymentProofBlob] = useState<Blob | null>(null);
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState("");
  const [paymentProofModalOpen, setPaymentProofModalOpen] = useState(false);
  const [paymentProofCameraReady, setPaymentProofCameraReady] = useState(false);
  const [paymentProofError, setPaymentProofError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("Select services to begin a new transaction.");
  const [error, setError] = useState("");
  const [completedReceiptNo, setCompletedReceiptNo] = useState("");

  const paymentProofVideoRef = useRef<HTMLVideoElement>(null);
  const paymentProofCanvasRef = useRef<HTMLCanvasElement>(null);
  const paymentProofStreamRef = useRef<MediaStream | null>(null);
  const appliedDraftIdRef = useRef<number | null>(null);

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

    void loadData();
  }, [token]);

  useEffect(() => {
    if (!completedReceiptNo) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCompletedReceiptNo("");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [completedReceiptNo]);

  useEffect(() => {
    if (!paymentProofModalOpen) {
      stopPaymentProofCamera();
      return;
    }
    if (paymentProofPreviewUrl) {
      return;
    }

    void startPaymentProofCamera();

    return () => stopPaymentProofCamera();
  }, [paymentProofModalOpen, paymentProofPreviewUrl]);

  useEffect(() => {
    return () => {
      stopPaymentProofCamera();
      if (paymentProofPreviewUrl) {
        URL.revokeObjectURL(paymentProofPreviewUrl);
      }
    };
  }, [paymentProofPreviewUrl]);

  useEffect(() => {
    if (appointmentCheckoutDraft === null) {
      appliedDraftIdRef.current = null;
    }
  }, [appointmentCheckoutDraft]);

  useEffect(() => {
    if (!appointmentCheckoutDraft) {
      return;
    }
    if (selectedBranchId !== null && appointmentCheckoutDraft.branchId !== selectedBranchId) {
      setError("Open the matching branch before loading this appointment into POS.");
      return;
    }
    if (appointmentCheckoutDraft.serviceId !== null && services.length === 0) {
      return;
    }
    if (appliedDraftIdRef.current === appointmentCheckoutDraft.appointmentId) {
      return;
    }

    appliedDraftIdRef.current = appointmentCheckoutDraft.appointmentId;
    setCheckoutSource(appointmentCheckoutDraft);
    setCompletedReceiptNo("");
    setDiscountTotal("0");
    setPaymentMethod("CASH");
    setPaymentReference("");
    clearPaymentProof();
    setPaymentProofModalOpen(false);
    setPaymentProofError("");

    if (appointmentCheckoutDraft.staffId !== null) {
      setAssignedStaffId(String(appointmentCheckoutDraft.staffId));
    }

    if (appointmentCheckoutDraft.serviceId !== null) {
      const service = services.find((item) => item.id === appointmentCheckoutDraft.serviceId);
      if (service) {
        setCart([
          {
            serviceId: service.id,
            serviceName: service.name,
            unitPrice: service.price,
            qty: 1,
            assignedStaffId: appointmentCheckoutDraft.staffId ?? undefined,
          },
        ]);
      }
    } else {
      setCart([]);
    }

    if (appointmentCheckoutDraft.customerId !== null) {
      const appointmentCustomer = appointmentToCustomer(appointmentCheckoutDraft);
      setCustomerResults((current) => {
        const remaining = current.filter((item) => item.id !== appointmentCustomer.id);
        return [appointmentCustomer, ...remaining];
      });
      setSelectedCustomerId(String(appointmentCheckoutDraft.customerId));
      void loadCustomerVouchersForCustomer(appointmentCheckoutDraft.customerId);
    } else {
      setSelectedCustomerId("");
      setCustomerVouchers([]);
      setSelectedVoucherId("");
    }

    setNotice(`Appointment ${appointmentCheckoutDraft.bookingReference} loaded into POS. You can add more services before checkout.`);
    onAppointmentCheckoutDraftConsumed();
  }, [appointmentCheckoutDraft, onAppointmentCheckoutDraftConsumed, selectedBranchId, services]);

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
  const discountValue = useMemo(() => {
    const parsed = Number(discountTotal);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }, [discountTotal]);
  const subtotalAfterManualDiscount = useMemo(() => {
    const total = subtotal - discountValue;
    return total > 0 ? total : 0;
  }, [subtotal, discountValue]);
  const voucherDiscount = useMemo(() => {
    const voucher = customerVouchers.find((item) => item.id === Number(selectedVoucherId));
    if (!voucher || subtotalAfterManualDiscount <= 0) return 0;
    if (voucher.status !== "AVAILABLE") return 0;
    if (voucher.branchId !== null && voucher.branchId !== selectedBranchId) return 0;
    if (voucher.minSpend !== null && subtotalAfterManualDiscount < voucher.minSpend) return 0;
    if (voucher.voucherType === "FIXED_AMOUNT") return Math.min(subtotalAfterManualDiscount, voucher.discountValue);
    if (voucher.voucherType === "PERCENTAGE") return Math.min(subtotalAfterManualDiscount, subtotalAfterManualDiscount * (voucher.discountValue / 100));
    if (voucher.voucherType === "SERVICE") {
      const matchingLine = cart.find((line) => line.serviceId === voucher.serviceId);
      return matchingLine ? matchingLine.unitPrice * matchingLine.qty : 0;
    }
    return 0;
  }, [cart, customerVouchers, selectedBranchId, selectedVoucherId, subtotalAfterManualDiscount]);
  const finalTotal = useMemo(() => {
    const total = subtotalAfterManualDiscount - voucherDiscount;
    return total > 0 ? total : 0;
  }, [subtotalAfterManualDiscount, voucherDiscount]);
  const paymentProofRequired = requiresPaymentProof(paymentMethod);

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

  function handleCloseReceiptModal() {
    setCompletedReceiptNo("");
  }

  function handleViewReceipt() {
    if (!completedReceiptNo) {
      return;
    }
    const receiptNo = completedReceiptNo;
    setCompletedReceiptNo("");
    onViewReceipt(receiptNo);
  }

  function handlePaymentMethodChange(nextMethod: PaymentMethod) {
    setPaymentMethod(nextMethod);
    setError("");
    setPaymentProofError("");

    if (requiresPaymentProof(nextMethod)) {
      clearPaymentProof();
      setPaymentProofModalOpen(true);
      return;
    }

    clearPaymentProof();
    setPaymentProofModalOpen(false);
  }

  async function handleSearchCustomers() {
    try {
      const data = await searchCustomers(token, customerQuery.trim() || undefined);
      setCustomerResults(data);
      if (data[0]) {
        await handleSelectCustomer(String(data[0].id), data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search customers");
    }
  }

  async function handleSelectCustomer(nextCustomerId: string, pool: CustomerResponse[] = customerResults) {
    setSelectedCustomerId(nextCustomerId);
    setSelectedVoucherId("");
    if (!nextCustomerId) {
      setCustomerVouchers([]);
      return;
    }
    try {
      await loadCustomerVouchersForCustomer(Number(nextCustomerId));
      const customer = pool.find((item) => String(item.id) === nextCustomerId);
      if (customer) setNotice(`Customer ${customer.name} selected.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer vouchers");
    }
  }

  async function loadCustomerVouchersForCustomer(customerId: number) {
    const vouchers = await getCustomerVouchers(token, customerId);
    setCustomerVouchers(vouchers.filter((item) => item.status === "AVAILABLE"));
  }

  async function handleCheckout() {
    if (selectedBranchId === null) {
      setError("Select a branch in the header before checkout.");
      return;
    }

    if (cart.length === 0) {
      setError("Add at least one service to cart.");
      return;
    }

    if (cashierId.trim().length === 0) {
      setError("Please choose cashier profile.");
      return;
    }

    if (discountValue > subtotal) {
      setError("Discount cannot exceed subtotal.");
      return;
    }

    if (paymentProofRequired && paymentProofBlob === null) {
      setError("Take a photo of the payment receipt before checkout.");
      setPaymentProofModalOpen(true);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const proofImageBase64 = paymentProofBlob ? await blobToBase64(paymentProofBlob) : undefined;
      const response = await createTransaction(token, {
        branchId: selectedBranchId,
        appointmentId: checkoutSource?.appointmentId,
        customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
        customerVoucherId: selectedVoucherId ? Number(selectedVoucherId) : undefined,
        cashierId: Number(cashierId),
        discountTotal: discountValue,
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
            proofImageBase64,
            proofImageContentType: paymentProofBlob?.type || undefined,
          },
        ],
      });

      setNotice("Ready for the next transaction.");
      setCompletedReceiptNo(response.receiptNo);
      setCart([]);
      setPaymentReference("");
      setDiscountTotal("0");
      setSelectedVoucherId("");
      setPaymentMethod("CASH");
      clearPaymentProof();
      setPaymentProofModalOpen(false);
      setPaymentProofError("");
      setCheckoutSource(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit transaction");
    } finally {
      setSubmitting(false);
    }
  }

  async function startPaymentProofCamera() {
    setPaymentProofError("");
    try {
      stopPaymentProofCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      paymentProofStreamRef.current = stream;
      if (paymentProofVideoRef.current) {
        paymentProofVideoRef.current.srcObject = stream;
      }
      setPaymentProofCameraReady(true);
    } catch (err) {
      setPaymentProofCameraReady(false);
      setPaymentProofError(err instanceof Error ? err.message : "Unable to start back camera");
    }
  }

  function stopPaymentProofCamera() {
    if (paymentProofStreamRef.current === null) {
      return;
    }

    for (const track of paymentProofStreamRef.current.getTracks()) {
      track.stop();
    }
    paymentProofStreamRef.current = null;

    if (paymentProofVideoRef.current) {
      paymentProofVideoRef.current.srcObject = null;
    }

    setPaymentProofCameraReady(false);
  }

  function capturePaymentProof() {
    const video = paymentProofVideoRef.current;
    const canvas = paymentProofCanvasRef.current;

    if (video === null || canvas === null || paymentProofStreamRef.current === null) {
      setPaymentProofError("Back camera is not ready.");
      return;
    }

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (context === null) {
      setPaymentProofError("Could not capture payment receipt.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          setPaymentProofError("Could not capture payment receipt.");
          return;
        }
        applyPaymentProof(blob);
        stopPaymentProofCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function applyPaymentProof(blob: Blob) {
    setPaymentProofBlob(blob);
    setPaymentProofError("");

    const url = URL.createObjectURL(blob);
    setPaymentProofPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return url;
    });
  }

  function clearPaymentProof() {
    setPaymentProofBlob(null);
    setPaymentProofPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return "";
    });
  }

  function handleUsePaymentProof() {
    if (paymentProofBlob === null) {
      return;
    }
    setPaymentProofModalOpen(false);
    setPaymentProofError("");
  }

  function handleRetakePaymentProof() {
    clearPaymentProof();
    setPaymentProofModalOpen(true);
  }

  function handleClosePaymentProofModal() {
    setPaymentProofModalOpen(false);
    stopPaymentProofCamera();
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
                  <strong>{formatCurrency(service.price)}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="st-pos-cart">
          <h2>Current Transaction</h2>

          {checkoutSource ? (
            <div className="st-pos-appointment-banner">
              <div>
                <p>Linked Appointment</p>
                <strong>{checkoutSource.bookingReference}</strong>
                <span>{checkoutSource.displayName ?? "Guest booking"} | {checkoutSource.serviceName ?? "General service"}</span>
              </div>
              <button type="button" className="st-link-btn" onClick={() => setCheckoutSource(null)}>Unlink</button>
            </div>
          ) : null}

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
              <div className="st-grid">
                <input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Search member by name or phone" />
                <button type="button" className="st-btn st-btn-secondary" onClick={handleSearchCustomers}>Find Member</button>
                <select value={selectedCustomerId} onChange={(e) => void handleSelectCustomer(e.target.value)}>
                  <option value="">Walk-in Customer</option>
                  {customerResults.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} • {customer.phone} • {customer.pointsBalance} pts
                    </option>
                  ))}
                </select>
                {selectedCustomerId ? (
                  <select value={selectedVoucherId} onChange={(e) => setSelectedVoucherId(e.target.value)}>
                    <option value="">No voucher</option>
                    {customerVouchers.map((voucher) => (
                      <option key={voucher.id} value={voucher.id}>
                        {voucher.code} • {voucher.name}
                      </option>
                    ))}
                  </select>
                ) : null}
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
                    <strong>{formatCurrency(line.qty * line.unitPrice)}</strong>
                    <button
                      type="button"
                      className="st-pos-remove-btn"
                      onClick={() => removeLine(line.serviceId)}
                      aria-label={`Remove ${line.serviceName}`}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="st-pos-total-card">
            <div className="st-pos-total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
              {discountValue > 0 ? (
                <div className="st-pos-total-row">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountValue)}</span>
                </div>
              ) : null}
              {voucherDiscount > 0 ? (
                <div className="st-pos-total-row">
                  <span>Voucher</span>
                  <span>-{formatCurrency(voucherDiscount)}</span>
                </div>
              ) : null}

            <div className="st-pos-total-divider" />

            <div className="st-pos-total-due">
              <small>Total Due</small>
              <strong>{formatCurrency(finalTotal)}</strong>
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
                <select value={paymentMethod} onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}>
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
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountTotal}
                  onChange={(e) => setDiscountTotal(e.target.value)}
                />
              </label>

              {paymentProofRequired ? (
                <div className="st-pos-proof-summary">
                  <div>
                    <p className="st-pos-proof-summary-title">Payment Proof</p>
                    <p className="st-pos-proof-summary-text">
                      {paymentProofBlob ? "Receipt photo captured and ready." : "Take a photo of the customer receipt before checkout."}
                    </p>
                  </div>
                  <button type="button" className="st-pos-proof-trigger" onClick={() => setPaymentProofModalOpen(true)}>
                    {paymentProofBlob ? "Retake Photo" : "Capture Photo"}
                  </button>
                  {paymentProofPreviewUrl ? <img src={paymentProofPreviewUrl} alt="Payment proof preview" className="st-pos-proof-thumb" /> : null}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {paymentProofModalOpen ? (
        <div className="st-modal-backdrop" role="presentation">
          <div className="st-pos-proof-modal" role="dialog" aria-modal="true" aria-labelledby="st-pos-proof-title">
            <p className="st-pos-proof-title" id="st-pos-proof-title">
              Take Picture of Receipt
            </p>
            <p className="st-pos-proof-subtitle">
              Use the back camera to capture the customer payment receipt. This proof is required for {paymentMethod.replaceAll("_", " ")} payments.
            </p>

            <div className="st-pos-proof-camera">
              {paymentProofPreviewUrl ? (
                <img src={paymentProofPreviewUrl} alt="Payment receipt proof" />
              ) : (
                <video ref={paymentProofVideoRef} autoPlay playsInline muted />
              )}
              <canvas ref={paymentProofCanvasRef} className="st-hidden" />
            </div>

            {paymentProofError ? <p className="st-error">{paymentProofError}</p> : null}

            <div className="st-pos-proof-actions">
              <button type="button" className="st-pos-modal-btn secondary" onClick={handleClosePaymentProofModal}>
                Cancel
              </button>
              {paymentProofPreviewUrl ? (
                <>
                  <button type="button" className="st-pos-modal-btn secondary" onClick={handleRetakePaymentProof}>
                    Retake
                  </button>
                  <button type="button" className="st-pos-modal-btn primary" onClick={handleUsePaymentProof}>
                    Use Photo
                  </button>
                </>
              ) : (
                <button type="button" className="st-pos-modal-btn primary" onClick={capturePaymentProof} disabled={!paymentProofCameraReady}>
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {completedReceiptNo ? (
        <div className="st-modal-backdrop" role="presentation">
          <div
            className="st-pos-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="st-pos-success-title"
          >
            <p className="st-pos-success-title" id="st-pos-success-title">
              Transaction Complete
            </p>
            <div className="st-pos-success-check" aria-hidden="true">
              <span className="material-symbols-outlined" aria-hidden="true">
                check
              </span>
            </div>
            <p className="st-pos-success-receipt">{completedReceiptNo}</p>
            <div className="st-pos-success-actions">
              <button type="button" className="st-pos-modal-btn secondary" onClick={handleCloseReceiptModal}>
                Cancel
              </button>
              <button type="button" className="st-pos-modal-btn primary" onClick={handleViewReceipt}>
                View Receipt
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="st-error">{error}</p> : <p className="st-pos-notice">{notice}</p>}
    </section>
  );
}

function requiresPaymentProof(method: PaymentMethod): boolean {
  return method === "CARD" || method === "QR";
}

function appointmentToCustomer(appointment: AppointmentCheckoutDraft): CustomerResponse {
  return {
    id: appointment.customerId ?? 0,
    name: appointment.customerName ?? appointment.displayName ?? "Customer",
    phone: appointment.customerPhone ?? appointment.displayPhone ?? "",
    phoneNormalized: null,
    email: appointment.customerEmail,
    birthday: null,
    notes: null,
    marketingOptIn: false,
    status: "ACTIVE",
    favoriteStaffId: appointment.staffId,
    favoriteStaffName: appointment.staffName,
    secondaryFavoriteStaffId: null,
    secondaryFavoriteStaffName: null,
    pointsBalance: 0,
    totalSpend: 0,
    totalVisits: 0,
    lastVisitAt: null,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to encode payment proof."));
        return;
      }
      const [, base64 = ""] = result.split(",", 2);
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to encode payment proof."));
    reader.readAsDataURL(blob);
  });
}
