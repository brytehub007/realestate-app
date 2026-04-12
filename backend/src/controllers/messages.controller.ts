import { Response } from "express";
import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendCreated, sendNotFound, sendForbidden, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";

const PARTICIPANT_INCLUDE = {
  include: {
    profile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
  },
};

// ── GET /conversations ────────────────────────────────────────────────────────
export async function getConversations(req: AuthRequest, res: Response) {
  const profileId = req.user!.id;
  const convs = await prisma.conversation.findMany({
    where:   { participants: { some: { profileId } } },
    include: {
      participants: PARTICIPANT_INCLUDE,
      messages:     { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = convs.map(c => ({
    ...c,
    participants: c.participants.filter(p => p.profileId !== profileId).map(p => p.profile),
    unread:       c.participants.find(p => p.profileId === profileId)?.unreadCount ?? 0,
  }));

  return sendSuccess(res, result);
}

// ── POST /conversations ───────────────────────────────────────────────────────
export async function startConversation(req: AuthRequest, res: Response) {
  const { recipientId, listingId, firstMessage } = req.body;
  const senderId = req.user!.id;
  if (recipientId === senderId) throw new AppError("Cannot message yourself", 400);

  // Check for existing conversation between these two for this listing
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { profileId: senderId } } },
        { participants: { some: { profileId: recipientId } } },
        ...(listingId ? [{ listingId }] : []),
      ],
    },
    include: { participants: PARTICIPANT_INCLUDE, messages: { take: 1 } },
  });

  let conversation = existing;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        listingId,
        participants: { create: [{ profileId: senderId }, { profileId: recipientId }] },
      },
      include: { participants: PARTICIPANT_INCLUDE, messages: { take: 1 } },
    });
  }

  if (firstMessage) {
    await prisma.$transaction([
      prisma.message.create({ data: { conversationId: conversation.id, senderId, content: firstMessage } }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data:  { lastMessage: firstMessage, lastMessageAt: new Date() },
      }),
      prisma.conversationParticipant.updateMany({
        where: { conversationId: conversation.id, profileId: { not: senderId } },
        data:  { unreadCount: { increment: 1 } },
      }),
    ]);
  }

  return sendCreated(res, conversation);
}

// ── GET /conversations/:id/messages ──────────────────────────────────────────
export async function getMessages(req: AuthRequest, res: Response) {
  const profileId = req.user!.id;
  const conv = await prisma.conversation.findUnique({
    where: { id: req.params.id }, include: { participants: true },
  });
  if (!conv) return sendNotFound(res, "Conversation not found");
  if (!conv.participants.some(p => p.profileId === profileId)) return sendForbidden(res);

  const page  = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(50, parseInt((req.query.limit as string) || "30", 10));

  const [messages, total] = await prisma.$transaction([
    prisma.message.findMany({
      where:   { conversationId: req.params.id },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.message.count({ where: { conversationId: req.params.id } }),
  ]);

  // Mark as read
  await prisma.$transaction([
    prisma.conversationParticipant.updateMany({
      where: { conversationId: req.params.id, profileId },
      data:  { unreadCount: 0 },
    }),
    prisma.message.updateMany({
      where: { conversationId: req.params.id, senderId: { not: profileId }, status: { not: "read" } },
      data:  { status: "read" },
    }),
  ]);

  return sendSuccess(res, { data: messages.reverse(), pagination: buildPagination(page, limit, total) });
}

// ── POST /conversations/:id/messages ──────────────────────────────────────────
export async function sendMessage(req: AuthRequest, res: Response) {
  const profileId = req.user!.id;
  const conv = await prisma.conversation.findUnique({
    where: { id: req.params.id }, include: { participants: true },
  });
  if (!conv) return sendNotFound(res, "Conversation not found");
  if (!conv.participants.some(p => p.profileId === profileId)) return sendForbidden(res);
  if (conv.status === "closed") throw new AppError("Conversation is closed", 400);

  const { text, isOffer, offerAmount } = req.body;

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: req.params.id,
        senderId:       profileId,
        content:        text,
        isOffer:        !!isOffer,
        offerAmount:    offerAmount ? BigInt(offerAmount) : undefined,
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    }),
    prisma.conversation.update({
      where: { id: req.params.id },
      data:  { lastMessage: text, lastMessageAt: new Date(), ...(isOffer ? { status: "offer_pending" } : {}) },
    }),
    prisma.conversationParticipant.updateMany({
      where: { conversationId: req.params.id, profileId: { not: profileId } },
      data:  { unreadCount: { increment: 1 } },
    }),
  ]);

  return sendCreated(res, message);
}

// ── PATCH /conversations/:id/status ──────────────────────────────────────────
export async function updateConversationStatus(req: AuthRequest, res: Response) {
  const conv = await prisma.conversation.findUnique({
    where: { id: req.params.id }, include: { participants: true },
  });
  if (!conv) return sendNotFound(res);
  if (!conv.participants.some(p => p.profileId === req.user!.id)) return sendForbidden(res);

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data:  { status: req.body.status },
  });
  return sendSuccess(res, updated);
}
