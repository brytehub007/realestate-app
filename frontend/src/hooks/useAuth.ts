import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/auth.store";

/* ── Login (step 1) — send credentials ──────────────────────────────────── */
// API returns: { user, accessToken, refreshToken } on success
//           or { requiresOtp: true, email }         if unverified
export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.post("/auth/login", { email, password }).then(r => r.data),
  });
}

/* ── Verify OTP ──────────────────────────────────────────────────────────── */
// API expects: { email, otp }
// API returns: { user, accessToken, refreshToken }
export function useVerifyOtp() {
  const { setTokens, setUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ email, otp }: { email: string; otp: string }) =>
      api.post("/auth/verify-otp", { email, otp }).then(r => r.data.data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(normalizeUser(data.user));
      navigate("/dashboard");
    },
  });
}

/* ── Register ────────────────────────────────────────────────────────────── */
// API returns: { id, email, role, isVerified }
// After register, show OTP screen — pass email as state
export function useRegister() {
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post("/auth/register", body).then(r => r.data.data),
  });
}

/* ── Resend OTP ──────────────────────────────────────────────────────────── */
// API expects: { email }
export function useResendOtp() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      api.post("/auth/resend-otp", { email }).then(r => r.data),
  });
}

/* ── Forgot password ────────────────────────────────────────────────────── */
export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      api.post("/auth/forgot-password", { email }).then(r => r.data),
  });
}

/* ── Reset password ─────────────────────────────────────────────────────── */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ email, otp, newPassword }: { email: string; otp: string; newPassword: string }) =>
      api.post("/auth/reset-password", { email, otp, newPassword }).then(r => r.data),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

// Map the Prisma API user shape to the AuthStore AuthUser shape
export function normalizeUser(apiUser: Record<string, unknown>) {
  const v = (apiUser.verifications ?? {}) as Record<string, boolean>;
  return {
    id:            apiUser.id as string,
    firstName:     apiUser.firstName as string,
    lastName:      apiUser.lastName  as string,
    email:         apiUser.email     as string,
    role:          apiUser.role      as string,
    avatar:        apiUser.avatar    as string | undefined,
    trustScore:    (apiUser.trustScore as number) ?? 0,
    kycStatus:     (apiUser.kycStatus as string) ?? "unverified",
    emailVerified: v.emailVerified ?? (apiUser.isVerified as boolean) ?? false,
  };
}
