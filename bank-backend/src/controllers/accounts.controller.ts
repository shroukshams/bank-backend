import { Response } from "express";
import { prisma } from "../lib/prisma";
import { sendSuccess, sendError, sendPaginated } from "../lib/response";
import { AuthRequest } from "../middleware/auth";
import { audit } from "../lib/auditLogger";

const generateAccountNumber = (): string => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ACC${timestamp}${random}`;
};

export const getAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const type = req.query.type as string | undefined;
  const branch = req.query.branch as string | undefined;

  const where = {
    ...(search && {
      OR: [
        { accountNumber: { contains: search, mode: "insensitive" as const } },
        { customer: { firstName: { contains: search, mode: "insensitive" as const } } },
        { customer: { lastName: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
    ...(status && { status: status as "ACTIVE" | "INACTIVE" | "CLOSED" | "FROZEN" }),
    ...(type && { type: type as "SAVINGS" | "CURRENT" | "BUSINESS" }),
    ...(branch && { branch: { contains: branch, mode: "insensitive" as const } }),
  };

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      skip,
      take: limit,
      orderBy: { openDate: "desc" },
      include: { customer: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.account.count({ where }),
  ]);

  sendPaginated(res, accounts, total, page, limit);
};

export const getAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const txPage = Math.max(1, parseInt(req.query.txPage as string) || 1);
  const txLimit = Math.min(50, Math.max(1, parseInt(req.query.txLimit as string) || 10));
  const txSkip = (txPage - 1) * txLimit;

  const account = await prisma.account.findUnique({
    where: { id },
    include: { customer: true },
  });

  if (!account) {
    sendError(res, "Account not found", 404);
    return;
  }

  // Paginated transactions for this account
  const [transactions, txTotal] = await Promise.all([
    prisma.transaction.findMany({
      where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
      orderBy: { createdAt: "desc" },
      skip: txSkip,
      take: txLimit,
    }),
    prisma.transaction.count({
      where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
    }),
  ]);

  sendSuccess(res, {
    ...account,
    transactions,
    transactionPagination: {
      total: txTotal,
      page: txPage,
      limit: txLimit,
      totalPages: Math.ceil(txTotal / txLimit),
    },
  });
};

export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const { customerId, type, branch } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  const customer = await prisma.customer.findUnique({ where: { id: parseInt(customerId) } });
  if (!customer) {
    sendError(res, "Customer not found", 404);
    return;
  }

  if (customer.status !== "ACTIVE") {
    sendError(res, "Cannot create account for inactive or suspended customer");
    return;
  }

  // Collision-safe account number generation
  let accountNumber: string;
  let attempts = 0;
  do {
    accountNumber = generateAccountNumber();
    attempts++;
    if (attempts > 10) {
      sendError(res, "Failed to generate unique account number, please retry", 500);
      return;
    }
  } while (await prisma.account.findUnique({ where: { accountNumber } }));

  const account = await prisma.account.create({
    data: { accountNumber, type, branch, customerId: parseInt(customerId) },
    include: { customer: { select: { id: true, firstName: true, lastName: true } } },
  });

  audit("ACCOUNT_CREATE", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: account.id,
    meta: { accountNumber, type, branch, customerId },
    ip,
  });

  sendSuccess(res, account, "Account created successfully", 201);
};

export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const { status, branch } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    sendError(res, "Account not found", 404);
    return;
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(branch !== undefined && { branch }),
    },
    include: { customer: { select: { id: true, firstName: true, lastName: true } } },
  });

  audit("ACCOUNT_UPDATE", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: id,
    meta: { changes: req.body },
    ip,
  });

  sendSuccess(res, updated, "Account updated successfully");
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const ip = req.ip || req.socket.remoteAddress;

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    sendError(res, "Account not found", 404);
    return;
  }

  if (Number(account.balance) > 0) {
    sendError(res, "Cannot delete account with remaining balance. Withdraw funds first.");
    return;
  }

  await prisma.account.delete({ where: { id } });

  audit("ACCOUNT_DELETE", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: id,
    meta: { accountNumber: account.accountNumber },
    ip,
  });

  sendSuccess(res, null, "Account deleted successfully");
};

export const getAccountStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [total, byType, byStatus, totalBalance] = await Promise.all([
    prisma.account.count(),
    prisma.account.groupBy({ by: ["type"], _count: true }),
    prisma.account.groupBy({ by: ["status"], _count: true }),
    prisma.account.aggregate({ _sum: { balance: true } }),
  ]);

  sendSuccess(res, { total, byType, byStatus, totalBalance: totalBalance._sum.balance ?? 0 });
};
