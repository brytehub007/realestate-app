# Shelters' Horizon — API

**Stack:** Node.js · Express · Prisma ORM · Supabase (PostgreSQL + Auth + Storage) · Socket.io

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Generate Prisma client
npm run db:generate

# 4. Push schema to Supabase (creates all tables)
npm run db:push

# 5. Seed database with test users + listings
npm run db:seed

# 6. Start dev server
npm run dev
```

Server runs on **http://localhost:5000**
Health check: **GET /health**

---

## Environment Variables

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Project Settings → API |
| `DATABASE_URL` | Dashboard → Project Settings → Database → URI (port 5432) |

---

## Supabase Storage Buckets

Create these three buckets in **Dashboard → Storage**:

| Bucket | Visibility |
|---|---|
| `listing-images` | Public |
| `avatars` | Public |
| `listing-documents` | Private |

---

## Test Accounts (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@sheltershorizon.com | Admin1234! |
| Seller | seller@test.com | Test1234! |
| Buyer | buyer@test.com | Test1234! |

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/v1/auth/register | — | Register new user |
| POST | /api/v1/auth/login | — | Login |
| POST | /api/v1/auth/verify-otp | — | Verify email OTP |
| POST | /api/v1/auth/resend-otp | — | Resend OTP |
| POST | /api/v1/auth/refresh | — | Refresh access token |
| GET | /api/v1/auth/me | ✓ | Get current user |
| POST | /api/v1/auth/forgot-password | — | Send reset email |
| POST | /api/v1/auth/reset-password | — | Reset password |
| GET | /api/v1/listings | — | Get listings (filtered) |
| GET | /api/v1/listings/saved | ✓ | Get saved listings |
| GET | /api/v1/listings/user/:id | — | Get user's listings |
| GET | /api/v1/listings/:slug | — | Get single listing |
| POST | /api/v1/listings | ✓ | Create listing |
| PATCH | /api/v1/listings/:id | ✓ | Update listing |
| POST | /api/v1/listings/:id/publish | ✓ | Submit for review |
| POST | /api/v1/listings/:id/save | ✓ | Toggle save |
| POST | /api/v1/uploads/images/:listingId | ✓ | Upload images |
| POST | /api/v1/uploads/documents/:listingId | ✓ | Upload document |
| DELETE | /api/v1/uploads/images/:imageId | ✓ | Delete image |
| GET | /api/v1/uploads/presigned/:docId | ✓ | Get signed doc URL |
| GET | /api/v1/escrow/me | ✓ | My escrows |
| GET | /api/v1/escrow/:id | ✓ | Single escrow |
| POST | /api/v1/escrow | ✓ | Initiate escrow |
| PATCH | /api/v1/escrow/:id/fund | ✓ | Fund escrow |
| PATCH | /api/v1/escrow/:id/agree | ✓ | Seller confirms |
| PATCH | /api/v1/escrow/:id/complete | ✓ | Release funds |
| PATCH | /api/v1/escrow/:id/dispute | ✓ | Raise dispute |
| GET | /api/v1/conversations | ✓ | My conversations |
| POST | /api/v1/conversations | ✓ | Start conversation |
| GET | /api/v1/conversations/:id/messages | ✓ | Get messages |
| POST | /api/v1/conversations/:id/messages | ✓ | Send message |
| PATCH | /api/v1/conversations/:id/status | ✓ | Update status |
| GET | /api/v1/users/:id | — | Public profile |
| GET | /api/v1/users/:id/reviews | — | User reviews |
| PATCH | /api/v1/users/me | ✓ | Update profile |
| POST | /api/v1/users/reviews | ✓ | Post review |
| GET | /api/v1/users/me/notifications | ✓ | My notifications |
| PATCH | /api/v1/users/me/notifications/read-all | ✓ | Mark all read |
| GET | /api/v1/users/me/saved-searches | ✓ | My alerts |
| POST | /api/v1/users/me/saved-searches | ✓ | Create alert |
| PATCH | /api/v1/users/me/saved-searches/:id | ✓ | Update alert |
| DELETE | /api/v1/users/me/saved-searches/:id | ✓ | Delete alert |
| GET | /api/v1/area-reports | — | All area reports |
| GET | /api/v1/area-reports/:state/:lga | — | Reports by location |
| POST | /api/v1/area-reports | ✓ | Submit report |
| POST | /api/v1/area-reports/:id/upvote | ✓ | Upvote report |
| GET | /api/v1/services/providers | — | Service providers |
| POST | /api/v1/services/requests | ✓ | Request a service |
| GET | /api/v1/services/requests/mine | ✓ | My service requests |
| GET | /api/v1/admin/dashboard | Admin | Dashboard stats |
| GET | /api/v1/admin/escrows | Admin | All escrows |
| PATCH | /api/v1/admin/listings/:id/approve | Admin | Approve listing |
| PATCH | /api/v1/admin/listings/:id/reject | Admin | Reject listing |
| PATCH | /api/v1/admin/users/:id/suspend | Admin | Suspend user |
| PATCH | /api/v1/admin/documents/:id/verify | Admin | Verify document |
| PATCH | /api/v1/admin/reports/:id/resolve | Admin | Verify area report |

---

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled dist/server.js |
| `npm run db:generate` | Generate Prisma client from schema |
| `npm run db:push` | Sync schema to database (no migration files) |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:seed` | Seed database with test data |
