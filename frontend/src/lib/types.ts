export type ApiErrorBody = {
  timestamp?: string;
  status?: number;
  error?: string;
  fields?: Record<string, string>;
};

export type AuthLoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  username: string;
  role: string;
};

export type BranchResponse = {
  id: number;
  name: string;
  address: string | null;
  active: boolean;
};

export type AppSettingResponse = {
  key: string;
  value: string;
};

export type CustomerResponse = {
  id: number;
  name: string;
  phone: string;
  phoneNormalized: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  marketingOptIn: boolean;
  status: string;
  favoriteStaffId: number | null;
  favoriteStaffName: string | null;
  secondaryFavoriteStaffId: number | null;
  secondaryFavoriteStaffName: string | null;
  pointsBalance: number;
  totalSpend: number;
  totalVisits: number;
  lastVisitAt: string | null;
};

export type LoyaltyPointsTransactionResponse = {
  id: number;
  entryType: string;
  pointsDelta: number;
  balanceAfter: number;
  remarks: string | null;
  transactionId: number | null;
  refundId: number | null;
  customerVoucherId: number | null;
  createdAt: string;
};

export type CustomerVoucherResponse = {
  id: number;
  customerId: number;
  voucherCatalogId: number;
  code: string;
  name: string;
  voucherType: string;
  discountValue: number;
  minSpend: number | null;
  branchId: number | null;
  serviceId: number | null;
  serviceName: string | null;
  status: string;
  expiresAt: string | null;
  redeemedAt: string;
  usedAt: string | null;
};

export type VoucherCatalogResponse = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  voucherType: string;
  discountValue: number;
  pointsCost: number;
  minSpend: number | null;
  branchId: number | null;
  serviceId: number | null;
  serviceName: string | null;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
  dailyRedemptionLimit: number | null;
};

export type LoyaltySettingsResponse = {
  pointsEarnPercent: number;
  pointsEnabled: boolean;
  voucherRedemptionEnabled: boolean;
  scope: string;
  reminderLeadHours: number;
};

export type CommissionRuleType = "PERCENTAGE" | "FIXED";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "QR" | "SPLIT";
export type TransactionStatus = "PAID" | "REFUNDED" | "VOIDED";
export type AppointmentStatus =
  | "BOOKED"
  | "CHECKED_IN"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type ServiceItemResponse = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  price: number;
  durationMinutes: number;
  commissionType: CommissionRuleType;
  commissionValue: number;
};

export type CreateServiceRequest = {
  categoryId?: number;
  categoryName?: string;
  name: string;
  price: number;
  durationMinutes: number;
  commissionType?: CommissionRuleType;
  commissionValue?: number;
  active?: boolean;
};

export type StaffProfileResponse = {
  id: number;
  displayName: string;
  roleType: string;
  active: boolean;
};

export type CreateStaffProfileRequest = {
  displayName: string;
  roleType: string;
  active?: boolean;
};

export type StaffCreateResponse = {
  id: number;
  displayName: string;
  roleType: string;
  active: boolean;
  faceEnrolled: boolean;
};

export type StaffFaceReEnrollResponse = {
  staffId: number;
  faceProfileId: number;
  message: string;
};

export type FaceVerificationResponse = {
  verified: boolean;
  failureReason: string | null;
  threshold: number | null;
  similarity: number | null;
  verificationToken: string | null;
  verificationId: number | null;
};

export type AttendanceLogResponse = {
  id: number;
  staffId: number;
  branchId: number;
  clockInAt: string | null;
  clockOutAt: string | null;
  breakMinutes: number | null;
  attendanceStatus: "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";
};

export type AttendanceReportItemResponse = {
  id: number;
  staffId: number;
  staffName: string;
  branchId: number;
  clockInAt: string;
  clockOutAt: string | null;
  breakMinutes: number | null;
  workedMinutes: number | null;
  attendanceStatus: "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";
};

export type CreateTransactionRequest = {
  branchId: number;
  appointmentId?: number;
  customerId?: number;
  customerVoucherId?: number;
  cashierId: number;
  discountTotal: number;
  lines: Array<{
    serviceId: number;
    qty: number;
    discountAmount: number;
    assignedStaffId?: number;
  }>;
  payments: Array<{
    method: PaymentMethod;
    amount: number;
    referenceNo?: string;
    proofImageBase64?: string;
    proofImageContentType?: string;
  }>;
};

export type CreateTransactionResponse = {
  transactionId: number;
  receiptNo: string;
  subtotal: number;
  discountTotal: number;
  total: number;
};

export type ReceiptResponse = {
  receiptNo: string;
  receiptJson: string;
  sentStatus: string;
  generatedAt: string;
};

export type ReceiptHistoryItemResponse = {
  receiptNo: string;
  generatedAt: string;
  branchId: number;
  cashierId: number;
  total: number;
  sentStatus: string;
  transactionStatus: TransactionStatus;
};

export type PagedResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type CreateRefundRequest = {
  receiptNo?: string;
  transactionId?: number;
  approvedBy: number;
  reason: string;
  totalRefund?: number;
};

export type CreateRefundResponse = {
  refundId: number;
  transactionId: number;
  receiptNo: string;
  totalRefund: number;
  refundedAt: string;
};

export type CommissionStatementResponse = {
  staffId: number;
  earned: number;
  reversal: number;
  net: number;
};

export type SalesSummaryResponse = {
  grossSales: number;
  netSales: number;
  discountTotal: number;
  refundTotal: number;
  averageBill: number;
  transactionCount: number;
};

export type CreateAppointmentRequest = {
  customerId?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  staffId?: number;
  branchId: number;
  serviceId?: number;
  startAt: string;
  endAt?: string;
  status?: AppointmentStatus;
  depositAmount?: number;
  customerNote?: string;
  internalNote?: string;
};

export type UpdateAppointmentRequest = {
  customerId?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  staffId?: number;
  branchId: number;
  serviceId?: number;
  startAt: string;
  endAt?: string;
  depositAmount?: number;
  customerNote?: string;
  internalNote?: string;
};

export type AppointmentResponse = {
  id: number;
  bookingReference: string;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  displayName: string | null;
  displayPhone: string | null;
  staffId: number | null;
  staffName: string | null;
  branchId: number;
  serviceId: number | null;
  serviceName: string | null;
  bookingChannel: string;
  startAt: string;
  endAt: string | null;
  status: AppointmentStatus;
  depositAmount: number | null;
  customerNote: string | null;
  internalNote: string | null;
  cancellationReason: string | null;
  createdByCustomerId: number | null;
  convertedTransactionId: number | null;
  receiptNo: string | null;
  createdAt: string;
  confirmationEmailSentAt: string | null;
  reminderEmailSentAt: string | null;
};

export type AppointmentCheckoutDraft = {
  appointmentId: number;
  bookingReference: string;
  branchId: number;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  displayName: string | null;
  displayPhone: string | null;
  staffId: number | null;
  staffName: string | null;
  serviceId: number | null;
  serviceName: string | null;
};

export type ConvertAppointmentToBillRequest = {
  cashierId: number;
  discountTotal: number;
  customerVoucherId?: number;
  payments: Array<{
    method: PaymentMethod;
    amount: number;
    referenceNo?: string;
  }>;
};

export type CreateCustomerRequest = {
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  favoriteStaffId?: number;
  secondaryFavoriteStaffId?: number;
  marketingOptIn?: boolean;
  notes?: string;
};

export type UpdateCustomerRequest = Partial<CreateCustomerRequest> & {
  status?: string;
};

export type SaveVoucherCatalogRequest = {
  code: string;
  name: string;
  description?: string;
  voucherType: "FIXED_AMOUNT" | "PERCENTAGE" | "SERVICE";
  discountValue: number;
  pointsCost: number;
  minSpend?: number;
  branchId?: number;
  serviceId?: number;
  active?: boolean;
  validFrom?: string;
  validTo?: string;
  dailyRedemptionLimit?: number;
};

export type AuditLogResponse = {
  id: number;
  actorUserId: number | null;
  actorUsername: string | null;
  entityType: string;
  entityId: number | null;
  action: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
};
