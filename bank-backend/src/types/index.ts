// ─── Enums ────────────────────────────────────────────────────────────────────
export type Role = "ADMIN" | "STAFF";
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type AccountType = "SAVINGS" | "CURRENT" | "BUSINESS";
export type AccountStatus = "ACTIVE" | "INACTIVE" | "CLOSED" | "FROZEN";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginBody {
  email: string;
  password: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

// ─── Customer ─────────────────────────────────────────────────────────────────
export interface CreateCustomerBody {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  nationalId: string;
  dateOfBirth?: string;
}

export interface UpdateCustomerBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: CustomerStatus;
}

// ─── Account ──────────────────────────────────────────────────────────────────
export interface CreateAccountBody {
  customerId: number;
  type: AccountType;
  branch: string;
}

export interface UpdateAccountBody {
  status?: AccountStatus;
  branch?: string;
}

// ─── Transaction ──────────────────────────────────────────────────────────────
export interface DepositBody {
  toAccountId: number;
  amount: number;
  description?: string;
}

export interface WithdrawBody {
  fromAccountId: number;
  amount: number;
  description?: string;
}

export interface TransferBody {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}
