// ─── USER ────────────────────────────────────────────
export type UserRole = "buyer" | "seller" | "admin" | "surveyor" | "lawyer";

export interface User {
  id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  isVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  avatar?: string;
  professionalDetails?: ProfessionalDetails;
}

export interface ProfessionalDetails {
  licenseNumber: string;
  specialization: string;
  yearsOfExperience: number;
  rating: number;
  completedJobs: number;
  verifiedAt: string;
}

// ─── PROPERTY ────────────────────────────────────────
export type ListingType = "sale" | "lease" | "rent";
export type ListingTier = "free" | "verified" | "premium";
export type PropertyStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "under_escrow"
  | "sold"
  | "rejected";

export type SoilType = "dry" | "swampy" | "sandy" | "clay" | "loamy" | "rocky";
export type Topography = "flat" | "gentle_slope" | "steep_slope" | "valley" | "highland";
export type ZoningType =
  | "residential"
  | "commercial"
  | "industrial"
  | "agricultural"
  | "mixed_use"
  | "government_reserved";
export type PowerGridProximity = "on_grid" | "near_grid" | "off_grid";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LandBoundary {
  type: "Polygon";
  coordinates: number[][][]; // GeoJSON polygon
}

export interface PropertyMetadata {
  soilType: SoilType;
  topography: Topography;
  zoning: ZoningType;
  powerGrid: PowerGridProximity;
  waterSupply: boolean;
  roadAccess: boolean;
  floodRisk: "none" | "low" | "medium" | "high";
  nearbyLandmarks?: string[];
  distanceToHighway?: number; // km
  distanceToSchool?: number;  // km
  distanceToMarket?: number;  // km
}

export type PriceType = "fixed" | "range";

export interface PriceInfo {
  type: PriceType;
  amount?: number;       // for fixed
  minAmount?: number;    // for range
  maxAmount?: number;    // for range
  currency: "NGN" | "USD";
  negotiable: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: "c_of_o" | "governors_consent" | "deed_of_assignment" | "survey_plan" | "other";
  url: string;
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  listingType: ListingType;
  tier: ListingTier;
  status: PropertyStatus;
  sellerId: string;
  seller?: User;

  // Location
  address: string;
  state: string;
  lga: string;
  coordinates: Coordinates;
  boundary?: LandBoundary;

  // Size
  sizeInSqm: number;
  sizeInPlot?: number;    // 1 plot ≈ 648sqm in Nigeria
  sizeInHectare?: number;

  // Pricing — NO "price on call"
  price: PriceInfo;

  // Metadata
  metadata: PropertyMetadata;

  // Documents
  documents: Document[];

  // Media
  images: string[];
  videoUrl?: string;

  // Stats
  views: number;
  saves: number;
  createdAt: string;
  updatedAt: string;

  // Review
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ─── ESCROW / TRANSACTION ────────────────────────────
export type EscrowPhase = 1 | 2 | 3;
export type EscrowStatus =
  | "initiated"
  | "commitment_paid"
  | "verification_in_progress"
  | "verification_complete"
  | "final_payment_pending"
  | "completed"
  | "disputed"
  | "refunded";

export interface EscrowMilestone {
  phase: EscrowPhase;
  label: string;
  description: string;
  amount: number;
  status: "pending" | "held" | "released" | "refunded";
  paidAt?: string;
  releasedAt?: string;
  transactionRef?: string;
}

export interface EscrowTransaction {
  id: string;
  propertyId: string;
  property?: Property;
  buyerId: string;
  buyer?: User;
  sellerId: string;
  seller?: User;
  status: EscrowStatus;
  currentPhase: EscrowPhase;
  milestones: EscrowMilestone[];
  totalAmount: number;
  currency: "NGN" | "USD";
  paymentGateway: "flutterwave" | "paystack";
  createdAt: string;
  updatedAt: string;
  serviceProviders?: ServiceAssignment[];
}

// ─── SERVICE PROVIDERS ───────────────────────────────
export type ServiceType = "surveyor" | "lawyer";
export type ServiceStatus =
  | "requested"
  | "assigned"
  | "in_progress"
  | "report_submitted"
  | "completed"
  | "cancelled";

export interface ServiceRequest {
  id: string;
  type: ServiceType;
  transactionId: string;
  buyerId: string;
  providerId?: string;
  provider?: User;
  status: ServiceStatus;
  fee: number;
  notes?: string;
  reportUrl?: string;
  requestedAt: string;
  completedAt?: string;
}

export interface ServiceAssignment {
  serviceRequestId: string;
  providerId: string;
  provider?: User;
  type: ServiceType;
}

// ─── AREA REPORT ─────────────────────────────────────
export type AreaRiskType =
  | "land_grabbers"
  | "government_acquisition"
  | "flood_prone"
  | "disputed_title"
  | "boundary_dispute"
  | "other";

export interface AreaReport {
  id: string;
  reporterId: string;
  reporter?: User;
  coordinates: Coordinates;
  state: string;
  lga: string;
  riskType: AreaRiskType;
  description: string;
  evidence?: string[];
  upvotes: number;
  isVerified: boolean;
  verifiedBy?: string;
  createdAt: string;
}

// ─── FILTER / SEARCH ─────────────────────────────────
export interface PropertyFilter {
  listingType?: ListingType;
  state?: string;
  lga?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  tier?: ListingTier;
  soilType?: SoilType;
  zoning?: ZoningType;
  powerGrid?: PowerGridProximity;
  sortBy?: "price_asc" | "price_desc" | "newest" | "oldest" | "views";
  page?: number;
  limit?: number;
}

// ─── API RESPONSE ─────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

// src/types/index.ts

// ... your existing types/interfaces ...

// Category metadata
export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  apartment: { label: "Apartment", icon: "🏢" },
  house: { label: "House", icon: "🏠" },
  land: { label: "Land", icon: "🌍" },
  commercial: { label: "Commercial", icon: "🏬" },
  shortlet: { label: "Short Let", icon: "🏨" },
};

// Listing type metadata
export const LISTING_TYPE_META: Record<string, { label: string; color: string }> = {
  sale: { label: "For Sale", color: "green" },
  rent: { label: "For Rent", color: "blue" },
  shortlet: { label: "Short Let", color: "purple" },
};

// Nigerian states
export const NIGERIAN_STATES: string[] = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];