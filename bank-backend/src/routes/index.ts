import { Router } from "express";
import { login, getMe, changePassword } from "../controllers/auth.controller";
import {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
} from "../controllers/customers.controller";
import {
  getAccounts, getAccount, createAccount, updateAccount, deleteAccount, getAccountStats,
} from "../controllers/accounts.controller";
import {
  getTransactions, getTransaction, deposit, withdraw, transfer, getTransactionStats,
} from "../controllers/transactions.controller";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { authenticate, requireAdmin } from "../middleware/auth";
import { loginRateLimiter } from "../middleware/rateLimiter";
import { asyncHandler, asyncAuthHandler } from "../middleware/asyncHandler";
import {
  validate,
  loginValidation,
  changePasswordValidation,
  createCustomerValidation,
  updateCustomerValidation,
  createAccountValidation,
  updateAccountValidation,
  depositValidation,
  withdrawValidation,
  transferValidation,
  idParamValidation,
  paginationValidation,
} from "../middleware/validate";

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post("/auth/login",
  loginRateLimiter,
  validate(loginValidation),
  asyncHandler(login)
);
router.get("/auth/me",
  authenticate,
  asyncAuthHandler(getMe)
);
router.put("/auth/change-password",
  authenticate,
  validate(changePasswordValidation),
  asyncAuthHandler(changePassword)
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard/stats",
  authenticate,
  asyncAuthHandler(getDashboardStats)
);

// ─── Customers ────────────────────────────────────────────────────────────────
router.get("/customers",
  authenticate,
  validate(paginationValidation),
  asyncAuthHandler(getCustomers)
);
router.get("/customers/:id",
  authenticate,
  validate(idParamValidation),
  asyncAuthHandler(getCustomer)
);
router.post("/customers",
  authenticate,
  validate(createCustomerValidation),
  asyncAuthHandler(createCustomer)
);
router.put("/customers/:id",
  authenticate,
  validate(updateCustomerValidation),
  asyncAuthHandler(updateCustomer)
);
router.delete("/customers/:id",
  authenticate,
  requireAdmin,                         // ✅ ADMIN only
  validate(idParamValidation),
  asyncAuthHandler(deleteCustomer)
);

// ─── Accounts ─────────────────────────────────────────────────────────────────
router.get("/accounts/stats",
  authenticate,
  asyncAuthHandler(getAccountStats)
);
router.get("/accounts",
  authenticate,
  validate(paginationValidation),
  asyncAuthHandler(getAccounts)
);
router.get("/accounts/:id",
  authenticate,
  validate(idParamValidation),
  asyncAuthHandler(getAccount)
);
router.post("/accounts",
  authenticate,
  validate(createAccountValidation),
  asyncAuthHandler(createAccount)
);
router.put("/accounts/:id",
  authenticate,
  validate(updateAccountValidation),
  asyncAuthHandler(updateAccount)
);
router.delete("/accounts/:id",
  authenticate,
  requireAdmin,                         // ✅ ADMIN only
  validate(idParamValidation),
  asyncAuthHandler(deleteAccount)
);

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get("/transactions/stats",
  authenticate,
  asyncAuthHandler(getTransactionStats)
);
router.get("/transactions",
  authenticate,
  validate(paginationValidation),
  asyncAuthHandler(getTransactions)
);
router.get("/transactions/:id",
  authenticate,
  validate(idParamValidation),
  asyncAuthHandler(getTransaction)
);
router.post("/transactions/deposit",
  authenticate,
  validate(depositValidation),
  asyncAuthHandler(deposit)
);
router.post("/transactions/withdraw",
  authenticate,
  validate(withdrawValidation),
  asyncAuthHandler(withdraw)
);
router.post("/transactions/transfer",
  authenticate,
  validate(transferValidation),
  asyncAuthHandler(transfer)
);

export default router;
