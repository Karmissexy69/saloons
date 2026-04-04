import { getSession, setSession } from "./session";
import type {
  ApiErrorBody,
  AppointmentRecord,
  CreateCustomerAppointmentPayload,
  CreateGuestAppointmentPayload,
  CustomerAuthResponse,
  CustomerProfile,
  CustomerProfileUpdatePayload,
  CustomerVoucher,
  LoyaltyTransaction,
  OtpChallengeResponse,
  PublicBranch,
  PublicService,
  PublicStaff,
  StoredSession,
  VoucherCatalogItem,
} from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

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

async function parseError(response: Response) {
  let body: ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = null;
  }

  return new ApiError(body?.error || `Request failed (${response.status})`, response.status, body?.fields);
}

async function request<T>(path: string, init: RequestInit, retryOnUnauthorized = true): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, init);

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshSessionSilently();
    if (refreshed) {
      const nextHeaders = new Headers(init.headers);
      nextHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);
      return request<T>(path, { ...init, headers: nextHeaders }, false);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function jsonHeaders(extra?: HeadersInit) {
  return {
    "Content-Type": "application/json",
    ...(extra ?? {}),
  };
}

function authHeaders(extra?: HeadersInit) {
  const session = getSession();
  const token = session?.accessToken;
  return token
    ? {
        Authorization: `Bearer ${token}`,
        ...(extra ?? {}),
      }
    : { ...(extra ?? {}) };
}

async function refreshSessionSilently(): Promise<StoredSession | null> {
  const current = getSession();
  if (!current?.refreshToken) {
    return null;
  }

  try {
    const refreshed = await request<CustomerAuthResponse>(
      "/api/customer-auth/refresh",
      {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      },
      false
    );

    const nextSession: StoredSession = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenType: refreshed.tokenType,
      expiresInSeconds: refreshed.expiresInSeconds,
      customer: normalizeCustomer(refreshed.customer),
    };

    setSession(nextSession);
    return nextSession;
  } catch {
    setSession(null);
    return null;
  }
}

function normalizeCustomer(raw: CustomerProfile): CustomerProfile {
  return {
    ...raw,
    totalSpend: Number(raw.totalSpend ?? 0),
    pointsBalance: Number(raw.pointsBalance ?? 0),
    totalVisits: Number(raw.totalVisits ?? 0),
  };
}

function normalizeVoucherCatalogItem(raw: Record<string, unknown>): VoucherCatalogItem {
  return {
    catalogId: Number(raw.catalogId ?? raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: raw.description == null ? null : String(raw.description),
    pointsCost: Number(raw.pointsCost ?? 0),
    discountValue: raw.discountValue == null ? null : Number(raw.discountValue),
    voucherType: String(raw.voucherType ?? ""),
    minSpend: raw.minSpend == null ? null : Number(raw.minSpend),
    branchId: raw.branchId == null ? null : Number(raw.branchId),
    branchName: raw.branchName == null ? null : String(raw.branchName),
    serviceId: raw.serviceId == null ? null : Number(raw.serviceId),
    serviceName: raw.serviceName == null ? null : String(raw.serviceName),
    validTo: raw.validTo == null ? null : String(raw.validTo),
  };
}

export async function requestOtp(email: string, deviceLabel?: string) {
  return request<OtpChallengeResponse>("/api/customer-auth/request-otp", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, deviceLabel }),
  });
}

export async function verifyOtp(email: string, otpCode: string, deviceLabel?: string) {
  const response = await request<CustomerAuthResponse>("/api/customer-auth/verify-otp", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, otpCode, deviceLabel }),
  });

  const nextSession: StoredSession = {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    tokenType: response.tokenType,
    expiresInSeconds: response.expiresInSeconds,
    customer: normalizeCustomer(response.customer),
  };

  setSession(nextSession);
  return nextSession;
}

export async function logoutCustomer() {
  const current = getSession();
  if (!current?.refreshToken) {
    setSession(null);
    return;
  }

  try {
    await request<void>(
      "/api/customer-auth/logout",
      {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      },
      false
    );
  } finally {
    setSession(null);
  }
}

export async function getCustomerMe() {
  const response = await request<CustomerProfile>("/api/customer/me", {
    method: "GET",
    headers: authHeaders(),
  });
  const normalized = normalizeCustomer(response);
  const current = getSession();
  if (current) {
    setSession({ ...current, customer: normalized });
  }
  return normalized;
}

export async function updateCustomerMe(payload: CustomerProfileUpdatePayload) {
  const response = await request<CustomerProfile>("/api/customer/me", {
    method: "PATCH",
    headers: jsonHeaders(authHeaders()),
    body: JSON.stringify(payload),
  });
  const normalized = normalizeCustomer(response);
  const current = getSession();
  if (current) {
    setSession({ ...current, customer: normalized });
  }
  return normalized;
}

export async function listCustomerAppointments() {
  return request<AppointmentRecord[]>("/api/customer/me/appointments", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function createCustomerAppointment(payload: CreateCustomerAppointmentPayload) {
  return request<AppointmentRecord>("/api/customer/me/appointments", {
    method: "POST",
    headers: jsonHeaders(authHeaders()),
    body: JSON.stringify(payload),
  });
}

export async function cancelCustomerAppointment(bookingReference: string, reason: string) {
  return request<AppointmentRecord>(`/api/customer/me/appointments/${encodeURIComponent(bookingReference)}/cancel`, {
    method: "POST",
    headers: jsonHeaders(authHeaders()),
    body: JSON.stringify({ reason }),
  });
}

export async function listPointsHistory() {
  return request<LoyaltyTransaction[]>("/api/customer/me/points-history", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function listCustomerVouchers() {
  return request<CustomerVoucher[]>("/api/customer/me/vouchers", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function listVoucherCatalog() {
  const response = await request<Record<string, unknown>[] | VoucherCatalogItem[]>("/api/customer/me/voucher-catalog", {
    method: "GET",
    headers: authHeaders(),
  });

  return response.map((item) => normalizeVoucherCatalogItem(item as Record<string, unknown>));
}

export async function redeemVoucher(catalogId: number) {
  return request<CustomerVoucher>(`/api/customer/me/vouchers/redeem/${catalogId}`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function listPublicBranches() {
  return request<PublicBranch[]>("/api/public/branches", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
}

export async function listPublicServices() {
  return request<PublicService[]>("/api/public/services", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
}

export async function listPublicStaff() {
  return request<PublicStaff[]>("/api/public/staff", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
}

export async function createGuestAppointment(payload: CreateGuestAppointmentPayload) {
  return request<AppointmentRecord>("/api/public/appointments", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
}
