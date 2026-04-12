// ─── ListingsPage ─────────────────────────────────────
export function ListingsPage() {
  return (
    <div style={{ paddingTop: 72 }}>
      <div className="container section-pad">
        <p className="section-eyebrow">Browse</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--clr-green-900)", marginBottom: 32 }}>
          All Listings
        </h1>
        <p style={{ color: "var(--clr-silver-700)" }}>
          Listings page — filter sidebar + map view + card grid coming in Step 2.
        </p>
      </div>
    </div>
  );
}

// ─── PropertyDetailPage ───────────────────────────────
export function PropertyDetailPage() {
  return (
    <div style={{ paddingTop: 72 }}>
      <div className="container section-pad">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--clr-green-900)" }}>
          Property Detail Page
        </h1>
        <p style={{ color: "var(--clr-silver-700)", marginTop: 12 }}>
          Full detail view with Mapbox polygon, metadata, documents, and escrow initiation — Step 3.
        </p>
      </div>
    </div>
  );
}

// ─── CreateListingPage ────────────────────────────────
export function CreateListingPage() {
  return (
    <div style={{ paddingTop: 72 }}>
      <div className="container section-pad">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--clr-green-900)" }}>
          Create Listing
        </h1>
        <p style={{ color: "var(--clr-silver-700)", marginTop: 12 }}>
          Multi-step form: Basic Info → Pricing (no Price on Call) → Map Boundary → Documents → Review. Step 4.
        </p>
      </div>
    </div>
  );
}

// ─── EscrowPage ───────────────────────────────────────
export function EscrowPage() {
  return (
    <div style={{ paddingTop: 72 }}>
      <div className="container section-pad">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--clr-green-900)" }}>
          Escrow Dashboard
        </h1>
        <p style={{ color: "var(--clr-silver-700)", marginTop: 12 }}>
          3-phase escrow tracker with Flutterwave/Paystack integration — Step 5.
        </p>
      </div>
    </div>
  );
}

// ─── AreaReportPage ───────────────────────────────────
export function AreaReportPage() {
  return (
    <div style={{ paddingTop: 72 }}>
      <div className="container section-pad">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--clr-green-900)" }}>
          Area Risk Reports
        </h1>
        <p style={{ color: "var(--clr-silver-700)", marginTop: 12 }}>
          Community-sourced map of land-grabber hotspots and government-acquired zones — Step 6.
        </p>
      </div>
    </div>
  );
}

// ─── DashboardPage ────────────────────────────────────
export function DashboardPage() {
  return (
    <div style={{ paddingTop: 72 }}>
      <div className="container section-pad">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--clr-green-900)" }}>
          My Dashboard
        </h1>
        <p style={{ color: "var(--clr-silver-700)", marginTop: 12 }}>
          Seller / Buyer / Professional dashboard — Step 7.
        </p>
      </div>
    </div>
  );
}

// ─── AdminPage ────────────────────────────────────────
export function AdminPage() {
  return (
    <div style={{ paddingTop: 72 }}>
      <div className="container section-pad">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--clr-green-900)" }}>
          Admin Panel
        </h1>
        <p style={{ color: "var(--clr-silver-700)", marginTop: 12 }}>
          Legal review queue, verified listing approvals, flagged area management — Step 8.
        </p>
      </div>
    </div>
  );
}

// ─── ServiceRequestPage ───────────────────────────────
export function ServiceRequestPage() {
  return (
    <div style={{ paddingTop: 72 }}>
      <div className="container section-pad">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--clr-green-900)" }}>
          Hire a Professional
        </h1>
        <p style={{ color: "var(--clr-silver-700)", marginTop: 12 }}>
          Browse and hire vetted Surveyors and Property Lawyers — Step 9.
        </p>
      </div>
    </div>
  );
}

// ─── NotFoundPage ─────────────────────────────────────
export function NotFoundPage() {
  return (
    <div style={{ paddingTop: 72, minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "6rem", color: "var(--clr-green-200)", lineHeight: 1 }}>404</h1>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--clr-green-900)" }}>
          Plot Not Found
        </h2>
        <p style={{ color: "var(--clr-silver-700)", marginTop: 12, marginBottom: 28 }}>
          The property you're looking for may have been sold or moved.
        </p>
        <a href="/" className="btn btn-primary">Back to Homepage</a>
      </div>
    </div>
  );
}
