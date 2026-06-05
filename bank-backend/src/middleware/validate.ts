import { Request, Response, NextFunction } from "express";
import { body, param, query, validationResult, ValidationChain } from "express-validator";
import { sendError } from "../lib/response";

// Runs validation chains then returns errors if any
export const validate = (chains: ValidationChain[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const chain of chains) await chain.run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendError(res, "Validation failed", 422, errors.array());
      return;
    }
    next();
  };

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Must contain an uppercase letter")
    .matches(/[0-9]/).withMessage("Must contain a number"),
];

// ─── Customer ─────────────────────────────────────────────────────────────────
export const createCustomerValidation = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("phone")
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage("Valid phone number required"),
  body("nationalId").trim().notEmpty().withMessage("National ID is required"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date (YYYY-MM-DD)"),
];

export const updateCustomerValidation = [
  param("id").isInt({ min: 1 }).withMessage("Valid customer ID required"),
  body("email").optional().isEmail().normalizeEmail().withMessage("Valid email required"),
  body("phone")
    .optional()
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage("Valid phone number required"),
  body("status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE", "SUSPENDED"])
    .withMessage("Invalid status"),
];

// ─── Account ──────────────────────────────────────────────────────────────────
export const createAccountValidation = [
  body("customerId").isInt({ min: 1 }).withMessage("Valid customer ID required"),
  body("type")
    .isIn(["SAVINGS", "CURRENT", "BUSINESS"])
    .withMessage("Account type must be SAVINGS, CURRENT, or BUSINESS"),
  body("branch").trim().notEmpty().withMessage("Branch is required"),
];

export const updateAccountValidation = [
  param("id").isInt({ min: 1 }).withMessage("Valid account ID required"),
  body("status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE", "CLOSED", "FROZEN"])
    .withMessage("Invalid account status"),
  body("branch").optional().trim().notEmpty().withMessage("Branch cannot be empty"),
];

// ─── Transactions ─────────────────────────────────────────────────────────────
export const depositValidation = [
  body("toAccountId").isInt({ min: 1 }).withMessage("Valid account ID required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number greater than 0"),
  body("description").optional().trim().isLength({ max: 255 }),
];

export const withdrawValidation = [
  body("fromAccountId").isInt({ min: 1 }).withMessage("Valid account ID required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number greater than 0"),
  body("description").optional().trim().isLength({ max: 255 }),
];

export const transferValidation = [
  body("fromAccountId").isInt({ min: 1 }).withMessage("Valid source account ID required"),
  body("toAccountId").isInt({ min: 1 }).withMessage("Valid destination account ID required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number greater than 0"),
  body("description").optional().trim().isLength({ max: 255 }),
];

// ─── Shared ───────────────────────────────────────────────────────────────────
export const idParamValidation = [
  param("id").isInt({ min: 1 }).withMessage("Valid ID required"),
];

export const paginationValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
];
