import { Request, Response } from "express";
import { supabase, supabaseAdmin } from "../config/supabase";
import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/auth";
import {
  sendSuccess, sendCreated, sendBadRequest,
  sendUnauthorized, sendNotFound,
} from "../utils/response";
import { AppError } from "../middleware/errorHandler";

// ── POST /auth/register ───────────────────────────────────────────────────────
// 1. Creates user in Supabase Auth (sends confirmation email automatically)
// 2. Creates matching Profile row in Prisma with same UUID
export async function register(req: Request, res: Response) {
  const { firstName, lastName, email, phone, password, role } = req.body;

  // Step 1: Create Supabase Auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false, // user must confirm via email OTP
    user_metadata: { firstName, lastName, role: role || "buyer" },
  });

  if (authError) {
    if (authError.message.includes("already")) throw new AppError("Email already registered", 409);
    throw new AppError(authError.message, 400);
  }

  const supabaseUser = authData.user;

  // Step 2: Create Profile in Prisma using the same UUID
  const profile = await prisma.profile.create({
    data: {
      id:        supabaseUser.id,   // mirrors Supabase auth.users.id
      firstName, lastName, email,
      phone:     phone || "",
      role:      role  || "buyer",
      verifications: { create: {} },
    },
  });

  return sendCreated(res, {
    id: profile.id, email: profile.email, role: profile.role,
  }, "Account created. Check your email to verify your account.");
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
// Supabase handles password verification and returns JWT tokens
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      // Re-send OTP and tell frontend to show OTP screen
      await supabase.auth.resend({ type: "signup", email });
      return res.status(200).json({
        success: true, requiresOtp: true, email,
        message: "Please verify your email. A new code has been sent.",
      });
    }
    return sendUnauthorized(res, "Invalid email or password");
  }

  const profile = await prisma.profile.findUnique({
    where:  { id: data.user.id },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      role: true, avatarUrl: true, trustScore: true, kycStatus: true,
      isSuspended: true, isActive: true,
      verifications: { select: { emailVerified: true } },
    },
  });

  if (!profile)              return sendUnauthorized(res, "Profile not found");
  if (profile.isSuspended)   throw new AppError("Account suspended. Contact support.", 403);
  if (!profile.isActive)     throw new AppError("Account inactive.", 403);

  return sendSuccess(res, {
    user: {
      id:           profile.id,
      firstName:    profile.firstName,
      lastName:     profile.lastName,
      email:        profile.email,
      role:         profile.role,
      avatar:       profile.avatarUrl,
      trustScore:   profile.trustScore,
      kycStatus:    profile.kycStatus,
      emailVerified: profile.verifications?.emailVerified ?? false,
    },
    accessToken:  data.session.access_token,
    refreshToken: data.session.refresh_token,
  }, "Login successful");
}

// ── POST /auth/verify-otp ─────────────────────────────────────────────────────
// Supabase sends a 6-digit OTP to email on signup. We verify it here.
export async function verifyOtp(req: Request, res: Response) {
  const { email, otp } = req.body;

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type:  "signup",
  });

  if (error || !data.session) return sendBadRequest(res, "Invalid or expired code");

  // Mark emailVerified in Prisma
  const profile = await prisma.profile.findUnique({ where: { id: data.user!.id } });
  if (profile) {
    await prisma.profileVerification.upsert({
      where:  { profileId: profile.id },
      update: { emailVerified: true },
      create: { profileId: profile.id, emailVerified: true },
    });
  }

  return sendSuccess(res, {
    user: {
      id:           data.user!.id,
      firstName:    profile?.firstName,
      lastName:     profile?.lastName,
      email:        data.user!.email,
      role:         profile?.role,
      emailVerified: true,
    },
    accessToken:  data.session.access_token,
    refreshToken: data.session.refresh_token,
  }, "Email verified successfully");
}

// ── POST /auth/resend-otp ─────────────────────────────────────────────────────
export async function resendOtp(req: Request, res: Response) {
  const { email } = req.body;
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return sendBadRequest(res, error.message);
  return sendSuccess(res, null, "Verification code resent to your email");
}

// ── POST /auth/refresh ────────────────────────────────────────────────────────
// Exchange a Supabase refresh token for a new access token
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return sendBadRequest(res, "Refresh token required");

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return sendUnauthorized(res, "Invalid refresh token");

  return sendSuccess(res, {
    accessToken:  data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
export async function getMe(req: AuthRequest, res: Response) {
  const profile = await prisma.profile.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, role: true, kycStatus: true, avatarUrl: true,
      bio: true, state: true, lga: true,
      rating: true, reviewCount: true, trustScore: true,
      verifications: true, createdAt: true,
    },
  });
  if (!profile) return sendNotFound(res, "Profile not found");
  return sendSuccess(res, profile);
}

// ── POST /auth/forgot-password ────────────────────────────────────────────────
// Supabase sends a password reset email automatically
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  // Always return success — don't reveal if email exists
  await supabase.auth.resetPasswordForEmail(email).catch(() => null);
  return sendSuccess(res, null, "If that email exists, a reset link has been sent.");
}

// ── POST /auth/reset-password ─────────────────────────────────────────────────
// After user clicks the reset link, they get a recovery token. Exchange it here.
export async function resetPassword(req: Request, res: Response) {
  const { email, otp, newPassword } = req.body;

  // Verify the OTP Supabase sent in the reset email
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type:  "recovery",
  });

  if (error || !data.session) return sendBadRequest(res, "Invalid or expired reset code");

  // Update password using the session from the verified OTP
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    data.user!.id,
    { password: newPassword }
  );

  if (updateError) throw new AppError(updateError.message);
  return sendSuccess(res, null, "Password updated successfully");
}
