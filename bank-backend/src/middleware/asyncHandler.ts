import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthRequest } from "./auth";

type AsyncFn<T extends Request = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * Wraps async route handlers so unhandled promise rejections
 * are forwarded to Express's error handler instead of crashing.
 */
export const asyncHandler = <T extends Request = Request>(
  fn: AsyncFn<T>
): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };

export const asyncAuthHandler = (fn: AsyncFn<AuthRequest>): RequestHandler =>
  asyncHandler<AuthRequest>(fn);
