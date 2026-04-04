import type {
  ApiErrorBody,
  AppSettingResponse,
  AppointmentResponse,
  AttendanceLogResponse,
  AttendanceReportItemResponse,
  AuthLoginResponse,
  BranchResponse,
  CommissionStatementResponse,
  ConvertAppointmentToBillRequest,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  CreateRefundRequest,
  CreateRefundResponse,
  CreateServiceRequest,
  CreateStaffProfileRequest,
  CreateTransactionRequest,
  CreateTransactionResponse,
  FaceVerificationResponse,
  PagedResponse,
  ReceiptHistoryItemResponse,
  ReceiptResponse,
  SalesSummaryResponse,
  ServiceItemResponse,
  StaffCreateResponse,
  StaffFaceReEnrollResponse,
  StaffProfileResponse,
  TransactionStatus,
  AuditLogResponse,
  AppointmentStatus,
  CustomerResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  LoyaltyPointsTransactionResponse,
  CustomerVoucherResponse,
  VoucherCatalogResponse,
  LoyaltySettingsResponse,
  SaveVoucherCatalogRequest,
} from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://localhost:8080";

export class ApiError extends Error {
  status?: number;
  fields?: Record<string, string>;

  constructor(message: string, status?: number, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // ignore parse failures
  }

  const message = body?.error || `Request failed (${response.status})`;
  return new ApiError(message, response.status, body?.fields);
}

function authHeaders(token: string | null, extra: Record<string, string> = {}): Record<string, string> {
  if (!token) {
    return extra;
  }
  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const qp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    qp.set(key, String(value));
  }
  const encoded = qp.toString();
  return encoded ? `?${encoded}` : "";
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
}

async function requestText(path: string, init: RequestInit): Promise<string> {
  const response = await fetch(`${BASE_URL}${path}`, init);
  if (!response.ok) {
    throw await parseError(response);
  }
  return response.text();
}

export async function login(username: string, password: string): Promise<AuthLoginResponse> {
  return requestJson<AuthLoginResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function listBranches(token: string): Promise<BranchResponse[]> {
  return requestJson<BranchResponse[]>("/api/branches", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createBranch(
  token: string,
  payload: { name: string; address?: string; active?: boolean }
): Promise<BranchResponse> {
  return requestJson<BranchResponse>("/api/branches", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function updateBranch(
  token: string,
  branchId: number,
  payload: { name: string; address?: string; active?: boolean }
): Promise<BranchResponse> {
  return requestJson<BranchResponse>(`/api/branches/${branchId}`, {
    method: "PATCH",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function listSettings(token: string): Promise<AppSettingResponse[]> {
  return requestJson<AppSettingResponse[]>("/api/settings", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function updateSetting(token: string, key: string, value: string): Promise<AppSettingResponse> {
  return requestJson<AppSettingResponse>(`/api/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ value }),
  });
}

export async function searchCustomers(token: string, q?: string): Promise<CustomerResponse[]> {
  const queryString = buildQuery({ q });
  return requestJson<CustomerResponse[]>(`/api/customers${queryString}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function getCustomer(token: string, customerId: number): Promise<CustomerResponse> {
  return requestJson<CustomerResponse>(`/api/customers/${customerId}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createCustomer(token: string, payload: CreateCustomerRequest): Promise<CustomerResponse> {
  return requestJson<CustomerResponse>("/api/customers", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(token: string, customerId: number, payload: UpdateCustomerRequest): Promise<CustomerResponse> {
  return requestJson<CustomerResponse>(`/api/customers/${customerId}`, {
    method: "PATCH",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function getCustomerPointsHistory(token: string, customerId: number): Promise<LoyaltyPointsTransactionResponse[]> {
  return requestJson<LoyaltyPointsTransactionResponse[]>(`/api/customers/${customerId}/points-history`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function getCustomerVouchers(token: string, customerId: number): Promise<CustomerVoucherResponse[]> {
  return requestJson<CustomerVoucherResponse[]>(`/api/customers/${customerId}/vouchers`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function adjustCustomerPoints(
  token: string,
  customerId: number,
  payload: { pointsDelta: number; remarks: string }
): Promise<LoyaltyPointsTransactionResponse> {
  return requestJson<LoyaltyPointsTransactionResponse>(`/api/customers/${customerId}/points-adjustments`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function redeemCustomerVoucher(token: string, customerId: number, catalogId: number): Promise<CustomerVoucherResponse> {
  return requestJson<CustomerVoucherResponse>(`/api/customers/${customerId}/vouchers/redeem/${catalogId}`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export async function getLoyaltySettings(token: string): Promise<LoyaltySettingsResponse> {
  return requestJson<LoyaltySettingsResponse>("/api/admin/loyalty-settings", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function updateLoyaltySettings(
  token: string,
  payload: { pointsEarnPercent: number; pointsEnabled: boolean; voucherRedemptionEnabled: boolean; reminderLeadHours: number }
): Promise<LoyaltySettingsResponse> {
  return requestJson<LoyaltySettingsResponse>("/api/admin/loyalty-settings", {
    method: "PUT",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function listAdminVouchers(token: string): Promise<VoucherCatalogResponse[]> {
  return requestJson<VoucherCatalogResponse[]>("/api/admin/vouchers", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createAdminVoucher(token: string, payload: SaveVoucherCatalogRequest): Promise<VoucherCatalogResponse> {
  return requestJson<VoucherCatalogResponse>("/api/admin/vouchers", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function updateAdminVoucher(
  token: string,
  voucherId: number,
  payload: SaveVoucherCatalogRequest
): Promise<VoucherCatalogResponse> {
  return requestJson<VoucherCatalogResponse>(`/api/admin/vouchers/${voucherId}`, {
    method: "PATCH",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function listServices(token: string): Promise<ServiceItemResponse[]> {
  return requestJson<ServiceItemResponse[]>("/api/services", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createService(token: string, payload: CreateServiceRequest): Promise<ServiceItemResponse> {
  return requestJson<ServiceItemResponse>("/api/services", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function listStaff(token: string): Promise<StaffProfileResponse[]> {
  return requestJson<StaffProfileResponse[]>("/api/staff", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createStaff(
  token: string,
  profile: CreateStaffProfileRequest,
  enrollmentPhoto: Blob
): Promise<StaffCreateResponse> {
  const formData = new FormData();
  formData.append("profile", new Blob([JSON.stringify(profile)], { type: "application/json" }));
  formData.append("enrollmentPhoto", enrollmentPhoto, "enrollment.jpg");

  return requestJson<StaffCreateResponse>("/api/staff", {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
}

export async function reEnrollStaffFace(
  token: string,
  staffId: number,
  enrollmentPhoto: Blob
): Promise<StaffFaceReEnrollResponse> {
  const formData = new FormData();
  formData.append("enrollmentPhoto", enrollmentPhoto, "reenroll.jpg");

  return requestJson<StaffFaceReEnrollResponse>(`/api/staff/${staffId}/face/re-enroll`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
}

export async function verifyFace(token: string, staffId: number, selfie: Blob): Promise<FaceVerificationResponse> {
  const formData = new FormData();
  formData.append("selfie", selfie, "selfie.jpg");

  return requestJson<FaceVerificationResponse>(`/api/attendance/verify-face?staffId=${staffId}`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
}

export async function clockIn(
  token: string,
  staffId: number,
  branchId: number,
  verificationToken: string
): Promise<AttendanceLogResponse> {
  return requestJson<AttendanceLogResponse>("/api/attendance/clock-in", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ staffId, branchId, verificationToken }),
  });
}

export async function breakStart(token: string, staffId: number, branchId?: number): Promise<AttendanceLogResponse> {
  return requestJson<AttendanceLogResponse>("/api/attendance/break-start", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ staffId, branchId }),
  });
}

export async function breakEnd(token: string, staffId: number, branchId?: number): Promise<AttendanceLogResponse> {
  return requestJson<AttendanceLogResponse>("/api/attendance/break-end", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ staffId, branchId }),
  });
}

export async function clockOut(token: string, staffId: number, verificationToken: string): Promise<AttendanceLogResponse> {
  return requestJson<AttendanceLogResponse>("/api/attendance/clock-out", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ staffId, verificationToken }),
  });
}

export async function getAttendanceReport(
  token: string,
  query: {
    staffId?: number;
    branchId?: number;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }
): Promise<PagedResponse<AttendanceReportItemResponse>> {
  const queryString = buildQuery(query);
  return requestJson<PagedResponse<AttendanceReportItemResponse>>(`/api/attendance/report${queryString}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createTransaction(token: string, payload: CreateTransactionRequest): Promise<CreateTransactionResponse> {
  return requestJson<CreateTransactionResponse>("/api/transactions", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function getReceipt(token: string, receiptNo: string): Promise<ReceiptResponse> {
  return requestJson<ReceiptResponse>(`/api/receipts/${encodeURIComponent(receiptNo)}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function getReceiptHistory(
  token: string,
  query: {
    receiptNo?: string;
    branchId?: number;
    cashierId?: number;
    status?: TransactionStatus;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }
): Promise<PagedResponse<ReceiptHistoryItemResponse>> {
  const queryString = buildQuery(query);
  return requestJson<PagedResponse<ReceiptHistoryItemResponse>>(`/api/receipts/history${queryString}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function exportReceiptHistoryCsv(
  token: string,
  query: {
    receiptNo?: string;
    branchId?: number;
    cashierId?: number;
    status?: TransactionStatus;
    from?: string;
    to?: string;
  }
): Promise<string> {
  const queryString = buildQuery(query);
  return requestText(`/api/receipts/history/export${queryString}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createRefund(token: string, payload: CreateRefundRequest): Promise<CreateRefundResponse> {
  return requestJson<CreateRefundResponse>("/api/refunds", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function getCommissionStatement(
  token: string,
  staffId: number,
  from: string,
  to: string
): Promise<CommissionStatementResponse> {
  const queryString = buildQuery({ from, to });
  return requestJson<CommissionStatementResponse>(`/api/commission/staff/${staffId}/statement${queryString}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function getSalesSummary(
  token: string,
  from: string,
  to: string,
  branchId?: number
): Promise<SalesSummaryResponse> {
  const queryString = buildQuery({ from, to, branchId });
  return requestJson<SalesSummaryResponse>(`/api/reports/sales-summary${queryString}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function createAppointment(token: string, payload: CreateAppointmentRequest): Promise<AppointmentResponse> {
  return requestJson<AppointmentResponse>("/api/appointments", {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function listAppointments(
  token: string,
  query: {
    from?: string;
    to?: string;
    branchId?: number;
    status?: AppointmentStatus;
    q?: string;
  }
): Promise<AppointmentResponse[]> {
  const queryString = buildQuery(query);
  return requestJson<AppointmentResponse[]>(`/api/appointments${queryString}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export async function updateAppointment(
  token: string,
  id: number,
  payload: UpdateAppointmentRequest
): Promise<AppointmentResponse> {
  return requestJson<AppointmentResponse>(`/api/appointments/${id}`, {
    method: "PATCH",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function updateAppointmentStatus(
  token: string,
  id: number,
  status: AppointmentStatus
): Promise<AppointmentResponse> {
  return requestJson<AppointmentResponse>(`/api/appointments/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
}

export async function cancelAppointment(token: string, id: number, reason: string): Promise<AppointmentResponse> {
  return requestJson<AppointmentResponse>(`/api/appointments/${id}/cancel`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ reason }),
  });
}

export async function convertAppointmentToBill(
  token: string,
  id: number,
  payload: ConvertAppointmentToBillRequest
): Promise<CreateTransactionResponse> {
  return requestJson<CreateTransactionResponse>(`/api/appointments/${id}/convert-to-bill`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
}

export async function getAuditLogs(
  token: string,
  query: {
    entityType?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }
): Promise<PagedResponse<AuditLogResponse>> {
  const queryString = buildQuery(query);
  return requestJson<PagedResponse<AuditLogResponse>>(`/api/audit-logs${queryString}`, {
    method: "GET",
    headers: authHeaders(token),
  });
}
