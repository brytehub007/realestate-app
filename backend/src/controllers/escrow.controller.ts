import { Response } from "express";
import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendCreated, sendNotFound, sendForbidden } from "../utils/response";
import { AppError } from "../middleware/errorHandler";

const ESCROW_INCLUDE = {
  listing:    { select: { id: true, title: true, slug: true, state: true, lga: true, category: true } },
  buyer:      { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, phone: true } },
  seller:     { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, phone: true } },
  milestones: true,
  documents:  true,
  timeline: {
    include: { actor: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

function genRef() {
  return `SH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
}

function milestones(amount: bigint) {
  return [
    { phase: 1, label: "Commitment Fee",    description: "5% to secure the property",         amount: (amount * 5n)  / 100n },
    { phase: 2, label: "Verification Phase",description: "45% held during document checks",   amount: (amount * 45n) / 100n },
    { phase: 3, label: "Final Payment",     description: "50% released on title transfer",    amount: (amount * 50n) / 100n },
  ];
}

// ── GET /escrow/me ────────────────────────────────────────────────────────────
export async function getMyEscrows(req: AuthRequest, res: Response) {
  const id = req.user!.id;
  const escrows = await prisma.escrow.findMany({
    where:   { OR: [{ buyerId: id }, { sellerId: id }] },
    include: ESCROW_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });
  return sendSuccess(res, escrows);
}

// ── GET /escrow/:id ───────────────────────────────────────────────────────────
export async function getEscrow(req: AuthRequest, res: Response) {
  const escrow = await prisma.escrow.findFirst({
    where:   { OR: [{ id: req.params.id }, { reference: req.params.id }] },
    include: ESCROW_INCLUDE,
  });
  if (!escrow) return sendNotFound(res, "Escrow not found");

  const uid = req.user!.id;
  const isAdmin = ["admin", "superadmin"].includes(req.user!.role);
  if (![escrow.buyerId, escrow.sellerId].includes(uid) && !isAdmin) return sendForbidden(res);

  return sendSuccess(res, escrow);
}

// ── POST /escrow ──────────────────────────────────────────────────────────────
export async function initiateEscrow(req: AuthRequest, res: Response) {
  const { listingId, amount } = req.body;
  const buyerId = req.user!.id;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return sendNotFound(res, "Listing not found");
  if (listing.status !== "active") throw new AppError("Listing is not available for escrow", 400);

  const bigAmount = BigInt(amount);
  let reference = genRef();
  while (await prisma.escrow.findUnique({ where: { reference } })) reference = genRef();

  const escrow = await prisma.$transaction(async (tx) => {
    const e = await tx.escrow.create({
      data: {
        reference, listingId, buyerId,
        sellerId: listing.ownerId,
        amount:   bigAmount,
        milestones: { create: milestones(bigAmount) },
        timeline:   { create: { actorId: buyerId, action: "Escrow initiated by buyer" } },
      },
      include: ESCROW_INCLUDE,
    });
    await tx.listing.update({ where: { id: listingId }, data: { status: "under_escrow" } });
    await tx.notification.create({
      data: {
        profileId: listing.ownerId,
        type: "escrow_update", title: "New Escrow Initiated",
        message: `A buyer has initiated escrow for: ${listing.title}`,
        link:    `/escrow/${e.id}`,
      },
    });
    return e;
  });

  return sendCreated(res, escrow, "Escrow initiated");
}

// ── PATCH /escrow/:id/fund ────────────────────────────────────────────────────
export async function fundEscrow(req: AuthRequest, res: Response) {
  const escrow = await prisma.escrow.findUnique({ where: { id: req.params.id }, include: { milestones: true } });
  if (!escrow) return sendNotFound(res);
  if (escrow.buyerId !== req.user!.id) return sendForbidden(res);

  const phase1 = escrow.milestones.find(m => m.phase === 1);
  await prisma.$transaction([
    prisma.escrow.update({
      where: { id: escrow.id },
      data:  { status: "commitment_paid", paymentGateway: req.body.gateway, paymentReference: req.body.paymentReference },
    }),
    ...(phase1 ? [prisma.escrowMilestone.update({ where: { id: phase1.id }, data: { status: "held", paidAt: new Date() } })] : []),
    prisma.escrowTimeline.create({ data: { escrowId: escrow.id, actorId: escrow.buyerId, action: "Commitment fee funded" } }),
    prisma.notification.create({
      data: {
        profileId: escrow.sellerId, type: "escrow_update",
        title: "Escrow Funded", message: `Commitment fee received for ${escrow.reference}`,
        link:  `/escrow/${escrow.id}`,
      },
    }),
  ]);
  return sendSuccess(res, null, "Escrow funded");
}

// ── PATCH /escrow/:id/agree ───────────────────────────────────────────────────
export async function confirmAgreement(req: AuthRequest, res: Response) {
  const escrow = await prisma.escrow.findUnique({ where: { id: req.params.id } });
  if (!escrow) return sendNotFound(res);
  if (escrow.sellerId !== req.user!.id) return sendForbidden(res);

  await prisma.$transaction([
    prisma.escrow.update({ where: { id: escrow.id }, data: { status: "verification_in_progress", currentPhase: 2 } }),
    prisma.escrowTimeline.create({ data: { escrowId: escrow.id, actorId: escrow.sellerId, action: "Seller confirmed — document vault unlocked" } }),
  ]);
  return sendSuccess(res, null, "Agreement confirmed. Document vault unlocked.");
}

// ── PATCH /escrow/:id/complete ────────────────────────────────────────────────
export async function completeEscrow(req: AuthRequest, res: Response) {
  const escrow = await prisma.escrow.findUnique({ where: { id: req.params.id }, include: { milestones: true } });
  if (!escrow) return sendNotFound(res);
  if (escrow.buyerId !== req.user!.id) return sendForbidden(res);

  await prisma.$transaction([
    prisma.escrow.update({ where: { id: escrow.id }, data: { status: "completed", completedAt: new Date() } }),
    ...escrow.milestones.map(m =>
      prisma.escrowMilestone.update({ where: { id: m.id }, data: { status: "released", releasedAt: new Date() } })
    ),
    prisma.listing.update({ where: { id: escrow.listingId }, data: { status: "sold" } }),
    prisma.escrowTimeline.create({ data: { escrowId: escrow.id, actorId: escrow.buyerId, action: "Escrow completed — funds released to seller" } }),
    prisma.notification.create({
      data: {
        profileId: escrow.sellerId, type: "escrow_update",
        title: "Funds Released", message: `Escrow ${escrow.reference} completed. Funds are being transferred.`,
        link:  `/escrow/${escrow.id}`,
      },
    }),
  ]);
  return sendSuccess(res, null, "Escrow completed. Property transferred.");
}

// ── PATCH /escrow/:id/dispute ─────────────────────────────────────────────────
export async function disputeEscrow(req: AuthRequest, res: Response) {
  const escrow = await prisma.escrow.findUnique({ where: { id: req.params.id } });
  if (!escrow) return sendNotFound(res);
  if (![escrow.buyerId, escrow.sellerId].includes(req.user!.id)) return sendForbidden(res);

  const reason = req.body.reason || "Dispute raised";
  await prisma.$transaction([
    prisma.escrow.update({ where: { id: escrow.id }, data: { status: "disputed", disputeReason: reason } }),
    prisma.escrowTimeline.create({ data: { escrowId: escrow.id, actorId: req.user!.id, action: `Dispute raised: ${reason}` } }),
  ]);
  return sendSuccess(res, null, "Dispute raised. Our team will review within 24 hours.");
}
