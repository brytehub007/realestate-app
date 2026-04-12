import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendNotFound, sendBadRequest } from "../utils/response";

// ── GET /users/me/notifications ───────────────────────────────────────────────
export async function getNotifications(req: AuthRequest, res: Response) {
  const { unread } = req.query;
  const [notifications, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where:   { profileId: req.user!.id, ...(unread === "true" ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
      take:    50,
    }),
    prisma.notification.count({ where: { profileId: req.user!.id, isRead: false } }),
  ]);
  return sendSuccess(res, { notifications, unreadCount });
}

// ── PATCH /users/me/notifications/read-all ────────────────────────────────────
export async function markAllNotificationsRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { profileId: req.user!.id, isRead: false },
    data:  { isRead: true },
  });
  return sendSuccess(res, null, "All notifications marked as read");
}

// ── GET /users/me/saved-searches ──────────────────────────────────────────────
export async function getSavedSearches(req: AuthRequest, res: Response) {
  const searches = await prisma.savedSearch.findMany({
    where: { profileId: req.user!.id }, orderBy: { createdAt: "desc" },
  });
  return sendSuccess(res, searches);
}

// ── POST /users/me/saved-searches ─────────────────────────────────────────────
export async function createSavedSearch(req: AuthRequest, res: Response) {
  const { name, filters, frequency, channels } = req.body;
  const search = await prisma.savedSearch.create({
    data: { profileId: req.user!.id, name, filters, frequency, channels },
  });
  return sendSuccess(res, search, "Alert created");
}

// ── PATCH /users/me/saved-searches/:id ───────────────────────────────────────
export async function updateSavedSearch(req: AuthRequest, res: Response) {
  const search = await prisma.savedSearch.findFirst({
    where: { id: req.params.id, profileId: req.user!.id },
  });
  if (!search) return sendNotFound(res);
  const updated = await prisma.savedSearch.update({ where: { id: search.id }, data: req.body });
  return sendSuccess(res, updated, "Alert updated");
}

// ── DELETE /users/me/saved-searches/:id ──────────────────────────────────────
export async function deleteSavedSearch(req: AuthRequest, res: Response) {
  const search = await prisma.savedSearch.findFirst({
    where: { id: req.params.id, profileId: req.user!.id },
  });
  if (!search) return sendNotFound(res);
  await prisma.savedSearch.delete({ where: { id: search.id } });
  return sendSuccess(res, null, "Alert deleted");
}

// ── PATCH /users/me ───────────────────────────────────────────────────────────
export async function updateProfile(req: AuthRequest, res: Response) {
  const ALLOWED = ["firstName","lastName","phone","bio","avatarUrl","state","lga"];
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) { if (req.body[key] !== undefined) data[key] = req.body[key]; }

  const profile = await prisma.profile.update({
    where: { id: req.user!.id },
    data,
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, role: true, avatarUrl: true, bio: true,
      state: true, lga: true, verifications: true,
    },
  });
  return sendSuccess(res, profile, "Profile updated");
}

// ── GET /users/:id ────────────────────────────────────────────────────────────
export async function getUserProfile(req: Request, res: Response) {
  const profile = await prisma.profile.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, firstName: true, lastName: true, email: true,
      phone: true, role: true, kycStatus: true, avatarUrl: true,
      bio: true, state: true, lga: true,
      rating: true, reviewCount: true, trustScore: true,
      verifications: true, createdAt: true,
    },
  });
  if (!profile) return sendNotFound(res, "User not found");
  return sendSuccess(res, profile);
}

// ── GET /users/:id/reviews ────────────────────────────────────────────────────
export async function getUserReviews(req: Request, res: Response) {
  const reviews = await prisma.review.findMany({
    where:   { subjectId: req.params.id },
    include: { reviewer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });
  return sendSuccess(res, reviews);
}

// ── POST /users/reviews ───────────────────────────────────────────────────────
export async function createReview(req: AuthRequest, res: Response) {
  const { subjectId, listingId, rating, text, type } = req.body;
  const reviewerId = req.user!.id;
  if (subjectId === reviewerId) return sendBadRequest(res, "Cannot review yourself");

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({ data: { reviewerId, subjectId, listingId, rating, text, type } });
    const agg = await tx.review.aggregate({ where: { subjectId }, _avg: { rating: true }, _count: { rating: true } });
    await tx.profile.update({
      where: { id: subjectId },
      data:  { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count.rating },
    });
    return r;
  });
  return sendSuccess(res, review, "Review submitted");
}
