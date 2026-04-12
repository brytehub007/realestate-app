import { Request, Response } from "express";
import slugify from "slugify";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendCreated, sendNotFound, sendForbidden, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";

const OWNER_SELECT = {
  id: true, firstName: true, lastName: true, avatarUrl: true,
  rating: true, reviewCount: true, trustScore: true,
  verifications: { select: { emailVerified: true, phoneVerified: true, ninVerified: true } },
};

// ── GET /listings ─────────────────────────────────────────────────────────────
export async function getListings(req: Request, res: Response) {
  const {
    category, listingType, state, lga, neighbourhood,
    minPrice, maxPrice, bedrooms, bathrooms,
    tier, status = "active", sortBy = "newest",
    page = "1", limit = "20", q,
  } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const where: Prisma.ListingWhereInput = {
    status: (status as any),
    ...(category    && { category:    (category    as any) }),
    ...(listingType && { listingType: (listingType as any) }),
    ...(tier        && { tier:        (tier        as any) }),
    ...(state       && { state:       { equals: state, mode: "insensitive" } }),
    ...(lga         && { lga:         { equals: lga,   mode: "insensitive" } }),
    ...(neighbourhood && { neighbourhood: { contains: neighbourhood, mode: "insensitive" } }),
    ...(bedrooms    && { bedrooms:  { gte: parseInt(bedrooms,  10) } }),
    ...(bathrooms   && { bathrooms: { gte: parseInt(bathrooms, 10) } }),
    ...((minPrice || maxPrice) ? {
      price: {
        ...(minPrice && { gte: BigInt(minPrice) }),
        ...(maxPrice && { lte: BigInt(maxPrice) }),
      },
    } : {}),
    ...(q && {
      OR: [
        { title:         { contains: q, mode: "insensitive" } },
        { description:   { contains: q, mode: "insensitive" } },
        { neighbourhood: { contains: q, mode: "insensitive" } },
        { lga:           { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    sortBy === "price_asc"  ? { price: "asc"  } :
    sortBy === "price_desc" ? { price: "desc" } :
    sortBy === "oldest"     ? { createdAt: "asc"  } :
    sortBy === "views"      ? { views: "desc" } :
    { createdAt: "desc" };

  const [data, total] = await prisma.$transaction([
    prisma.listing.findMany({
      where, orderBy,
      skip:  (pageNum - 1) * limitNum,
      take:  limitNum,
      include: {
        owner:  { select: OWNER_SELECT },
        images: { where: { isPrimary: true }, take: 1 },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return sendSuccess(res, {
    data,
    pagination: buildPagination(pageNum, limitNum, total),
  });
}

// ── GET /listings/saved ───────────────────────────────────────────────────────
export async function getSavedListings(req: AuthRequest, res: Response) {
  const saved = await prisma.savedListing.findMany({
    where:   { profileId: req.user!.id },
    include: {
      listing: {
        include: {
          owner:  { select: OWNER_SELECT },
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return sendSuccess(res, saved.map(s => s.listing));
}

// ── GET /listings/user/:userId ────────────────────────────────────────────────
export async function getUserListings(req: Request, res: Response) {
  const listings = await prisma.listing.findMany({
    where:   { ownerId: req.params.userId, status: { not: "draft" } },
    orderBy: { createdAt: "desc" },
    include: { images: { where: { isPrimary: true }, take: 1 } },
  });
  return sendSuccess(res, listings);
}

// ── GET /listings/:slug ───────────────────────────────────────────────────────
export async function getListing(req: Request, res: Response) {
  const listing = await prisma.listing.findFirst({
    where:   { OR: [{ slug: req.params.slug }, { id: req.params.slug }] },
    include: {
      owner:     { select: { ...OWNER_SELECT, bio: true, state: true } },
      images:    true,
      documents: true,
    },
  });
  if (!listing) return sendNotFound(res, "Listing not found");
  prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } }).catch(() => null);
  return sendSuccess(res, listing);
}

// ── POST /listings ────────────────────────────────────────────────────────────
export async function createListing(req: AuthRequest, res: Response) {
  const { title, price, minPrice, maxPrice, ...rest } = req.body;
  let slug = slugify(title || "property", { lower: true, strict: true });
  if (await prisma.listing.findUnique({ where: { slug } })) slug = `${slug}-${Date.now()}`;

  const listing = await prisma.listing.create({
    data: {
      ownerId: req.user!.id,
      title, slug,
      status:   "draft",
      ...rest,
      ...(price    != null && { price:    BigInt(price) }),
      ...(minPrice != null && { minPrice: BigInt(minPrice) }),
      ...(maxPrice != null && { maxPrice: BigInt(maxPrice) }),
    },
  });
  return sendCreated(res, listing, "Listing created");
}

// ── PATCH /listings/:id ───────────────────────────────────────────────────────
export async function updateListing(req: AuthRequest, res: Response) {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
  if (!listing) return sendNotFound(res);
  if (listing.ownerId !== req.user!.id && req.user!.role !== "admin") return sendForbidden(res);

  const { status: _s, ownerId: _o, price, minPrice, maxPrice, ...rest } = req.body;
  const updated = await prisma.listing.update({
    where: { id: req.params.id },
    data:  {
      ...rest,
      ...(price    != null && { price:    BigInt(price) }),
      ...(minPrice != null && { minPrice: BigInt(minPrice) }),
      ...(maxPrice != null && { maxPrice: BigInt(maxPrice) }),
    },
  });
  return sendSuccess(res, updated, "Listing updated");
}

// ── POST /listings/:id/publish ────────────────────────────────────────────────
export async function publishListing(req: AuthRequest, res: Response) {
  const listing = await prisma.listing.findUnique({
    where:   { id: req.params.id },
    include: { images: { take: 1 } },
  });
  if (!listing) return sendNotFound(res);
  if (listing.ownerId !== req.user!.id) return sendForbidden(res);
  if (!listing.images.length) throw new AppError("Add at least one image before publishing", 400);

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data:  { status: "pending_review", publishedAt: new Date() },
  });
  return sendSuccess(res, updated, "Submitted for review");
}

// ── POST /listings/:id/save ───────────────────────────────────────────────────
export async function toggleSave(req: AuthRequest, res: Response) {
  const profileId = req.user!.id;
  const listingId = req.params.id;

  const existing = await prisma.savedListing.findUnique({
    where: { profileId_listingId: { profileId, listingId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.savedListing.delete({ where: { id: existing.id } }),
      prisma.listing.update({ where: { id: listingId }, data: { saves: { decrement: 1 } } }),
    ]);
    return sendSuccess(res, { saved: false }, "Listing unsaved");
  }

  await prisma.$transaction([
    prisma.savedListing.create({ data: { profileId, listingId } }),
    prisma.listing.update({ where: { id: listingId }, data: { saves: { increment: 1 } } }),
  ]);
  return sendSuccess(res, { saved: true }, "Listing saved");
}

// ── DELETE /listings/:id ──────────────────────────────────────────────────────
export async function deleteListing(req: AuthRequest, res: Response) {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
  if (!listing) return sendNotFound(res);
  if (listing.ownerId !== req.user!.id && req.user!.role !== "admin") return sendForbidden(res);
  await prisma.listing.delete({ where: { id: listing.id } });
  return sendSuccess(res, null, "Listing deleted");
}
