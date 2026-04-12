import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendCreated, sendNotFound } from "../utils/response";

// ── GET /area-reports ─────────────────────────────────────────────────────────
export async function getAreaReports(req: Request, res: Response) {
  const { state, lga, riskType } = req.query as Record<string, string>;
  const reports = await prisma.areaReport.findMany({
    where: {
      ...(state    && { state:    { equals: state, mode: "insensitive" } }),
      ...(lga      && { lga:     { equals: lga,   mode: "insensitive" } }),
      ...(riskType && { riskType: (riskType as any) }),
    },
    include: { reporter: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
  });
  return sendSuccess(res, reports.map(r => ({ ...r, reporter: r.isAnonymous ? null : r.reporter })));
}

// ── GET /area-reports/:state/:lga ─────────────────────────────────────────────
export async function getAreaReport(req: Request, res: Response) {
  const { state, lga } = req.params;
  const reports = await prisma.areaReport.findMany({
    where: {
      state: { equals: state, mode: "insensitive" },
      lga:   { equals: lga,   mode: "insensitive" },
    },
    include: { reporter: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { upvotes: "desc" },
  });
  return sendSuccess(res, reports.map(r => ({ ...r, reporter: r.isAnonymous ? null : r.reporter })));
}

// ── POST /area-reports ────────────────────────────────────────────────────────
export async function createAreaReport(req: AuthRequest, res: Response) {
  const { riskType, title, description, state, lga, neighbourhood, anonymous } = req.body;
  const report = await prisma.areaReport.create({
    data: {
      reporterId: anonymous ? null : req.user!.id,
      riskType, title, description, state, lga, neighbourhood,
      isAnonymous: !!anonymous,
    },
  });
  return sendCreated(res, report, "Report submitted. Thank you for keeping the community informed.");
}

// ── POST /area-reports/:id/upvote ─────────────────────────────────────────────
export async function upvoteReport(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const profileId = req.user!.id;

  const existing = await prisma.areaReportUpvote.findUnique({
    where: { reportId_profileId: { reportId: id, profileId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.areaReportUpvote.delete({ where: { id: existing.id } }),
      prisma.areaReport.update({ where: { id }, data: { upvotes: { decrement: 1 } } }),
    ]);
    return sendSuccess(res, { voted: false });
  }

  await prisma.$transaction([
    prisma.areaReportUpvote.create({ data: { reportId: id, profileId } }),
    prisma.areaReport.update({ where: { id }, data: { upvotes: { increment: 1 } } }),
  ]);
  return sendSuccess(res, { voted: true });
}
