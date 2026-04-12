import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import PropertyCard from "../components/property/PropertyCard";
import type { LandMetadata, BuildingMetadata, Property } from "../types";
import { CATEGORY_META, LISTING_TYPE_META } from "../types";
import styles from "./PropertyDetailPage.module.css";
import { useListing, useListings, useToggleSave } from "../hooks/useListings";

// ── Price formatter ────────────────────────────────────────────────────────
function fmt(n: number, freq?: string): string {
  const v = n >= 1_000_000_000 ? `₦${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M`
    : `₦${(n / 1_000).toFixed(0)}k`;
  if (freq === "per_night") return `${v}/night`;
  if (freq === "per_month") return `${v}/mo`;
  if (freq === "per_year")  return `${v}/yr`;
  return v;
}

function fmtPrice(p: Property["price"]): string {
  if (p.type === "fixed" && p.amount) return fmt(p.amount, p.rentFrequency);
  if (p.type === "range" && p.minAmount && p.maxAmount)
    return `${fmt(p.minAmount)} – ${fmt(p.maxAmount)}`;
  return "Price on request";
}

type Tab = "overview" | "details" | "documents" | "location" | "seller";

// ── Tab panel helper ───────────────────────────────────────────────────────
function TabPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return active ? <div className={styles.tabPanel}>{children}</div> : null;
}

// ── MetaTable ─────────────────────────────────────────────────────────────
function MetaTable({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className={styles.metaTable}>
      {rows.map(([k, v]) => v != null ? (
        <div key={k} className={styles.metaRow}>
          <span className={styles.metaKey}>{k}</span>
          <span className={styles.metaVal}>{v}</span>
        </div>
      ) : null)}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [showEscrow, setShowEscrow] = useState(false);
  const [stickyBar, setStickyBar] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Live data
  const { data: property, isLoading, isError } = useListing(id);
  const toggleSave = useToggleSave();

  // Related listings — same category, excluding current
  const { data: relatedData } = useListings(
    property ? { category: property.category, limit: 4 } : {}
  );
  const related = (relatedData?.data ?? []).filter((p: Record<string, unknown>) => p.id !== id).slice(0, 3);

  const saved = property?.isSaved ?? false;

  const catMeta  = (property ? CATEGORY_META[property.category as keyof typeof CATEGORY_META] : null)
    ?? { icon: "🏠", label: property?.category ?? "Property", color: "#888", description: "" };
  const typeMeta = (property ? LISTING_TYPE_META[property.listingType as keyof typeof LISTING_TYPE_META] : null)
    ?? { label: property?.listingType ?? "Listing", color: "#888", icon: "📋" };

  if (isLoading) return (
    <div style={{ padding: "120px 0", textAlign: "center", color: "var(--text-muted)" }}>
      Loading property…
    </div>
  );
  if (isError || !property) return (
    <div style={{ padding: "120px 0", textAlign: "center", color: "var(--text-muted)" }}>
      Property not found. <a href="/listings">Browse listings →</a>
    </div>
  );

  // Sticky action bar on scroll past hero
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const obs = new IntersectionObserver(
      ([e]) => setStickyBar(!e.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  const m  = property.metadata ?? {};
  const lm = (m as Record<string, unknown>).kind === "land" ? (m as LandMetadata) : null;
  const bm = (m as Record<string, unknown>).kind === "building" ? (m as BuildingMetadata) : null;

  const totalPrice = (property.price?.amount ?? property.price?.minAmount ?? property.price ?? 0) as number;

  return (
    <div className={styles.page}>

      {/* ── Sticky title bar (appears when hero scrolls out) ── */}
      <div className={[styles.stickyBar, stickyBar ? styles.stickyBarVisible : ""].join(" ")}>
        <div className={`container ${styles.stickyInner}`}>
          <div>
            <p className={styles.stickyTitle}>{property.title}</p>
            <p className={styles.stickyPrice}>{fmtPrice(property.price)}</p>
          </div>
          <div className={styles.stickyActions}>
            <button className={styles.stickyContactBtn}>Contact Seller</button>
            <button className={styles.stickyEscrowBtn} onClick={() => setShowEscrow(true)}>
              Initiate Escrow
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* ── Breadcrumb ── */}
        <div className={styles.breadcrumb}>
          <Link to="/" className={styles.breadLink}>Home</Link>
          <span className={styles.breadSep}>›</span>
          <Link to="/listings" className={styles.breadLink}>Listings</Link>
          <span className={styles.breadSep}>›</span>
          <Link to={`/listings?category=${property.category}`} className={styles.breadLink}>
            {catMeta.icon} {catMeta.label}
          </Link>
          <span className={styles.breadSep}>›</span>
          <span className={styles.breadCurrent}>{property.title}</span>
        </div>

        {/* ── Gallery ── */}
        <div ref={heroRef}>
          <div className={styles.gallery}>
            {(property.images.length
              ? property.images.map((img: any) => img.url || img)
              : [
                  "https://images.unsplash.com/photo-1582407947304-fd86f28f2cfc?w=1200&q=80",
                  "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80",
                  "https://images.unsplash.com/photo-1560184897-ae75f418493e?w=1200&q=80",
                ]
            ).map((src: string, i: number) => (
              <img key={i} src={src} alt={`${property.title} ${i + 1}`} className={styles.galleryImg} />
            ))}
          </div>
        </div>

        {/* ── Main two-column layout ── */}
        <div className={styles.layout}>

          {/* ── LEFT: Content ── */}
          <div className={styles.content}>

            {/* Title block */}
            <div className={styles.titleBlock}>
              <div className={styles.badges}>
                <span
                  className={styles.catBadge}
                  style={{ background: catMeta.color + "18", borderColor: catMeta.color + "44", color: catMeta.color }}
                >
                  {catMeta.icon} {catMeta.label}
                </span>
                <span className={styles.typeBadge} style={{ background: typeMeta.color }}>
                  {typeMeta.label}
                </span>
                {property.tier === "verified" && <span className="badge badge-gold">✓ Verified</span>}
                {property.tier === "premium"  && <span className="badge badge-green">★ Premium</span>}
                {property.tier === "developer"&& <span className="badge badge-green">🏗 Developer</span>}
                {property.featured && <span className={styles.featuredBadge}>⭐ Featured</span>}
              </div>

              <h1 className={styles.propTitle}>{property.title}</h1>

              <div className={styles.locRow}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {property.address && <span>{property.address}, </span>}
                {property.neighbourhood && <span>{property.neighbourhood}, </span>}
                <span>{property.lga}, </span>
                <span>{property.state}</span>
              </div>

              <div className={styles.statsRow}>
                <span className={styles.statPill}>👁 {property.views.toLocaleString()} views</span>
                <span className={styles.statPill}>🔖 {property.saves} saves</span>
                {property.boundary && <span className={styles.statPill}>📐 Boundary mapped</span>}
                {property.virtualTourUrl && <span className={styles.statPill}>🥽 Virtual tour</span>}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className={styles.tabs}>
              {([
                ["overview",  "Overview"],
                ["details",   "Details & Specs"],
                ["documents", "Documents"],
                ["location",  "Location & Map"],
                ["seller",    "Seller Info"],
              ] as [Tab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  className={[styles.tabBtn, tab === key ? styles.tabActive : ""].join(" ")}
                  onClick={() => setTab(key)}
                >
                  {label}
                  {key === "documents" && property.documents.length > 0 && (
                    <span className={styles.tabCount}>{property.documents.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            <TabPanel active={tab === "overview"}>
              <section className={styles.section}>
                <h2 className={styles.sectionH}>About This Property</h2>
                <p className={styles.description}>{property.description}</p>
                <p className={styles.description} style={{ marginTop: 8 }}>
                  This {catMeta.label.toLowerCase()} is listed for {typeMeta.label.toLowerCase()} in {property.lga}, {property.state}.
                  {property.tier === "verified"
                    ? " The listing is fully verified — title documents have been reviewed and confirmed by our legal team."
                    : " The listing is unverified. We recommend requesting title documentation from the seller before proceeding."}
                </p>
              </section>

              {/* Quick facts grid */}
              <section className={styles.section}>
                <h2 className={styles.sectionH}>Quick Facts</h2>
                <div className={styles.factsGrid}>
                  {property.sizeInSqm && <FactCard icon="📐" label="Total Area" value={`${property.sizeInSqm.toLocaleString()} m²`} />}
                  {property.sizeInPlot && <FactCard icon="🗺️" label="Plot Size" value={`${property.sizeInPlot} plot${property.sizeInPlot > 1 ? "s" : ""}`} />}
                  {property.sizeInHectare && <FactCard icon="🌾" label="Hectares" value={`${property.sizeInHectare} ha`} />}
                  {property.floorArea && <FactCard icon="🏢" label="Floor Area" value={`${property.floorArea.toLocaleString()} m²`} />}
                  {property.landArea && <FactCard icon="🏡" label="Land Area" value={`${property.landArea.toLocaleString()} m²`} />}

                  {bm?.bedrooms != null && <FactCard icon="🛏" label="Bedrooms" value={String(bm.bedrooms)} />}
                  {bm?.bathrooms != null && <FactCard icon="🚿" label="Bathrooms" value={String(bm.bathrooms)} />}
                  {bm?.toilets != null && <FactCard icon="🚽" label="Toilets" value={String(bm.toilets)} />}
                  {bm?.totalFloors != null && <FactCard icon="🏙️" label="Total Floors" value={String(bm.totalFloors)} />}
                  {bm?.floorLevel != null && <FactCard icon="📶" label="Unit Floor" value={`Floor ${bm.floorLevel}`} />}
                  {bm?.parkingSpaces != null && <FactCard icon="🚗" label="Parking Spaces" value={String(bm.parkingSpaces)} />}
                  {bm?.ceilingHeight && <FactCard icon="📏" label="Ceiling Height" value={`${bm.ceilingHeight}m`} />}

                  {lm?.soilType && <FactCard icon="🌱" label="Soil Type" value={lm.soilType.charAt(0).toUpperCase() + lm.soilType.slice(1)} />}
                  {lm?.topography && <FactCard icon="⛰️" label="Topography" value={lm.topography.replace("_", " ")} />}
                  {lm?.zoning && <FactCard icon="🏙" label="Zoning" value={lm.zoning.replace("_", " ")} />}
                  {lm?.powerGrid && <FactCard icon="⚡" label="Power Grid" value={lm.powerGrid.replace("_", " ")} />}
                </div>
              </section>

              {/* Amenities (buildings) */}
              {bm && (
                <section className={styles.section}>
                  <h2 className={styles.sectionH}>Amenities & Features</h2>
                  <div className={styles.amenitiesGrid}>
                    {[
                      [bm.pool,       "🏊", "Swimming Pool"],
                      [bm.gym,        "💪", "Gym"],
                      [bm.elevator,   "🛗", "Elevator / Lift"],
                      [bm.security,   "🔐", "24hr Security"],
                      [bm.cctv,       "📷", "CCTV Surveillance"],
                      [bm.serviced,   "🧹", "Serviced"],
                      [bm.bq,         "🏠", "Boys' Quarters"],
                      [bm.garden,     "🌿", "Garden"],
                      [bm.pool,       "🔥", "Compound"],
                      [bm.internet,   "📶", "Internet Ready"],
                      [bm.loadingDock,"🚛", "Loading Dock"],
                      [bm.officeSpace,"💼", "Office Space"],
                      [bm.fenced,     "🧱", "Fenced & Gated"],
                    ].filter(([has]) => has).map(([, icon, label]) => (
                      <div key={label as string} className={styles.amenityItem}>
                        <span className={styles.amenityIcon}>{icon as string}</span>
                        <span className={styles.amenityLabel}>{label as string}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Area risk notice */}
              <section className={styles.section}>
                <div className={styles.areaRiskBanner}>
                  <div className={styles.areaRiskLeft}>
                    <span className={styles.areaRiskIcon}>🗺️</span>
                    <div>
                      <strong className={styles.areaRiskTitle}>Check Area Safety Report</strong>
                      <p className={styles.areaRiskSub}>
                        Community-sourced reports on land-grabbers, flood risk, demolition notices and title disputes in {property.lga}.
                      </p>
                    </div>
                  </div>
                  <Link to="/area-report" className={styles.areaRiskBtn}>View Map →</Link>
                </div>
              </section>
            </TabPanel>

            {/* ── DETAILS TAB ── */}
            <TabPanel active={tab === "details"}>
              <section className={styles.section}>
                <h2 className={styles.sectionH}>Full Specifications</h2>

                {lm && (
                  <>
                    <h3 className={styles.subH}>Land Information</h3>
                    <MetaTable rows={[
                      ["Soil Type",         lm.soilType],
                      ["Topography",        lm.topography?.replace("_"," ")],
                      ["Zoning",            lm.zoning?.replace("_"," ")],
                      ["Power Grid",        lm.powerGrid?.replace("_"," ")],
                      ["Water Supply",      lm.waterSupply ? "Available" : "Not Available"],
                      ["Road Access",       lm.roadAccess ? "Direct access" : "Via secondary road"],
                      ["Flood Risk",        lm.floodRisk?.toUpperCase()],
                      ["Fenced",            lm.fenced ? "Yes" : "No"],
                      ["Gate Access",       lm.gateAccess ? "Yes" : "No"],
                      ["Dist. to Highway",  lm.distanceToHighway ? `${lm.distanceToHighway} km` : null],
                      ["Dist. to School",   lm.distanceToSchool ? `${lm.distanceToSchool} km` : null],
                      ["Dist. to Market",   lm.distanceToMarket ? `${lm.distanceToMarket} km` : null],
                    ]} />
                    {lm.nearbyLandmarks?.length && (
                      <p className={styles.landmarks}>
                        <strong>Nearby Landmarks:</strong> {lm.nearbyLandmarks.join(", ")}
                      </p>
                    )}
                  </>
                )}

                {bm && (
                  <>
                    <h3 className={styles.subH}>Building Details</h3>
                    <MetaTable rows={[
                      ["Bedrooms",           bm.bedrooms != null ? String(bm.bedrooms) : null],
                      ["Bathrooms",          bm.bathrooms != null ? String(bm.bathrooms) : null],
                      ["Toilets",            bm.toilets != null ? String(bm.toilets) : null],
                      ["Sitting Rooms",      bm.sittingRooms != null ? String(bm.sittingRooms) : null],
                      ["Total Floors",       bm.totalFloors != null ? String(bm.totalFloors) : null],
                      ["Unit Floor Level",   bm.floorLevel != null ? `Floor ${bm.floorLevel}` : null],
                      ["Furnishing",         bm.furnishingStatus?.replace("_"," ")],
                      ["Condition",          bm.condition],
                      ["Year Built",         bm.yearBuilt ? String(bm.yearBuilt) : null],
                      ["Parking",            `${bm.parking?.replace("_"," ")} ${bm.parkingSpaces ? `(${bm.parkingSpaces} spaces)` : ""}`],
                      ["Power Supply",       bm.powerSupply?.replace("_"," ")],
                      ["Water Supply",       bm.waterSupply?.replace("_"," ")],
                      ["Power Grid",         bm.powerGrid?.replace("_"," ")],
                      ["Flood Risk",         bm.floodRisk?.toUpperCase()],
                      ["Estate Name",        bm.estateName],
                      ["Ceiling Height",     bm.ceilingHeight ? `${bm.ceilingHeight}m` : null],
                      ["Floor Load Capacity",bm.floorLoadCapacity ? `${bm.floorLoadCapacity} t/m²` : null],
                      ["Max Guests",         bm.maxGuests ? String(bm.maxGuests) : null],
                      ["Min Nights",         bm.minNights ? `${bm.minNights} nights` : null],
                      ["Pets Allowed",       bm.petsAllowed !== undefined ? (bm.petsAllowed ? "Yes" : "No") : null],
                    ]} />
                  </>
                )}

                <h3 className={styles.subH}>Pricing Details</h3>
                <MetaTable rows={[
                  ["Listing Price",     fmtPrice(property.price)],
                  ["Negotiable",        property.price.negotiable ? "Yes" : "No"],
                  ["Currency",          property.price.currency],
                  ["Service Charge",    property.price.serviceCharge ? fmt(property.price.serviceCharge, "per_year") : null],
                  ["Caution Fee",       property.price.cautionFee ? fmt(property.price.cautionFee) : null],
                  ["Agency Fee",        property.price.agencyFee ? fmt(property.price.agencyFee) : null],
                  ["Legal Fee",         property.price.legalFee ? fmt(property.price.legalFee) : null],
                ]} />
              </section>
            </TabPanel>

            {/* ── DOCUMENTS TAB ── */}
            <TabPanel active={tab === "documents"}>
              <section className={styles.section}>
                <h2 className={styles.sectionH}>Title & Legal Documents</h2>

                {property.documents.length === 0 ? (
                  <div className={styles.noDocsBanner}>
                    <span className={styles.noDocsIcon}>📂</span>
                    <div>
                      <strong>No documents uploaded</strong>
                      <p>This is a <strong>Free</strong> tier listing. The seller has not uploaded title documents yet. Contact the seller to request proof of ownership before proceeding.</p>
                      {property.tier === "free" && (
                        <p className={styles.upgradeHint}>
                          Seller: <Link to="/create-listing" className={styles.upgradeLink}>Upgrade to Verified →</Link> to upload C of O, Governor's Consent or Survey Plan and earn buyer trust.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.docGrid}>
                    {property.documents.map(doc => (
                      <div key={doc.id} className={styles.docCard}>
                        <div className={styles.docIcon}>📄</div>
                        <div className={styles.docInfo}>
                          <strong className={styles.docName}>{doc.name}</strong>
                          <span className={styles.docType}>{doc.type.replace(/_/g, " ")}</span>
                          {doc.verifiedAt && (
                            <span className={styles.docVerified}>
                              ✓ Verified {new Date(doc.verifiedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        <a href={doc.url} className={styles.docViewBtn} target="_blank" rel="noopener noreferrer">
                          View →
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.docWarning}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p>Always verify documents with a licensed Nigerian Lawyer before committing funds. Shelters' Horizon provides document display only; we do not guarantee legal validity. Use the <Link to="/services" className={styles.docLink}>Hire a Lawyer</Link> service for professional verification.</p>
                </div>
              </section>
            </TabPanel>

            {/* ── LOCATION TAB ── */}
            <TabPanel active={tab === "location"}>
              <section className={styles.section}>
                <h2 className={styles.sectionH}>Property Location</h2>
                <p className={styles.description}>
                  {property.address && `${property.address}. `}
                  Located in {property.lga}, {property.state}.
                  {property.neighbourhood && ` Neighbourhood: ${property.neighbourhood}.`}
                  {property.boundary && " Boundary polygon mapped and verified."}
                </p>

                {/* Map embed */}
                <div className={styles.mapWrapper}>
                  {import.meta.env.VITE_MAPBOX_TOKEN ? (
                    <div id="detail-map" className={styles.map} />
                  ) : (
                    <div className={styles.mapPlaceholder}>
                      <div className={styles.mapPlaceholderContent}>
                        <span className={styles.mapPlaceholderIcon}>🗺️</span>
                        <strong className={styles.mapPlaceholderTitle}>Interactive Map</strong>
                        <p>
                          <strong>{property.title}</strong><br />
                          📍 {property.lga}, {property.state}<br />
                          {property.boundary && "📐 Polygon boundary available"}
                        </p>
                        <p className={styles.mapPlaceholderHint}>
                          Add <code>VITE_MAPBOX_TOKEN=pk.your_token</code> to enable the live map with polygon viewer.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.coordBox}>
                  <div className={styles.coordItem}>
                    <span className={styles.coordLabel}>Latitude</span>
                    <span className={styles.coordVal}>{property.coordinates.lat.toFixed(6)}°</span>
                  </div>
                  <div className={styles.coordItem}>
                    <span className={styles.coordLabel}>Longitude</span>
                    <span className={styles.coordVal}>{property.coordinates.lng.toFixed(6)}°</span>
                  </div>
                  {property.boundary && (
                    <div className={styles.coordItem}>
                      <span className={styles.coordLabel}>Boundary</span>
                      <span className={styles.coordVal} style={{ color: "var(--clr-green-500)" }}>✓ Polygon mapped</span>
                    </div>
                  )}
                </div>
              </section>
            </TabPanel>

            {/* ── SELLER TAB ── */}
            <TabPanel active={tab === "seller"}>
              <section className={styles.section}>
                <h2 className={styles.sectionH}>About the Seller</h2>
                <div className={styles.sellerCard}>
                  <div className={styles.sellerAvatar}>
                    {property.seller?.avatar
                      ? <img src={property.seller.avatar} alt="" />
                      : <span className={styles.sellerAvatarFallback}>
                          {property.seller?.firstName?.[0] ?? "S"}
                        </span>
                    }
                    {property.seller?.isVerified && <span className={styles.sellerVerifiedBadge}>✓</span>}
                  </div>
                  <div className={styles.sellerInfo}>
                    <h3 className={styles.sellerName}>
                      {property.seller ? `${property.seller.firstName} ${property.seller.lastName}` : "Private Seller"}
                    </h3>
                    {property.seller?.agencyName && (
                      <p className={styles.sellerAgency}>{property.seller.agencyName}</p>
                    )}
                    <div className={styles.sellerMeta}>
                      {property.seller?.mfaEnabled && (
                        <span className={styles.mfaBadge}>🔐 MFA Enabled</span>
                      )}
                      <span className={styles.sellerListings}>
                        {property.owner?.listings?.length ?? 0} active listing{(property.owner?.listings?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.sellerActions}>
                  <button className={styles.msgBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Send Message
                  </button>
                  <button className={styles.callBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.1a16 16 0 0 0 6 6l.96-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.5v.42z"/>
                    </svg>
                    Request Phone
                  </button>
                </div>

                <div className={styles.sellerWarning}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                  </svg>
                  <p>Never pay outside the escrow system. All legitimate transactions on Shelters' Horizon are protected. Report suspicious sellers using the flag below.</p>
                </div>
              </section>
            </TabPanel>

          </div>

          {/* ── RIGHT: Sticky CTA sidebar ── */}
          <aside className={styles.sidebar}>
            {/* Price card */}
            <div className={styles.priceCard}>
              <div className={styles.priceRow}>
                <span className={styles.priceDisplay}>{fmtPrice(property.price)}</span>
                {property.price.negotiable && <span className={styles.negTag}>Negotiable</span>}
              </div>
              {property.price.rentFrequency && (
                <p className={styles.priceNote}>
                  {property.price.rentFrequency === "per_year" && property.price.cautionFee &&
                    `+ Caution: ${fmt(property.price.cautionFee)}`}
                  {property.price.rentFrequency === "per_year" && property.price.agencyFee &&
                    ` + Agency: ${fmt(property.price.agencyFee)}`}
                </p>
              )}

              {/* CTA buttons */}
              {(property.listingType === "sale" || property.listingType === "lease") && (
                <button className={styles.escrowBtn} onClick={() => setShowEscrow(true)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Initiate Escrow
                </button>
              )}

              <button className={styles.contactBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Contact Seller
              </button>

              <button
                className={[styles.saveBtn, saved ? styles.saveBtnActive : ""].join(" ")}
                onClick={() => toggleSave.mutate(property.id)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                {saved ? "Saved" : "Save Property"}
              </button>
            </div>

            {/* Escrow guarantee box */}
            <div className={styles.escrowGuarantee}>
              <p className={styles.egTitle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Escrow Protected
              </p>
              <p className={styles.egText}>Your money is held securely. Released to the seller only after each milestone is independently verified.</p>
              <div className={styles.egPhases}>
                {["Phase 1: Commitment", "Phase 2: Verification", "Phase 3: Transfer"].map((p, i) => (
                  <div key={p} className={styles.egPhase}>
                    <span className={styles.egPhaseNum}>{i + 1}</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
              <div className={styles.egGateways}>
                <span style={{ color: "#f5a623", fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 800 }}>Flutterwave</span>
                <span style={{ color: "var(--clr-silver-500)" }}>+</span>
                <span style={{ color: "#00c3f7", fontFamily: "var(--font-sans)", fontSize: "0.8rem", fontWeight: 800 }}>Paystack</span>
              </div>
            </div>

            {/* Professional services */}
            <div className={styles.servicesBox}>
              <p className={styles.servicesTitle}>Need Professional Help?</p>
              <div className={styles.serviceLinks}>
                {[
                  { icon: "📏", label: "Hire a Surveyor", href: "/services?type=surveyor" },
                  { icon: "⚖️", label: "Hire a Lawyer", href: "/services?type=lawyer" },
                  { icon: "💰", label: "Property Valuation", href: "/services?type=valuer" },
                  { icon: "🔍", label: "Building Inspection", href: "/services?type=inspector" },
                ].map(({ icon, label, href }) => (
                  <Link key={label} to={href} className={styles.serviceLink}>
                    <span>{icon}</span> {label}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* Share / report */}
            <div className={styles.utilRow}>
              <button className={styles.utilBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
              <button className={styles.utilBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Report
              </button>
              <button className={styles.utilBtn} onClick={() => toggleSave.mutate(property.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </aside>
        </div>

        {/* ── Related listings ── */}
        {related.length > 0 && (
          <section className={styles.relatedSection}>
            <div className={styles.relatedHeader}>
              <h2 className={styles.relatedTitle}>
                More {catMeta.label} in {property.state}
              </h2>
              <Link to={`/listings?category=${property.category}&state=${property.state}`} className={styles.relatedLink}>
                View all →
              </Link>
            </div>
            <div className={styles.relatedGrid}>
              {related.map(p => <PropertyCard key={p.id} property={p} />)}
            </div>
          </section>
        )}
      </div>

      {/* ── Escrow Modal ── */}
      {showEscrow && (
        <div className={styles.modalOverlay} onClick={() => setShowEscrow(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Initiate Escrow</h3>
            <p>You are about to initiate a secure escrow transaction for:</p>
            <p><strong>{property.title}</strong></p>
            <p style={{ color: "var(--accent-gold)", fontSize: "1.4rem", margin: "16px 0" }}>
              ₦{Number(property.price).toLocaleString()}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              A 5% commitment fee will be required to secure the property.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary" onClick={() => setShowEscrow(false)}>
                Proceed to Escrow
              </button>
              <button className="btn btn-ghost" onClick={() => setShowEscrow(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fact card atom ─────────────────────────────────────────────────────────
function FactCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className={styles.factCard}>
      <span className={styles.factIcon}>{icon}</span>
      <div>
        <span className={styles.factLabel}>{label}</span>
        <span className={styles.factValue}>{value}</span>
      </div>
    </div>
  );
}
