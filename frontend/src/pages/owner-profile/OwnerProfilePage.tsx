import { useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./OwnerProfilePage.module.css";
import { useUserProfile, useUserReviews } from "../../hooks/useUser";
import { useUserListings } from "../../hooks/useListings";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active",  color: "#3d7a3d", bg: "rgba(61,122,61,.1)" },
  sold:   { label: "Sold",    color: "#e67e22", bg: "rgba(230,126,34,.1)" },
  rented: { label: "Rented",  color: "#3498db", bg: "rgba(52,152,219,.1)" },
  leased: { label: "Leased",  color: "#3498db", bg: "rgba(52,152,219,.1)" },
};

function fmt(n: number) {
  if (n >= 1_000_000_000) return `₦${(n/1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n/1_000_000).toFixed(0)}M`;
  return `₦${(n/1_000).toFixed(0)}k`;
}

function fmtPrice(price: unknown): { val: string; suffix: string } {
  const p = price as Record<string, unknown>;
  if (!p) return { val: "—", suffix: "" };
  const amount = (p.amount as number) ?? (p.minAmount as number) ?? 0;
  const freq = p.rentFrequency as string | undefined;
  const val = fmt(amount);
  const suffix = freq === "per_year" ? "/yr" : freq === "per_month" ? "/mo" : freq === "per_night" ? "/night" : "";
  return { val, suffix };
}

type Tab = "listings" | "reviews" | "verification";

export default function OwnerProfilePage() {
  const { id: userId } = useParams();
  const [tab, setTab] = useState<Tab>("listings");
  const [contactOpen, setContactOpen] = useState(false);

  const { data: profile, isLoading } = useUserProfile(userId);
  const { data: reviews = [] } = useUserReviews(userId);
  const { data: listingsData } = useUserListings(userId);

  const listings: Record<string, unknown>[] = Array.isArray(listingsData)
    ? listingsData
    : Array.isArray((listingsData as Record<string, unknown>)?.data)
      ? (listingsData as Record<string, unknown[]>).data as Record<string, unknown>[]
      : [];

  const reviewList = reviews as Record<string, unknown>[];

  const avgRating = reviewList.length
    ? (reviewList.reduce((s, r) => s + ((r.rating as number) ?? 0), 0) / reviewList.length).toFixed(1)
    : "0.0";
  const trustScore = (profile as Record<string, number>)?.trustScore ?? 0;
  const activeListings = listings.filter(l => l.status === "active").length;
  const fullName = profile
    ? `${(profile as Record<string,string>).firstName} ${(profile as Record<string,string>).lastName}`
    : userId?.slice(0, 8) ?? "Seller";
  const initials = profile
    ? `${(profile as Record<string,string>).firstName?.[0] ?? ""}${(profile as Record<string,string>).lastName?.[0] ?? ""}`.toUpperCase()
    : "??";

  if (isLoading) return (
    <div style={{ padding: "120px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading profile…</div>
  );

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.onlineDot} />
          </div>
          <div className={styles.heroInfo}>
            <div className={styles.heroTopRow}>
              <div>
                <h1 className={styles.heroName}>{fullName}</h1>
                <p className={styles.heroRole}>
                  {(profile as Record<string,string>)?.role ?? "Seller"}
                  {(profile as Record<string,boolean>)?.isVerified ? " · Verified" : ""}
                </p>
              </div>
              <div className={styles.trustScoreWrap}>
                <div className={styles.trustScoreLabel}>Trust Score</div>
                <div className={styles.trustScoreVal}>{trustScore}</div>
                <div className={styles.trustScoreBar}>
                  <div className={styles.trustScoreFill} style={{ width: `${trustScore}%` }} />
                </div>
                <div className={styles.trustScoreSub}>{trustScore >= 80 ? "Excellent" : trustScore >= 60 ? "Good" : "Building"}</div>
              </div>
            </div>

            <div className={styles.statRow}>
              <div className={styles.stat}><span className={styles.statVal}>{activeListings}</span><span className={styles.statLbl}>Active Listings</span></div>
              <div className={styles.statDiv} />
              <div className={styles.stat}><span className={styles.statVal}>★ {avgRating}</span><span className={styles.statLbl}>{reviewList.length} Reviews</span></div>
              <div className={styles.statDiv} />
              <div className={styles.stat}><span className={styles.statVal}>{listings.length}</span><span className={styles.statLbl}>Total Listings</span></div>
            </div>

            <div className={styles.badgeRow}>
              {(profile as Record<string,boolean>)?.isVerified && <span className={styles.badge} data-type="verified">✓ Identity Verified</span>}
              {(profile as Record<string,boolean>)?.mfaEnabled && <span className={styles.badge} data-type="escrow">🔐 MFA Enabled</span>}
            </div>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.contactBtn} onClick={() => setContactOpen(true)}>💬 Send Message</button>
            <button className={styles.reportBtn}>⚠ Report</button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabBarInner}>
          {([
            { key: "listings",     label: "Listings",     badge: activeListings },
            { key: "reviews",      label: "Reviews",      badge: reviewList.length },
            { key: "verification", label: "Verification", badge: null },
          ] as const).map(t => (
            <button
              key={t.key}
              className={[styles.tabBtn, tab === t.key ? styles.tabBtnActive : ""].join(" ")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.badge != null && <span className={styles.tabBadge}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        {/* LISTINGS TAB */}
        {tab === "listings" && (
          <div className={styles.listingsGrid}>
            {listings.length === 0 ? (
              <p style={{ color: "var(--text-muted)", gridColumn: "1/-1", padding: "40px 0" }}>No listings from this seller.</p>
            ) : listings.map(l => {
              const st = STATUS_META[(l.status as string)] ?? STATUS_META.active;
              const imgs = l.images as Record<string, string>[] | undefined;
              const img = imgs?.[0]?.url ?? "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&q=80";
              const { val, suffix } = fmtPrice(l.price);
              return (
                <div key={l.id as string} className={styles.listingCard}>
                  <div className={styles.listingImgWrap}>
                    <img src={img} alt={l.title as string} className={styles.listingImg} />
                    <span className={styles.listingStatus} style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    <span className={styles.listingCat}>{l.category as string}</span>
                  </div>
                  <div className={styles.listingBody}>
                    <div className={styles.listingTitle}>{l.title as string}</div>
                    <div className={styles.listingLoc}>📍 {l.lga as string}, {l.state as string}</div>
                    <div className={styles.listingFooter}>
                      <div className={styles.listingPrice}>{val}<span className={styles.listingPriceLbl}> {suffix}</span></div>
                      <div className={styles.listingViews}>👁 {(l.views as number)?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REVIEWS TAB */}
        {tab === "reviews" && (
          <div className={styles.reviewsWrap}>
            {reviewList.length === 0 ? (
              <p style={{ color: "var(--text-muted)", padding: "40px 0" }}>No reviews yet for this seller.</p>
            ) : (
              <>
                <div className={styles.reviewsSummary}>
                  <div className={styles.reviewsBigRating}>{avgRating}</div>
                  <div>
                    <div className={styles.reviewsStars}>{"★".repeat(Math.round(Number(avgRating)))}</div>
                    <div className={styles.reviewsCount}>{reviewList.length} reviews</div>
                  </div>
                  <div className={styles.reviewsBreakdown}>
                    {[5,4,3,2,1].map(n => {
                      const c = reviewList.filter(r => (r.rating as number) === n).length;
                      return (
                        <div key={n} className={styles.ratingRow}>
                          <span className={styles.ratingNum}>{n}★</span>
                          <div className={styles.ratingBar}>
                            <div className={styles.ratingBarFill} style={{ width: `${reviewList.length ? (c/reviewList.length)*100 : 0}%` }} />
                          </div>
                          <span className={styles.ratingCount}>{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.reviewsList}>
                  {reviewList.map(r => {
                    const reviewer = r.reviewer as Record<string, string> | undefined;
                    const name = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "Anonymous";
                    return (
                      <div key={r.id as string} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewAvatar}>{name.charAt(0)}</div>
                          <div className={styles.reviewMeta}>
                            <div className={styles.reviewName}>{name}</div>
                            <div className={styles.reviewType}>{r.type as string}</div>
                          </div>
                          <div className={styles.reviewRight}>
                            <div className={styles.reviewStars}>{"★".repeat(r.rating as number)}</div>
                            <div className={styles.reviewDate}>{new Date(r.createdAt as string).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</div>
                          </div>
                        </div>
                        <p className={styles.reviewText}>"{r.text as string}"</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* VERIFICATION TAB */}
        {tab === "verification" && (
          <div className={styles.verificationWrap}>
            <div className={styles.verHeader}>
              <div className={styles.verScoreCircle}>
                <svg viewBox="0 0 100 100" className={styles.verScoreSvg}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#d4af37" strokeWidth="8"
                    strokeDasharray={`${(trustScore/100)*264} 264`}
                    strokeDashoffset="66" strokeLinecap="round"/>
                </svg>
                <div className={styles.verScoreNum}>{trustScore}</div>
              </div>
              <div className={styles.verHeaderInfo}>
                <h2 className={styles.verTitle}>Trust Score: {trustScore >= 80 ? "Excellent" : trustScore >= 60 ? "Good" : "Building"}</h2>
                <p className={styles.verSub}>
                  {(profile as Record<string,boolean>)?.isVerified
                    ? "This seller has completed identity verification."
                    : "This seller has not completed full verification yet."}
                </p>
              </div>
            </div>

            <div className={styles.verChecks}>
              {[
                { icon: "📧", label: "Email Verified",   done: (profile as Record<string, boolean>)?.emailVerified ?? false },
                { icon: "📱", label: "Phone Verified",   done: !!(profile as Record<string, unknown>)?.phone },
                { icon: "🪪", label: "Identity Verified", done: (profile as Record<string, boolean>)?.isVerified ?? false },
                { icon: "🔐", label: "MFA Enabled",      done: (profile as Record<string, boolean>)?.mfaEnabled ?? false },
              ].map(v => (
                <div key={v.label} className={[styles.verCheck, v.done ? styles.verCheckDone : styles.verCheckPending].join(" ")}>
                  <span className={styles.verCheckIcon}>{v.icon}</span>
                  <span className={styles.verCheckLabel}>{v.label}</span>
                  <span className={styles.verCheckStatus}>{v.done ? "✓ Passed" : "⏳ Pending"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contact modal */}
      {contactOpen && (
        <>
          <div className={styles.modalBackdrop} onClick={() => setContactOpen(false)} />
          <div className={styles.modal}>
            <button className={styles.modalClose} onClick={() => setContactOpen(false)}>✕</button>
            <h2 className={styles.modalTitle}>Message {fullName}</h2>
            <p className={styles.modalSub}>Your message goes directly to the seller.</p>
            <textarea className={styles.modalTextarea} rows={5} placeholder={`Hi ${(profile as Record<string,string>)?.firstName ?? "there"}, I'm interested in your property…`} />
            <button className={styles.modalSend} onClick={() => setContactOpen(false)}>Send Message →</button>
          </div>
        </>
      )}
    </div>
  );
}
