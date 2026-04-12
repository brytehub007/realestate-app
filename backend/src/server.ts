import "express-async-errors";
import express       from "express";
import http          from "http";
import cors          from "cors";
import helmet        from "helmet";
import compression   from "compression";
import morgan        from "morgan";
import rateLimit     from "express-rate-limit";

import { config }              from "./config";
import { prisma }              from "./prisma/client";
import { logger }              from "./utils/logger";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { initSocketServer }    from "./sockets";

import authRoutes     from "./routes/auth.routes";
import listingRoutes  from "./routes/listings.routes";
import uploadRoutes   from "./routes/uploads.routes";
import escrowRoutes   from "./routes/escrow.routes";
import messageRoutes  from "./routes/messages.routes";
import userRoutes     from "./routes/users.routes";
import adminRoutes    from "./routes/admin.routes";
import { areaRouter, servicesRouter } from "./routes/area.routes";

const app    = express();
const server = http.createServer(app);
export const io = initSocketServer(server);

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, cb) {
    if (!origin || config.cors.origins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
}));
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.isDev ? "dev" : "combined", {
  stream: { write: msg => logger.http(msg.trim()) },
  skip:   req => req.url === "/health",
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({
  status: "ok", service: "shelters-horizon-api", version: "4.0.0",
  stack:  "Express + Prisma + Supabase",
  env:    config.env, timestamp: new Date().toISOString(),
}));

// ── API Routes ────────────────────────────────────────────────────────────────
const p = config.apiPrefix;
app.use(`${p}/auth`,          authRoutes);
app.use(`${p}/listings`,      listingRoutes);
app.use(`${p}/uploads`,       uploadRoutes);
app.use(`${p}/escrow`,        escrowRoutes);
app.use(`${p}/conversations`, messageRoutes);
app.use(`${p}/users`,         userRoutes);
app.use(`${p}/admin`,         adminRoutes);
app.use(`${p}/area-reports`,  areaRouter);
app.use(`${p}/services`,      servicesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// ── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`${signal} — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await prisma.$connect();
    logger.info("✓ Prisma connected to Supabase PostgreSQL");

    server.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════╗
║        ⌂  Shelters' Horizon API  v4.0.0                ║
╠══════════════════════════════════════════════════════════╣
║  Auth     : Supabase Auth                                ║
║  Database : Supabase PostgreSQL (Prisma ORM)             ║
║  Storage  : Supabase Storage                             ║
║  Port     : ${String(config.port).padEnd(44)}║
║  Env      : ${config.env.padEnd(44)}║
╚══════════════════════════════════════════════════════════╝`);
    });
  } catch (err) {
    logger.error(`Failed to start: ${err}`);
    process.exit(1);
  }
}

start();
export default app;
