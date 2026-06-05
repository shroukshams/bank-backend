import { Response } from "express";
import { prisma } from "../lib/prisma";
import { sendSuccess, sendError, sendPaginated } from "../lib/response";
import { AuthRequest } from "../middleware/auth";
import { audit } from "../lib/auditLogger";

const generateReference = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  const where = {
    ...(type && { type: type as "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" }),
    ...(status && { status: status as "PENDING" | "COMPLETED" | "FAILED" | "REVERSED" }),
    ...(accountId && {
      OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
    }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo + "T23:59:59.999Z") }),
          },
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        fromAccount: { include: { customer: { select: { firstName: true, lastName: true } } } },
        toAccount: { include: { customer: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  sendPaginated(res, transactions, total, page, limit);
};

export const getTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      fromAccount: { include: { customer: true } },
      toAccount: { include: { customer: true } },
    },
  });

  if (!transaction) {
    sendError(res, "Transaction not found", 404);
    return;
  }

  sendSuccess(res, transaction);
};

export const deposit = async (req: AuthRequest, res: Response): Promise<void> => {
  const { toAccountId, amount, description } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  const account = await prisma.account.findUnique({ where: { id: parseInt(toAccountId) } });
  if (!account) {
    sendError(res, "Account not found", 404);
    return;
  }
  if (account.status !== "ACTIVE") {
    sendError(res, "Account is not active");
    return;
  }

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        reference: generateReference(),
        type: "DEPOSIT",
        amount,
        description,
        toAccountId: parseInt(toAccountId),
        status: "COMPLETED",
      },
      include: {
        toAccount: { include: { customer: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.account.update({
      where: { id: parseInt(toAccountId) },
      data: { balance: { increment: amount } },
    }),
  ]);

  audit("TRANSACTION_DEPOSIT", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: transaction.id,
    meta: { amount, toAccountId, reference: transaction.reference },
    ip,
  });

  sendSuccess(res, transaction, "Deposit successful", 201);
};

export const withdraw = async (req: AuthRequest, res: Response): Promise<void> => {
  const { fromAccountId, amount, description } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  const account = await prisma.account.findUnique({ where: { id: parseInt(fromAccountId) } });
  if (!account) {
    sendError(res, "Account not found", 404);
    return;
  }
  if (account.status !== "ACTIVE") {
    sendError(res, "Account is not active");
    return;
  }
  if (Number(account.balance) < amount) {
    sendError(res, "Insufficient balance");
    return;
  }

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        reference: generateReference(),
        type: "WITHDRAWAL",
        amount,
        description,
        fromAccountId: parseInt(fromAccountId),
        status: "COMPLETED",
      },
    }),
    prisma.account.update({
      where: { id: parseInt(fromAccountId) },
      data: { balance: { decrement: amount } },
    }),
  ]);

  audit("TRANSACTION_WITHDRAWAL", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: transaction.id,
    meta: { amount, fromAccountId, reference: transaction.reference },
    ip,
  });

  sendSuccess(res, transaction, "Withdrawal successful", 201);
};

export const transfer = async (req: AuthRequest, res: Response): Promise<void> => {
  const { fromAccountId, toAccountId, amount, description } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  if (fromAccountId === toAccountId) {
    sendError(res, "Cannot transfer to the same account");
    return;
  }

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findUnique({ where: { id: parseInt(fromAccountId) } }),
    prisma.account.findUnique({ where: { id: parseInt(toAccountId) } }),
  ]);

  if (!fromAccount || !toAccount) {
    sendError(res, "One or both accounts not found", 404);
    return;
  }
  if (fromAccount.status !== "ACTIVE" || toAccount.status !== "ACTIVE") {
    sendError(res, "Both accounts must be active");
    return;
  }
  if (Number(fromAccount.balance) < amount) {
    sendError(res, "Insufficient balance");
    return;
  }

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        reference: generateReference(),
        type: "TRANSFER",
        amount,
        description,
        fromAccountId: parseInt(fromAccountId),
        toAccountId: parseInt(toAccountId),
        status: "COMPLETED",
      },
      include: {
        fromAccount: { include: { customer: { select: { firstName: true, lastName: true } } } },
        toAccount: { include: { customer: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.account.update({
      where: { id: parseInt(fromAccountId) },
      data: { balance: { decrement: amount } },
    }),
    prisma.account.update({
      where: { id: parseInt(toAccountId) },
      data: { balance: { increment: amount } },
    }),
  ]);

  audit("TRANSACTION_TRANSFER", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: transaction.id,
    meta: { amount, fromAccountId, toAccountId, reference: transaction.reference },
    ip,
  });

  sendSuccess(res, transaction, "Transfer successful", 201);
};

export const getTransactionStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [total, byType, totalVolume, monthlyVolume] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.groupBy({ by: ["type"], _count: true, _sum: { amount: true } }),
    prisma.transaction.aggregate({ _sum: { amount: true } }),
    prisma.$queryRaw<{ month: string; deposits: number; withdrawals: number }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
        SUM(CASE WHEN type = 'DEPOSIT' THEN CAST(amount AS FLOAT) ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'WITHDRAWAL' THEN CAST(amount AS FLOAT) ELSE 0 END) as withdrawals
      FROM transactions
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt") ASC
    `,
  ]);

  sendSuccess(res, {
    total,
    byType,
    totalVolume: totalVolume._sum.amount ?? 0,
    monthlyVolume,
  });
};
