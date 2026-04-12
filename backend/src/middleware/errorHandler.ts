import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class AppError extends Error {
  constructor(public message: string, public statusCode = 400) {
    super(message);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error(err.message);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Prisma unique constraint violation
  if ((err as any).code === "P2002") {
    return res.status(409).json({ success: false, message: "A record with this value already exists." });
  }

  // Prisma record not found
  if ((err as any).code === "P2025") {
    return res.status(404).json({ success: false, message: "Record not found." });
  }

  return res.status(500).json({ success: false, message: "Internal server error" });
}
