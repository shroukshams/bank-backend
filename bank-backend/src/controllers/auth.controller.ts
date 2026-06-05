import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { sendSuccess, sendError } from "../lib/response";
import { AuthRequest } from "../middleware/auth";
import { audit } from "../lib/auditLogger";

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    audit("AUTH_LOGIN_FAILED", { userEmail: email, ip });
    sendError(res, "Invalid credentials", 401);
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  audit("AUTH_LOGIN", { userId: user.id, userEmail: user.email, ip });

  sendSuccess(res, {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }, "Login successful");
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  if (!user) {
    sendError(res, "User not found", 404);
    return;
  }

  sendSuccess(res, user);
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    sendError(res, "Current password is incorrect", 401);
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  audit("AUTH_CHANGE_PASSWORD", { userId: user.id, userEmail: user.email, ip });

  sendSuccess(res, null, "Password changed successfully");
};
