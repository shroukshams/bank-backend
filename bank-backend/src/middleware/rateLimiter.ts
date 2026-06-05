import { Request, Response, NextFunction } from "express";
import { sendError } from "../lib/response";

interface RateLimitStore {
  count: number;
  resetAt: number;
}

// In-memory store (for production use Redis)
const store = new Map<string, RateLimitStore>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;           // max login attempts per window

export const loginRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `login:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec);
    sendError(
      res,
      `Too many login attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
      429
    );
    return;
  }

  entry.count++;
  next();
};

// Cleanup expired entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 30 * 60 * 1000);
