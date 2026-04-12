import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../prisma/client";
import { uploadFile, deleteFile, getSignedUrl } from "../services/storage.service";
import { config } from "../config";
import { sendSuccess, sendCreated, sendNotFound, sendForbidden } from "../utils/response";

// ── POST /uploads/images/:listingId ──────────────────────────────────────────
// Accepts multiple images (field name: "images"), uploads to Supabase Storage
export async function uploadImages(req: AuthRequest, res: Response) {
  const { listingId } = req.params;
  const files = req.files as Express.Multer.File[];
  if (!files?.length) return res.status(400).json({ success: false, message: "No files uploaded" });

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return sendNotFound(res, "Listing not found");
  if (listing.ownerId !== req.user!.id && req.user!.role !== "admin") return sendForbidden(res);

  const existingCount = await prisma.listingImage.count({ where: { listingId } });

  const created = await Promise.all(
    files.map(async (file, i) => {
      const ext  = file.originalname.split(".").pop();
      const path = `listings/${listingId}/${Date.now()}-${i}.${ext}`;
      const url  = await uploadFile(config.buckets.images, path, file.buffer, file.mimetype);

      return prisma.listingImage.create({
        data: {
          listingId,
          url,
          storagePath: path,
          isPrimary:   existingCount === 0 && i === 0,
        },
      });
    })
  );

  return sendCreated(res, created, "Images uploaded");
}

// ── POST /uploads/documents/:listingId ───────────────────────────────────────
export async function uploadDocument(req: AuthRequest, res: Response) {
  const { listingId } = req.params;
  const file = req.file as Express.Multer.File;
  if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

  const { type, name } = req.body;
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return sendNotFound(res, "Listing not found");
  if (listing.ownerId !== req.user!.id && req.user!.role !== "admin") return sendForbidden(res);

  const ext  = file.originalname.split(".").pop();
  const path = `listings/${listingId}/docs/${Date.now()}-${type}.${ext}`;
  const url  = await uploadFile(config.buckets.documents, path, file.buffer, file.mimetype);

  const doc = await prisma.listingDocument.create({
    data: {
      listingId,
      docType:     type || "other",
      name:        name || file.originalname,
      url,
      storagePath: path,
      fileSize:    file.size,
    },
  });
  return sendCreated(res, doc, "Document uploaded");
}

// ── DELETE /uploads/images/:imageId ──────────────────────────────────────────
export async function deleteImage(req: AuthRequest, res: Response) {
  const image = await prisma.listingImage.findUnique({ where: { id: req.params.imageId } });
  if (!image) return sendNotFound(res, "Image not found");

  const listing = await prisma.listing.findUnique({ where: { id: image.listingId } });
  if (listing?.ownerId !== req.user!.id && req.user!.role !== "admin") return sendForbidden(res);

  await deleteFile(config.buckets.images, image.storagePath);
  await prisma.listingImage.delete({ where: { id: image.id } });

  return sendSuccess(res, null, "Image deleted");
}

// ── GET /uploads/presigned/:docId ────────────────────────────────────────────
// Returns a 1-hour signed URL for a private document
export async function getPresignedUrl(req: AuthRequest, res: Response) {
  const doc = await prisma.listingDocument.findUnique({ where: { id: req.params.docId } });
  if (!doc) return sendNotFound(res, "Document not found");

  const url = await getSignedUrl(doc.storagePath);
  return sendSuccess(res, { url });
}
