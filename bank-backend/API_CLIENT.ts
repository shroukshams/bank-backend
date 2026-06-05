// =============================================================
// api.ts  –  Drop this in: client/src/lib/api.ts
// =============================================================

// ── Types ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
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

export interface User {
  id: number;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  createdAt: string;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  nationalId: string;
  dateOfBirth?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  _count?: { accounts: number };
}

export interface Account {
  id: number;
  accountNumber: string;
  type: "SAVINGS" | "CURRENT" | "BUSINESS";
  balance: string;
  status: "ACTIVE" | "INACTIVE" | "CLOSED" | "FROZEN";
  branch: string;
  openDate: string;
  customerId: number;
  customer?: { id: number; firstName: string; lastName: string };
}

export interface Transaction {
  id: number;
  reference: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
  amount: string;
  description?: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  createdAt: string;
  fromAccountId?: number;
  toAccountId?: number;
  fromAccount?: Account & { customer?: { firstName: string; lastName: string } };
  toAccount?: Account & { customer?: { firstName: string; lastName: string } };
}

export interface DashboardStats {
  stats: {
    totalCustomers: number;
    totalAccounts: number;
    totalTransactions: number;
    totalBalance: number;
  };
  recentTransactions: Transaction[];
  accountsByType: { type: string; _count: number }[];
  monthlyData: { month: string; deposits: number; withdrawals: number }[];
}

// ── Config ───────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const getToken = () => localStorage.getItem("bank_token");

// ── Core fetch ───────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("bank_token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Request failed");
  return json;
}

// ── Auth ─────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiFetch<ApiResponse<{ token: string; user: User }>>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    localStorage.setItem("bank_token", res.data.token);
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("bank_token");
    window.location.href = "/login";
  },

  getMe: () => apiFetch<ApiResponse<User>>("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<ApiResponse<null>>("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  isLoggedIn: () => !!getToken(),
};

// ── Dashboard ────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => apiFetch<ApiResponse<DashboardStats>>("/dashboard/stats"),
};

// ── Customers ────────────────────────────────────────────────

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const customersApi = {
  list: (filters: CustomerFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    return apiFetch<PaginatedResponse<Customer>>(`/customers?${params}`);
  },

  get: (id: number) => apiFetch<ApiResponse<Customer>>(`/customers/${id}`),

  create: (data: Partial<Customer>) =>
    apiFetch<ApiResponse<Customer>>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Customer>) =>
    apiFetch<ApiResponse<Customer>>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<ApiResponse<null>>(`/customers/${id}`, { method: "DELETE" }),
};

// ── Accounts ─────────────────────────────────────────────────

export interface AccountFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  branch?: string;
}

export const accountsApi = {
  list: (filters: AccountFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));
    return apiFetch<PaginatedResponse<Account>>(`/accounts?${params}`);
  },

  get: (id: number) => apiFetch<ApiResponse<Account>>(`/accounts/${id}`),

  stats: () =>
    apiFetch<ApiResponse<{ total: number; byType: unknown[]; byStatus: unknown[]; totalBalance: number }>>(
      "/accounts/stats"
    ),

  create: (data: { customerId: number; type: string; branch: string }) =>
    apiFetch<ApiResponse<Account>>("/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { status?: string; branch?: string }) =>
    apiFetch<ApiResponse<Account>>(`/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<ApiResponse<null>>(`/accounts/${id}`, { method: "DELETE" }),
};

// ── Transactions ─────────────────────────────────────────────

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  accountId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const transactionsApi = {
  list: (filters: TransactionFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v !== undefined && params.set(k, String(v)));
    return apiFetch<PaginatedResponse<Transaction>>(`/transactions?${params}`);
  },

  get: (id: number) => apiFetch<ApiResponse<Transaction>>(`/transactions/${id}`),

  deposit: (toAccountId: number, amount: number, description?: string) =>
    apiFetch<ApiResponse<Transaction>>("/transactions/deposit", {
      method: "POST",
      body: JSON.stringify({ toAccountId, amount, description }),
    }),

  withdraw: (fromAccountId: number, amount: number, description?: string) =>
    apiFetch<ApiResponse<Transaction>>("/transactions/withdraw", {
      method: "POST",
      body: JSON.stringify({ fromAccountId, amount, description }),
    }),

  transfer: (fromAccountId: number, toAccountId: number, amount: number, description?: string) =>
    apiFetch<ApiResponse<Transaction>>("/transactions/transfer", {
      method: "POST",
      body: JSON.stringify({ fromAccountId, toAccountId, amount, description }),
    }),
};
