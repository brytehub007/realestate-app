import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

export interface AuthUser {
  id:            string;
  firstName:     string;
  lastName:      string;
  email:         string;
  role:          string;
  avatar?:       string;
  trustScore:    number;
  kycStatus:     string;
  emailVerified: boolean;
}

interface AuthState {
  user:         AuthUser | null;
  accessToken:  string | null;
  refreshToken: string | null;
  isLoading:    boolean;

  setTokens:    (access: string, refresh: string) => void;
  setUser:      (user: AuthUser) => void;
  fetchMe:      () => Promise<void>;
  logout:       () => void;
}

// Map the Prisma /auth/me response → AuthUser
// The API returns verifications as a nested object:
//   { emailVerified, phoneVerified, ninVerified, ... }
function normalizeApiUser(raw: Record<string, unknown>): AuthUser {
  const v = (raw.verifications ?? {}) as Record<string, boolean>;
  return {
    id:            raw.id         as string,
    firstName:     raw.firstName  as string,
    lastName:      raw.lastName   as string,
    email:         raw.email      as string,
    role:          raw.role       as string,
    avatar:        raw.avatar     as string | undefined,
    trustScore:    (raw.trustScore as number)  ?? 0,
    kycStatus:     (raw.kycStatus  as string)  ?? "unverified",
    // emailVerified lives inside verifications object in Prisma schema
    emailVerified: v.emailVerified ?? (raw.isVerified as boolean) ?? false,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,

      setTokens(access, refresh) {
        localStorage.setItem("sh_access_token",  access);
        localStorage.setItem("sh_refresh_token", refresh);
        set({ accessToken: access, refreshToken: refresh });
      },

      setUser(user) {
        set({ user });
      },

      async fetchMe() {
        if (!get().accessToken) return;
        set({ isLoading: true });
        try {
          const { data } = await api.get("/auth/me");
          set({ user: normalizeApiUser(data.data) });
        } catch {
          set({ user: null });
        } finally {
          set({ isLoading: false });
        }
      },

      logout() {
        localStorage.removeItem("sh_access_token");
        localStorage.removeItem("sh_refresh_token");
        set({ user: null, accessToken: null, refreshToken: null });
        window.location.href = "/login";
      },
    }),
    {
      name: "sh_auth",
      partialize: state => ({
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        user:         state.user,
      }),
    }
  )
);
