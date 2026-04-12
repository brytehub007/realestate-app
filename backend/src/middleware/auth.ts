import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { prisma }   from "../prisma/client";
import { sendUnauthorized, sendForbidden } from "../utils/response";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// ── authenticate ─────────────────────────────────────────────────────────────
// 1. Reads Bearer token from Authorization header
// 2. Validates it with Supabase Auth (supabase.auth.getUser)
// 3. Loads the matching Profile from Prisma to get the role
// 4. Attaches { id, email, role } to req.user
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return sendUnauthorized(res, "No token provided");

  const token = header.split(" ")[1];

  // Verify with Supabase — this validates signature + expiry
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return sendUnauthorized(res, "Invalid or expired token");

  // Load profile for role
  const profile = await prisma.profile.findUnique({
    where:  { id: user.id },
    select: { id: true, role: true, isSuspended: true, isActive: true },
  });

  if (!profile)         return sendUnauthorized(res, "Profile not found. Complete registration.");
  if (profile.isSuspended) return sendForbidden(res, "Account suspended. Contact support.");
  if (!profile.isActive)   return sendForbidden(res, "Account inactive.");

  req.user = { id: profile.id, email: user.email!, role: profile.role };
  next();
}

// ── optionalAuth ──────────────────────────────────────────────────────────────
// Same as authenticate but never blocks — used for public routes that behave
// differently for logged-in users (e.g. listings show if you saved them)
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  const token = header.split(" ")[1];
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      const profile = await prisma.profile.findUnique({
        where:  { id: user.id },
        select: { id: true, role: true },
      });
      if (profile) req.user = { id: profile.id, email: user.email!, role: profile.role };
    }
  } catch { /* no-op */ }
  next();
}

// ── requireRole ──────────────────────────────────────────────────────────────
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user)                     return sendUnauthorized(res);
    if (!roles.includes(req.user.role)) return sendForbidden(res, "Insufficient permissions");
    next();
  };
}
