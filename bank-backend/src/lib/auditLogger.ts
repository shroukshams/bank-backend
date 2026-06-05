/**
 * Audit Logger — records all financial and sensitive operations.
 * Logs to stdout in structured JSON so they can be shipped to any
 * log aggregator (Datadog, ELK, CloudWatch, etc.).
 * In production, swap the `write` function to use a DB table or external service.
 */

export type AuditAction =
  | "AUTH_LOGIN"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_CHANGE_PASSWORD"
  | "CUSTOMER_CREATE"
  | "CUSTOMER_UPDATE"
  | "CUSTOMER_DELETE"
  | "ACCOUNT_CREATE"
  | "ACCOUNT_UPDATE"
  | "ACCOUNT_DELETE"
  | "TRANSACTION_DEPOSIT"
  | "TRANSACTION_WITHDRAWAL"
  | "TRANSACTION_TRANSFER";

export interface AuditEntry {
  action: AuditAction;
  userId?: number;
  userEmail?: string;
  targetId?: number | string;
  meta?: Record<string, unknown>;
  ip?: string;
  timestamp: string;
}

const write = (entry: AuditEntry): void => {
  // Structured JSON — easy to parse by log aggregators
  console.log(JSON.stringify({ AUDIT: true, ...entry }));
};

export const audit = (
  action: AuditAction,
  options: Omit<AuditEntry, "action" | "timestamp">
): void => {
  write({ action, ...options, timestamp: new Date().toISOString() });
};
