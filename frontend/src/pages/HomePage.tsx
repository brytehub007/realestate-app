import HeroSection from "../components/property/HeroSection";
import PropertyCard from "../components/property/PropertyCard";
import { CATEGORY_META } from "../types";
import styles from "./HomePage.module.css";
import { useFeaturedListings } from "../hooks/useListings";

const CATEGORIES = Object.entries(CATEGORY_META);

const HOW_IT_WORKS = [
  { n: "01", title: "List or Browse", body: "Sellers list for free. Upgrade to Verified by uploading a C of O, Governor's Consent or building plan. Buyers browse with full price transparency — no 'Price on Call'.", color: "var(--accent-gold)" },
  { n: "02", title: "Draw Your Boundary", body: "Land & large properties include a polygon drawn on Mapbox. Houses show floor plans. Every listing has a real location, not just a pin.", color: "var(--clr-green-400)" },
  { n: "03", title: "Hire a Professional", body: "Engage vetted Surveyors, Property Lawyers, Valuers & Building Inspectors directly through the platform before committing any funds.", color: "var(--accent-silver)" },
  { n: "04", title: "3-Phase Escrow", body: "Phase 1: Commitment fee held. Phase 2: Verification professionals paid. Phase 3: Final balance released on title transfer — powered by Flutterwave/Paystack.", color: "var(--clr-gold-300)" },
];

const TIERS = [
  { name: "Free", badge: "badge-silver", price: "₦0", highlight: false, devTag: false, features: ["1 listing active at a time", "3 photos max", "Map pin location", "Basic metadata", "Standard visibility"], cta: "List for Free" },
  { name: "Verified", badge: "badge-gold", price: "Free (Review Required)", highlight: true, devTag: false, features: ["Upload title docs (C of O, Gov. Consent, Building Plan)", "Admin + Legal review workflow", "Up to 20 photos + video tour", "Polygon boundary or floor plan", "Priority search placement", "Verified ✓ badge on listing"], cta: "List as Verified" },
  { name: "Premium", badge: "badge-green", price: "₦25,000/mo", highlight: false, devTag: false, features: ["All Verified features", "Homepage featured slot", "Email campaign to buyers", "Analytics dashboard", "Dedicated support agent", "Social media promotion"], cta: "Go Premium" },
  { name: "Developer", badge: "badge-silver", price: "Custom", highlight: false, devTag: true, features: ["Unlimited off-plan projects", "Branded developer page", "Lead capture forms", "Payment plan integration", "Multi-unit management dashboard", "Priority escrow processing"], cta: "Become a Developer Partner" },
];

export default function HomePage() {
  const { data: featured = [], isLoading } = useFeaturedListings();

  return (
    <div>
      <HeroSection />

      {/* ── Browse by Category ── */}
      <section className={`section-pad ${styles.catSection}`}>
        <div className="container">
          <p className="section-eyebrow" style={{ color: "var(--clr-green-600)" }}>Browse by Category</p>
          <div className={styles.catSectionHead}>
            <h2 className={styles.h2Dark}>
              Every Type of Property,<br /><span style={{ color: "var(--clr-green-600)" }}>One Platform</span>
            </h2>
            <a href="/listings" className={`btn btn-outline-silver ${styles.viewAllBtn}`}
               style={{ borderColor: "var(--clr-green-500)", color: "var(--clr-green-600)" }}>
              View All Listings →
            </a>
          </div>
          <div className={styles.catGrid}>
            {CATEGORIES.map(([key, meta]) => (
              <a key={key} href={`/listings?category=${key}`} className={styles.catCard}>
                <div className={styles.catCardIcon} style={{ background: meta.color + "18", borderColor: meta.color + "44" }}>
                  <span className={styles.catCardEmoji}>{meta.icon}</span>
                </div>
                <div className={styles.catCardInfo}>
                  <strong className={styles.catCardTitle}>{meta.label}</strong>
                  <span className={styles.catCardDesc}>{meta.description}</span>
                </div>
                <svg className={styles.catArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Listings ── */}
      <section className={`section-pad ${styles.listingsSection}`}>
        <div className="container">
          <p className="section-eyebrow" style={{ color: "var(--clr-green-600)" }}>Featured Listings</p>
          <h2 className={styles.h2Dark}>
            Verified Properties. <span style={{ color: "var(--clr-green-600)" }}>Real Prices.</span>
          </h2>
          <div className={styles.listingsGrid}>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 340, borderRadius: 12, background: "rgba(212,175,55,.06)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))
              : featured.length > 0
                ? featured.map((p: Record<string, unknown>) => <PropertyCard key={p.id as string} property={p as never} />)
                : <p style={{ color: "var(--text-muted)", gridColumn: "1/-1", padding: "40px 0" }}>No featured listings right now — check back soon.</p>
            }
          </div>
          <div className={styles.listingsCta}>
            <a href="/listings" className="btn btn-primary">Explore All Listings →</a>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section-pad dark-section" id="how-it-works">
        <div className="container">
          <p className="section-eyebrow">How It Works</p>
          <h2 className={styles.h2Light}>
            From Search to <span className="text-gold" style={{ fontStyle: "italic" }}>Signed Title</span>
          </h2>
          <div className={styles.howGrid}>
            {HOW_IT_WORKS.map(({ n, title, body, color }) => (
              <div key={n} className={styles.howCard}>
                <span className={styles.howNum} style={{ color }}>{n}</span>
                <div className={styles.howRule} style={{ background: color }} />
                <h3 className={styles.howTitle}>{title}</h3>
                <p className={styles.howBody}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Listing Tiers ── */}
      <section className={`section-pad ${styles.tierSection}`}>
        <div className="container">
          <p className="section-eyebrow" style={{ color: "var(--clr-green-600)" }}>Listing Tiers</p>
          <h2 className={styles.h2Dark}>Choose How You <span style={{ color: "var(--clr-green-600)" }}>List</span></h2>
          <div className={styles.tierGrid}>
            {TIERS.map(t => (
              <div key={t.name} className={[styles.tierCard, t.highlight ? styles.tierHL : ""].join(" ")}>
                {t.highlight && <div className={styles.tierPopular}>Most Trusted</div>}
                {t.devTag && <div className={styles.tierDevTag}>For Developers</div>}
                <span className={`badge ${t.badge}`}>{t.name}</span>
                <div className={styles.tierPrice}>{t.price}</div>
                <ul className={styles.tierList}>
                  {t.features.map(f => <li key={f}><span className={styles.tick}>✓</span>{f}</li>)}
                </ul>
                <a href="/create-listing" className={`btn ${t.highlight ? "btn-primary" : "btn-outline-gold"} ${styles.tierCta}`}>{t.cta}</a>
              </div>
            ))}
          </div>
          <p className={styles.pricePolicy}>
            🚫 "Price on Call" is strictly <strong>prohibited</strong> on all tiers. Every listing must display a fixed price or price range.
          </p>
        </div>
      </section>

      {/* ── Escrow ── */}
      <section className="section-pad dark-section">
        <div className="container">
          <div className={styles.escrowLayout}>
            <div className={styles.escrowLeft}>
              <p className="section-eyebrow">Escrow Payment System</p>
              <h2 className={styles.h2Light}>Your Money Moves<br /><span className="text-gold" style={{ fontStyle: "italic" }}>Only When Milestones Do</span></h2>
              <p style={{ color: "var(--clr-silver-300)", lineHeight: 1.75, marginBottom: 32, maxWidth: 440 }}>
                Nigeria's first milestone-based real estate escrow. Every naira is tracked, held securely, and released only when each phase is independently verified.
              </p>
              <div className={styles.escrowSteps}>
                {[
                  { phase: "Phase 1", title: "Commitment Fee", desc: "5–10% held in escrow. Property locked for the buyer.", icon: "🔒", active: true },
                  { phase: "Phase 2", title: "Due Diligence", desc: "Surveyor & Lawyer fees released from Phase 1 funds upon report submission.", icon: "⚖️", active: false },
                  { phase: "Phase 3", title: "Final Transfer", desc: "Balance released to seller upon confirmed title transfer.", icon: "🏛️", active: false },
                ].map(s => (
                  <div key={s.phase} className={[styles.escrowStep, s.active ? styles.escrowActive : ""].join(" ")}>
                    <div className={styles.escrowStepIcon}>{s.icon}</div>
                    <div>
                      <span className={styles.escrowPhaseLabel}>{s.phase}</span>
                      <strong className={styles.escrowStepTitle}>{s.title}</strong>
                      <p className={styles.escrowStepDesc}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <a href="/escrow" className="btn btn-primary">See Escrow Demo</a>
                <a href="/services" className="btn btn-outline-gold">Hire a Professional</a>
              </div>
            </div>
            <div className={styles.escrowRight}>
              <div className={styles.gatewayBox}>
                <p className={styles.gatewayLabel}>Powered by</p>
                <div className={styles.gatewayLogos}>
                  <div className={styles.gatewayLogo}><span style={{ color: "#f5a623", fontWeight: 800, fontFamily: "var(--font-sans)", fontSize: "1.1rem" }}>Flutterwave</span></div>
                  <span style={{ color: "var(--clr-silver-700)" }}>+</span>
                  <div className={styles.gatewayLogo}><span style={{ color: "#00c3f7", fontWeight: 800, fontFamily: "var(--font-sans)", fontSize: "1.1rem" }}>Paystack</span></div>
                </div>
                <p className={styles.gatewayNote}>Bank-grade transaction security. PCI-DSS compliant. Funds insured.</p>
              </div>
              {[
                { v: "₦4.8T", l: "Total Escrow Value" },
                { v: "12,900", l: "Completed Transactions" },
                { v: "0.3%", l: "Dispute Rate" },
                { v: "99.7%", l: "Successful Releases" },
              ].map(({ v, l }) => (
                <div key={l} className={styles.escrowMetric}>
                  <span className={styles.escrowMetricV}>{v}</span>
                  <span className={styles.escrowMetricL}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Area Report banner ── */}
      <section className={`section-pad ${styles.areaSection}`}>
        <div className="container">
          <div className={styles.areaBanner}>
            <div>
              <span className="badge badge-red" style={{ marginBottom: 14, display: "inline-flex" }}>⚠️ Community Safety Feature</span>
              <h2 className={styles.h2Dark} style={{ marginBottom: 14 }}>
                Check the <span style={{ color: "var(--clr-green-600)" }}>Area Report</span> Before You Buy
              </h2>
              <p style={{ color: "var(--clr-silver-700)", maxWidth: 520, lineHeight: 1.75 }}>
                Users report land-grabber hotspots, government-acquired zones, demolition notices, flood-prone areas, and title disputes. Verified by our legal team.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/area-report" className="btn btn-primary">View Area Map</a>
              <a href="/area-report#flag" className="btn btn-outline-gold">Flag a Risk Zone</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
