import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import { sendError } from "../lib/response";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "Unauthorized - No token provided", 401);
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    sendError(res, "Unauthorized - Invalid or expired token", 401);
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "ADMIN") {
    sendError(res, "Forbidden - Admin access required", 403);
    return;
  }
  next();
};
