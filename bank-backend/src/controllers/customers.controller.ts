import { Response } from "express";
import { prisma } from "../lib/prisma";
import { sendSuccess, sendError, sendPaginated } from "../lib/response";
import { AuthRequest } from "../middleware/auth";
import { audit } from "../lib/auditLogger";

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;

  const where = {
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { nationalId: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(status && { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { accounts: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  sendPaginated(res, customers, total, page, limit);
};

export const getCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      accounts: {
        include: {
          _count: { select: { sentTransactions: true, receivedTransactions: true } },
        },
      },
    },
  });

  if (!customer) {
    sendError(res, "Customer not found", 404);
    return;
  }

  sendSuccess(res, customer);
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  const { firstName, lastName, email, phone, address, nationalId, dateOfBirth } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  const existing = await prisma.customer.findFirst({
    where: { OR: [{ email }, { nationalId }] },
  });

  if (existing) {
    sendError(res, "Customer with this email or national ID already exists");
    return;
  }

  const customer = await prisma.customer.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      address,
      nationalId,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    },
  });

  audit("CUSTOMER_CREATE", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: customer.id,
    meta: { email, nationalId },
    ip,
  });

  sendSuccess(res, customer, "Customer created successfully", 201);
};

export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const { firstName, lastName, email, phone, address, status } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    sendError(res, "Customer not found", 404);
    return;
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(status !== undefined && { status }),
    },
  });

  audit("CUSTOMER_UPDATE", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: id,
    meta: { changes: req.body },
    ip,
  });

  sendSuccess(res, updated, "Customer updated successfully");
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);
  const ip = req.ip || req.socket.remoteAddress;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { accounts: { where: { status: { not: "CLOSED" } } } },
  });

  if (!customer) {
    sendError(res, "Customer not found", 404);
    return;
  }

  if (customer.accounts.length > 0) {
    sendError(res, "Cannot delete customer with open accounts. Close all accounts first.");
    return;
  }

  // Also check for non-zero balance on closed accounts
  const accountsWithBalance = await prisma.account.findMany({
    where: { customerId: id, balance: { gt: 0 } },
  });

  if (accountsWithBalance.length > 0) {
    sendError(res, "Cannot delete customer with accounts that have remaining balance.");
    return;
  }

  await prisma.customer.delete({ where: { id } });

  audit("CUSTOMER_DELETE", {
    userId: req.user!.userId,
    userEmail: req.user!.email,
    targetId: id,
    ip,
  });

  sendSuccess(res, null, "Customer deleted successfully");
};
