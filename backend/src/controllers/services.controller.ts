import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { AuthRequest } from "../middleware/auth";
import { sendSuccess, sendCreated, sendNotFound } from "../utils/response";

// Static provider list — move to DB later if needed
const PROVIDERS = [
  { id: "pr-001", type: "surveyor",  name: "Chukwudi Eze",    company: "Eze Geospatial Services",    location: "Abuja (FCT)",     state: "FCT",   rating: 4.9, reviews: 87,  completedJobs: 112, priceFrom: 180000, priceTo: 420000, verified: true, featured: true,  available: true,  certifications: ["SURCON"], specialties: ["Land Survey","Topographic"],  bio: "Senior licensed surveyor with 18+ years in FCT.", avatar: "CE", avatarColor: "#1a6b3c" },
  { id: "pr-002", type: "lawyer",    name: "Ngozi Adeyemi",   company: "Adeyemi & Partners Legal",   location: "Lagos Island",    state: "Lagos", rating: 4.8, reviews: 132, completedJobs: 204, priceFrom: 150000, priceTo: 800000, verified: true, featured: true,  available: true,  certifications: ["NBA","SAN"], specialties: ["Property Law","C of O"],     bio: "Property law specialist with 20+ years in Lagos.", avatar: "NA", avatarColor: "#7c3aed" },
  { id: "pr-003", type: "valuer",    name: "Emeka Nwosu",     company: "PropertyWorth Nigeria",      location: "Lagos Mainland",  state: "Lagos", rating: 4.7, reviews: 58,  completedJobs: 89,  priceFrom: 120000, priceTo: 350000, verified: true, featured: false, available: true,  certifications: ["NIESV"], specialties: ["Residential","Commercial"],   bio: "Certified property valuer across Lagos and Abuja.", avatar: "EN", avatarColor: "#0369a1" },
  { id: "pr-004", type: "inspector", name: "Tunde Olatunji",  company: "SafeBuild Inspections Ltd",  location: "Lagos State",     state: "Lagos", rating: 4.6, reviews: 44,  completedJobs: 67,  priceFrom: 95000,  priceTo: 280000, verified: true, featured: false, available: false, certifications: ["COREN"], specialties: ["Structural","Electrical"],    bio: "Building inspector specialising in pre-purchase checks.", avatar: "TO", avatarColor: "#b45309" },
  { id: "pr-005", type: "surveyor",  name: "Amaka Okonkwo",   company: "Amaka Surveys Ltd",          location: "Enugu / Anambra", state: "Enugu", rating: 4.8, reviews: 61,  completedJobs: 94,  priceFrom: 160000, priceTo: 380000, verified: true, featured: true,  available: true,  certifications: ["SURCON"], specialties: ["Boundary","Cadastral"],       bio: "Leading surveyor in South-East Nigeria.", avatar: "AO", avatarColor: "#be185d" },
  { id: "pr-006", type: "agent",     name: "Biodun Fashola",  company: "Fashola Real Estate Group",  location: "Lekki, Lagos",    state: "Lagos", rating: 4.5, reviews: 209, completedJobs: 318, priceFrom: 0,      priceTo: 0,      verified: true, featured: true,  available: true,  certifications: ["NIESV","REDAN"], specialties: ["Luxury","Off-Plan"],    bio: "Top real estate agent with 300+ successful deals.", avatar: "BF", avatarColor: "#0f766e" },
  { id: "pr-007", type: "architect", name: "Akinwale Bello",  company: "Bello Design Studio",        location: "Abuja (FCT)",     state: "FCT",   rating: 4.9, reviews: 33,  completedJobs: 52,  priceFrom: 250000, priceTo: 1200000, verified: true, featured: false, available: true, certifications: ["ARCON"], specialties: ["Residential Design","Renovation"], bio: "Award-winning architect specialising in sustainable homes.", avatar: "AB", avatarColor: "#6d28d9" },
  { id: "pr-008", type: "lawyer",    name: "Kunle Adebayo",   company: "Adebayo & Co. Solicitors",   location: "Ibadan / Lagos",  state: "Oyo",   rating: 4.6, reviews: 79,  completedJobs: 143, priceFrom: 120000, priceTo: 600000, verified: true, featured: false, available: true,  certifications: ["NBA"], specialties: ["Dispute Resolution","Conveyancing"], bio: "Expert in property dispute resolution.", avatar: "KA", avatarColor: "#c2410c" },
];

// ── GET /services/providers ───────────────────────────────────────────────────
export async function getServiceProviders(req: Request, res: Response) {
  const { type } = req.query as Record<string, string>;
  const providers = type && type !== "all" ? PROVIDERS.filter(p => p.type === type) : PROVIDERS;
  return sendSuccess(res, providers);
}

// ── POST /services/requests ───────────────────────────────────────────────────
export async function createServiceRequest(req: AuthRequest, res: Response) {
  const { providerId, type, description, location, budget, escrowTxId } = req.body;
  const provider = PROVIDERS.find(p => p.id === providerId);
  if (!provider) return sendNotFound(res, "Provider not found");

  const request = await prisma.serviceRequest.create({
    data: {
      profileId:   req.user!.id,
      providerId,
      providerType: provider.type,
      description,
      location,
      budget:      budget ? BigInt(budget) : undefined,
      escrowTxId,
    },
  });

  return sendCreated(res, {
    ...request,
    budget:   request.budget?.toString(),
    provider: { name: provider.name, company: provider.company },
  }, "Service request submitted");
}

// ── GET /services/requests/mine ───────────────────────────────────────────────
export async function getMyServiceRequests(req: AuthRequest, res: Response) {
  const requests = await prisma.serviceRequest.findMany({
    where:   { profileId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  const annotated = requests.map(r => ({
    ...r,
    budget:   r.budget?.toString(),
    provider: PROVIDERS.find(p => p.id === r.providerId) ?? null,
  }));
  return sendSuccess(res, annotated);
}
