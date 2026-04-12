// ─────────────────────────────────────────────────────────────────────────────
// Seed script — creates Supabase Auth users + Prisma Profiles
// Run: npm run db:seed
// ─────────────────────────────────────────────────────────────────────────────
import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const prisma = new PrismaClient();

async function createUser(
  email: string,
  password: string,
  profile: { firstName: string; lastName: string; role: string; phone?: string; state?: string; lga?: string; bio?: string; rating?: number; reviewCount?: number; trustScore?: number }
) {
  // Delete existing if re-seeding
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existing.users.find(u => u.email === email);
  if (existingUser) {
    await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    await prisma.profile.deleteMany({ where: { id: existingUser.id } });
  }

  // Create Supabase Auth user (email_confirm: true skips email verification for seed)
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { firstName: profile.firstName, lastName: profile.lastName },
  });
  if (error) throw new Error(`Auth create failed for ${email}: ${error.message}`);

  const uid = data.user.id;

  // Create Prisma Profile with same UUID
  await prisma.profile.create({
    data: {
      id:         uid,
      firstName:  profile.firstName,
      lastName:   profile.lastName,
      email,
      phone:      profile.phone || "",
      role:       profile.role as any,
      kycStatus:  "verified",
      state:      profile.state,
      lga:        profile.lga,
      bio:        profile.bio,
      rating:     profile.rating     ?? 0,
      reviewCount:profile.reviewCount ?? 0,
      trustScore: profile.trustScore  ?? 0,
      verifications: {
        create: {
          emailVerified: true, phoneVerified: true, ninVerified: true, bankAccountVerified: true,
        },
      },
    },
  });

  return uid;
}

async function main() {
  console.log("🌱 Seeding Supabase + Prisma...\n");

  // Clear existing data
  await prisma.$transaction([
    prisma.serviceRequest.deleteMany(),
    prisma.areaReportUpvote.deleteMany(),
    prisma.areaReport.deleteMany(),
    prisma.savedSearch.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.review.deleteMany(),
    prisma.escrowServiceProvider.deleteMany(),
    prisma.escrowTimeline.deleteMany(),
    prisma.escrowDocument.deleteMany(),
    prisma.escrowMilestone.deleteMany(),
    prisma.escrow.deleteMany(),
    prisma.savedListing.deleteMany(),
    prisma.listingDocument.deleteMany(),
    prisma.listingImage.deleteMany(),
    prisma.listing.deleteMany(),
  ]);
  console.log("  ✓ Cleared existing data");

  const adminId  = await createUser("admin@sheltershorizon.com",  "Admin1234!", { firstName: "Admin",  lastName: "Shelters", role: "admin",  trustScore: 100 });
  const sellerId = await createUser("seller@test.com", "Test1234!", { firstName: "Emeka",  lastName: "Okonkwo",  role: "seller", state: "Lagos", lga: "Lekki", bio: "Premium property developer with 15+ years Lagos experience.", rating: 4.8, reviewCount: 47, trustScore: 92 });
  const buyerId  = await createUser("buyer@test.com",  "Test1234!", { firstName: "Ngozi",  lastName: "Adeyemi",  role: "buyer",  trustScore: 30 });
  console.log("  ✓ Users created\n");

  // Listings
  const listings = [
    {
      title: "Luxury 4-Bedroom Duplex in Lekki Phase 1", slug: "luxury-4br-duplex-lekki-phase-1",
      description: "Stunning contemporary duplex in Lekki Phase 1 with pool, BQ, and 24hr security.",
      category: "house", listingType: "sale", status: "active", tier: "premium",
      address: "15 Admiralty Way", neighbourhood: "Lekki Phase 1", lga: "Eti-Osa", state: "Lagos",
      price: 280_000_000n, bedrooms: 4, bathrooms: 5, floorArea: 420.0, yearBuilt: 2021, condition: "new_build",
      hasSecurity: true, hasCctv: true, hasPool: true, hasBq: true, hasGarden: true, hasInternet: true,
      titleDocument: "Certificate of Occupancy", views: 412, saves: 38, publishedAt: new Date(),
      imageUrl: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800",
    },
    {
      title: "3-Bedroom Apartment for Rent — Victoria Island", slug: "3br-apartment-victoria-island-rent",
      description: "Modern serviced apartment on Victoria Island, perfect for professionals.",
      category: "apartment", listingType: "rent", status: "active", tier: "verified",
      address: "7 Adeola Odeku Street", neighbourhood: "Victoria Island", lga: "Eti-Osa", state: "Lagos",
      price: 8_500_000n, rentFrequency: "per_year", bedrooms: 3, bathrooms: 3, floorArea: 185.0, condition: "renovated",
      hasSecurity: true, hasCctv: true, hasElevator: true, hasGym: true, hasInternet: true,
      views: 234, saves: 21, publishedAt: new Date(),
      imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    },
    {
      title: "1,000 sqm Residential Land — Ibeju-Lekki", slug: "1000sqm-land-ibeju-lekki",
      description: "Prime land on major road near Dangote Refinery. Excision obtained.",
      category: "land", listingType: "sale", status: "active", tier: "free",
      address: "Coastal Road, Eleko", neighbourhood: "Eleko", lga: "Ibeju-Lekki", state: "Lagos",
      price: 45_000_000n, landSize: 1000.0, titleDocument: "Survey Plan + Excision",
      views: 187, saves: 14, publishedAt: new Date(),
      imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
    },
    {
      title: "5-Bedroom Mansion in Asokoro — Abuja", slug: "5br-mansion-asokoro-abuja",
      description: "Grand 5-bedroom mansion in Asokoro, Abuja's most prestigious address.",
      category: "house", listingType: "sale", status: "active", tier: "premium",
      address: "Plot 35 Parakou Crescent", neighbourhood: "Asokoro", lga: "Abuja Municipal", state: "FCT (Abuja)",
      price: 650_000_000n, bedrooms: 5, bathrooms: 6, floorArea: 750.0, yearBuilt: 2020, condition: "new_build",
      hasSecurity: true, hasCctv: true, hasPool: true, hasGym: true, hasBq: true, hasGarden: true,
      titleDocument: "Certificate of Occupancy", views: 301, saves: 43, publishedAt: new Date(),
      imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    },
  ];

  for (const { imageUrl, ...data } of listings) {
    await prisma.listing.create({
      data: {
        ownerId: sellerId,
        ...(data as any),
        images: { create: { url: imageUrl, storagePath: `seed/${data.slug}.jpg`, isPrimary: true } },
      },
    });
  }
  console.log(`  ✓ ${listings.length} listings created\n`);

  // Area reports
  await prisma.areaReport.createMany({
    data: [
      { reporterId: sellerId, riskType: "land_grabbers", title: "Omo-onile Activity — Ajah", description: "Aggressive land grabbers near Ajah waterfront demanding payments from legitimate owners.", state: "Lagos", lga: "Eti-Osa", neighbourhood: "Ajah", upvotes: 47, isVerified: true },
      { riskType: "flood_prone", title: "Annual Flooding — Ikorodu Road", description: "Properties flood heavily June–September. Ground floors submerged 2–3 weeks.", state: "Lagos", lga: "Kosofe", neighbourhood: "Ikorodu Road", upvotes: 31, isVerified: true, isAnonymous: true },
      { reporterId: sellerId, riskType: "government_acquisition", title: "FCDA Planned Acquisition — Maitama Extension", description: "Upcoming compulsory acquisition for road expansion. Verify before purchasing.", state: "FCT (Abuja)", lga: "Abuja Municipal", neighbourhood: "Maitama Extension", upvotes: 28 },
    ],
  });
  console.log("  ✓ Area reports created\n");

  console.log(`
✅  Seed complete!

  ┌────────────┬─────────────────────────────────┬────────────┐
  │ Role       │ Email                           │ Password   │
  ├────────────┼─────────────────────────────────┼────────────┤
  │ Admin      │ admin@sheltershorizon.com        │ Admin1234! │
  │ Seller     │ seller@test.com                 │ Test1234!  │
  │ Buyer      │ buyer@test.com                  │ Test1234!  │
  └────────────┴─────────────────────────────────┴────────────┘

  Run: npm run dev
  `);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
