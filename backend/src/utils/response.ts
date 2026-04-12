import { Response } from "express";

const ser = (v: unknown) =>
  JSON.parse(JSON.stringify(v, (_, val) =>
    typeof val === "bigint" ? val.toString() : val));

export const sendSuccess  = (res: Response, data: unknown, message = "Success") =>
  res.status(200).json({ success: true, message, data: ser(data) });

export const sendCreated  = (res: Response, data: unknown, message = "Created") =>
  res.status(201).json({ success: true, message, data: ser(data) });

export const sendNotFound = (res: Response, message = "Not found") =>
  res.status(404).json({ success: false, message });

export const sendForbidden = (res: Response, message = "Forbidden") =>
  res.status(403).json({ success: false, message });

export const sendUnauthorized = (res: Response, message = "Unauthorized") =>
  res.status(401).json({ success: false, message });

export const sendBadRequest = (res: Response, message = "Bad request") =>
  res.status(400).json({ success: false, message });

export const buildPagination = (page: number, limit: number, total: number) => ({
  page, limit, total,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});
