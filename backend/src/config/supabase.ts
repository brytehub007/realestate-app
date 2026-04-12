import { createClient } from "@supabase/supabase-js";
import { config } from "./index";

// ── Anon client — used to verify user JWTs from incoming requests
// Supabase Auth tokens are standard JWTs signed with your project secret.
// supabase.auth.getUser(token) validates the token against Supabase's auth server.
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// ── Service-role client — bypasses RLS, used for admin operations and
// server-side storage uploads. NEVER expose this key to the frontend.
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
