export interface ApiErrorBody {
  error?: string;
  fields?: Record<string, string>;
}

export interface PublicBranch {
  id: number;
  name: string;
  address?: string | null;
}

export interface PublicService {
  id: number;
  categoryId?: number | null;
  categoryName?: string | null;
  name: string;
  price: number;
  durationMinutes?: number | null;
}

export interface PublicStaff {
  id: number;
  displayName: string;
}

export interface CustomerProfile {
  id: number;
  name: string;
  phone?: string | null;
  phoneNormalized?: string | null;
  email?: string | null;
  birthday?: string | null;
  notes?: string | null;
  marketingOptIn: boolean;
  status: string;
  favoriteStaffId?: number | null;
  favoriteStaffName?: string | null;
  secondaryFavoriteStaffId?: number | null;
  secondaryFavoriteStaffName?: string | null;
  pointsBalance: number;
  totalSpend: number;
  totalVisits: number;
  lastVisitAt?: string | null;
}

export interface CustomerAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  customer: CustomerProfile;
}

export interface OtpChallengeResponse {
  message: string;
  expiresInSeconds: number;
}

export interface AppointmentRecord {
  id: number;
  bookingReference: string;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  displayName?: string | null;
  displayPhone?: string | null;
  staffId?: number | null;
  staffName?: string | null;
  branchId: number;
  serviceId?: number | null;
  serviceName?: string | null;
  bookingChannel: string;
  startAt: string;
  endAt?: string | null;
  status: string;
  depositAmount?: number | null;
  customerNote?: string | null;
  internalNote?: string | null;
  cancellationReason?: string | null;
  createdByCustomerId?: number | null;
  convertedTransactionId?: number | null;
  createdAt: string;
  confirmationEmailSentAt?: string | null;
  reminderEmailSentAt?: string | null;
}

export interface LoyaltyTransaction {
  id: number;
  entryType: string;
  pointsDelta: number;
  balanceAfter: number;
  remarks?: string | null;
  transactionId?: number | null;
  refundId?: number | null;
  customerVoucherId?: number | null;
  createdAt: string;
}

export interface CustomerVoucher {
  id: number;
  customerId: number;
  voucherCatalogId: number;
  code: string;
  name: string;
  voucherType: string;
  discountValue?: number | null;
  minSpend?: number | null;
  branchId?: number | null;
  serviceId?: number | null;
  serviceName?: string | null;
  status: string;
  expiresAt?: string | null;
  redeemedAt: string;
  usedAt?: string | null;
}

export interface VoucherCatalogItem {
  catalogId: number;
  name: string;
  description?: string | null;
  pointsCost: number;
  discountValue?: number | null;
  voucherType: string;
  minSpend?: number | null;
  branchId?: number | null;
  branchName?: string | null;
  serviceId?: number | null;
  serviceName?: string | null;
  validTo?: string | null;
}

export interface CustomerProfileUpdatePayload {
  name?: string;
  phone?: string;
  email?: string;
  birthday?: string | null;
  favoriteStaffId?: number | null;
  secondaryFavoriteStaffId?: number | null;
  marketingOptIn?: boolean;
  notes?: string;
}

export interface CreateGuestAppointmentPayload {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  branchId: number;
  serviceId?: number | null;
  staffId?: number | null;
  startAt: string;
  customerNote?: string;
}

export interface CreateCustomerAppointmentPayload {
  branchId: number;
  serviceId?: number | null;
  staffId?: number | null;
  startAt: string;
  customerNote?: string;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  customer: CustomerProfile;
}
