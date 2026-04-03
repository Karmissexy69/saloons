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
  customerId?: number;
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
  staffId?: number;
  branchId: number;
  serviceId?: number;
  startAt: string;
  endAt?: string;
  status?: AppointmentStatus;
  depositAmount?: number;
  notes?: string;
};

export type AppointmentResponse = {
  id: number;
  customerId: number | null;
  staffId: number | null;
  branchId: number;
  serviceId: number | null;
  startAt: string;
  endAt: string | null;
  status: AppointmentStatus;
  depositAmount: number | null;
  notes: string | null;
  convertedTransactionId: number | null;
};

export type ConvertAppointmentToBillRequest = {
  cashierId: number;
  discountTotal: number;
  payments: Array<{
    method: PaymentMethod;
    amount: number;
    referenceNo?: string;
  }>;
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
