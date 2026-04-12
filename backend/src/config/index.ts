import dotenv from "dotenv";
dotenv.config();

export const config = {
  env:   process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",
  port:  parseInt(process.env.PORT || "5000", 10),

  supabase: {
    url:            process.env.SUPABASE_URL             || "",
    anonKey:        process.env.SUPABASE_ANON_KEY        || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  buckets: {
    images:    process.env.SUPABASE_BUCKET_IMAGES    || "listing-images",
    documents: process.env.SUPABASE_BUCKET_DOCUMENTS || "listing-documents",
    avatars:   process.env.SUPABASE_BUCKET_AVATARS   || "avatars",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "dev_socket_secret",
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || "http://localhost:5173")
      .split(",").map(o => o.trim()),
  },

  apiPrefix: "/api/v1",
};
