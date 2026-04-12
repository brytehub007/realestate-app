import { PrismaClient } from "@prisma/client";

declare global { var __prisma: PrismaClient | undefined; }

const buildClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["warn", "error"],
  });

export const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? buildClient()
    : (globalThis.__prisma ??= buildClient());
