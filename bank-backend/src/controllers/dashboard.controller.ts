import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { sendSuccess } from "../lib/response";

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  const [
    totalCustomers,
    totalAccounts,
    totalTransactions,
    totalBalance,
    recentTransactions,
    accountsByType,
    monthlyData,
  ] = await Promise.all([
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.account.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.count(),
    prisma.account.aggregate({ _sum: { balance: true } }),
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        fromAccount: { include: { customer: { select: { firstName: true, lastName: true } } } },
        toAccount: { include: { customer: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.account.groupBy({
      by: ["type"],
      _count: true,
      where: { status: "ACTIVE" },
    }),
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
    stats: {
      totalCustomers,
      totalAccounts,
      totalTransactions,
      totalBalance: totalBalance._sum.balance ?? 0,
    },
    recentTransactions,
    accountsByType,
    monthlyData,
  });
};
