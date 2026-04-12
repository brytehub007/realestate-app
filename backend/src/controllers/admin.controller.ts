import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendNotFound, buildPagination } from "../utils/response";

// ── GET /admin/dashboard ──────────────────────────────────────────────────────
export async function getDashboard(_req: Request, res: Response) {
  const [
    totalUsers, totalListings, totalEscrows,
    pendingListings, activeListings,
    disputedEscrows, completedEscrows, revenueAgg,
    pendingListingDocs, pendingKyc, disputes, unverifiedReports,
  ] = await prisma.$transaction([
    prisma.profile.count(),
    prisma.listing.count(),
    prisma.escrow.count(),
    prisma.listing.count({ where: { status: "pending_review" } }),
    prisma.listing.count({ where: { status: "active" } }),
    prisma.escrow.count({ where: { status: "disputed" } }),
    prisma.escrow.count({ where: { status: "completed" } }),
    prisma.escrow.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
    prisma.listing.findMany({
      where:   { status: "pending_review" },
      include: { owner: { select: { id: true, firstName: true, lastName: true, email: true, role: true, kycStatus: true } }, images: { where: { isPrimary: true }, take: 1 } },
      orderBy: { createdAt: "desc" }, take: 20,
    }),
    prisma.profile.findMany({
      where:   { kycStatus: "pending" },
      select:  { id: true, firstName: true, lastName: true, email: true, role: true, kycStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 20,
    }),
    prisma.escrow.findMany({
      where:   { status: "disputed" },
      include: {
        listing: { select: { title: true } },
        buyer:   { select: { firstName: true, lastName: true } },
        seller:  { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" }, take: 10,
    }),
    prisma.areaReport.findMany({ where: { isVerified: false }, orderBy: { upvotes: "desc" }, take: 20 }),
  ]);

  return sendSuccess(res, {
    stats: {
      totalUsers, totalListings, totalEscrows,
      pendingListings, activeListings,
      disputedEscrows, completedEscrows,
      totalRevenue: (revenueAgg._sum.amount ?? 0n).toString(),
    },
    pendingListings: pendingListingDocs,
    pendingKyc, disputes, unverifiedReports,
  });
}

// ── GET /admin/escrows ────────────────────────────────────────────────────────
export async function getAdminEscrows(req: AuthRequest, res: Response) {
  const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10), limitNum = parseInt(limit, 10);
  const where = status ? { status: (status as any) } : {};
  const [escrows, total] = await prisma.$transaction([
    prisma.escrow.findMany({
      where, orderBy: { updatedAt: "desc" },
      skip: (pageNum - 1) * limitNum, take: limitNum,
      include: {
        listing: { select: { title: true, state: true, lga: true } },
        buyer:   { select: { firstName: true, lastName: true, email: true } },
        seller:  { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.escrow.count({ where }),
  ]);
  return sendSuccess(res, { data: escrows, pagination: buildPagination(pageNum, limitNum, total) });
}

// ── PATCH /admin/listings/:id/approve ────────────────────────────────────────
export async function approveListing(req: AuthRequest, res: Response) {
  const listing = await prisma.listing.update({ where: { id: req.params.id }, data: { status: "active" } }).catch(() => null);
  if (!listing) return sendNotFound(res);
  return sendSuccess(res, listing, "Listing approved");
}

// ── PATCH /admin/listings/:id/reject ─────────────────────────────────────────
export async function rejectListing(req: AuthRequest, res: Response) {
  const listing = await prisma.listing.update({ where: { id: req.params.id }, data: { status: "rejected" } }).catch(() => null);
  if (!listing) return sendNotFound(res);
  return sendSuccess(res, listing, "Listing rejected");
}

// ── PATCH /admin/users/:id/suspend ───────────────────────────────────────────
export async function suspendUser(req: AuthRequest, res: Response) {
  const user = await prisma.profile.update({
    where: { id: req.params.id }, data: { isSuspended: true },
    select: { id: true, firstName: true, lastName: true, isSuspended: true },
  }).catch(() => null);
  if (!user) return sendNotFound(res);
  return sendSuccess(res, user, "User suspended");
}

// ── PATCH /admin/documents/:id/verify ────────────────────────────────────────
export async function verifyDocument(req: AuthRequest, res: Response) {
  const doc = await prisma.listingDocument.update({ where: { id: req.params.id }, data: { verified: true } }).catch(() => null);
  if (!doc) return sendNotFound(res, "Document not found");
  return sendSuccess(res, doc, "Document verified");
}

// ── PATCH /admin/reports/:id/resolve ─────────────────────────────────────────
export async function resolveReport(req: AuthRequest, res: Response) {
  const report = await prisma.areaReport.update({
    where: { id: req.params.id }, data: { isVerified: true, verifiedById: req.user!.id },
  }).catch(() => null);
  if (!report) return sendNotFound(res, "Report not found");
  return sendSuccess(res, report, "Report verified");
}

// ── PATCH /admin/escrows/:id/resolve-dispute ──────────────────────────────────
export async function resolveDispute(req: AuthRequest, res: Response) {
  const escrow = await prisma.escrow.update({
    where: { id: req.params.id },
    data:  { status: req.body.resolution || "completed", resolvedAt: new Date(), resolvedById: req.user!.id },
  }).catch(() => null);
  if (!escrow) return sendNotFound(res);
  return sendSuccess(res, escrow, "Dispute resolved");
}
