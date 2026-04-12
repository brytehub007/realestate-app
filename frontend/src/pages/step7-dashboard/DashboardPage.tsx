import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./DashboardPage.module.css";
import { useAuthStore } from "../../store/auth.store";
import { useUserListings } from "../../hooks/useListings";
import { useMyEscrows } from "../../hooks/useEscrow";
import { useConversations } from "../../hooks/useMessages";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:                   { label: "Active",             color: "#5a9e5a", bg: "rgba(90,158,90,.1)"   },
  under_escrow:             { label: "Under Escrow",       color: "#d4af37", bg: "rgba(212,175,55,.1)"  },
  draft:                    { label: "Draft",              color: "#888",    bg: "rgba(136,136,136,.1)"  },
  pending_review:           { label: "Pending Review",     color: "#e67e22", bg: "rgba(230,126,34,.1)"  },
  sold:                     { label: "Sold",               color: "#2980b9", bg: "rgba(41,128,185,.1)"  },
};

const ESCROW_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  initiated:                { label: "Initiated",          color: "#5a9e5a", bg: "rgba(90,158,90,.1)"   },
  commitment_paid:          { label: "Commitment Paid",    color: "#d4af37", bg: "rgba(212,175,55,.1)"  },
  verification_in_progress: { label: "In Progress",        color: "#d4af37", bg: "rgba(212,175,55,.1)"  },
  completed:                { label: "Completed",          color: "#5a9e5a", bg: "rgba(90,158,90,.1)"   },
  disputed:                 { label: "Disputed",           color: "#e74c3c", bg: "rgba(231,76,60,.1)"   },
};

function fmt(n: number) {
  if (n >= 1_000_000_000) return `₦${(n/1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `₦${(n/1_000_000).toFixed(1)}M`;
  return `₦${(n/1_000).toFixed(0)}k`;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 280; const H = 60;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill={`${color}18`} stroke="none" />
    </svg>
  );
}

type Tab = "listings" | "analytics" | "transactions" | "enquiries";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("listings");

  const { user } = useAuthStore();
  const { data: listingsData, isLoading: listingsLoading } = useUserListings(user?.id);
  const { data: escrows = [], isLoading: escrowsLoading } = useMyEscrows();
  const { data: conversations = [] } = useConversations();

  // listingsData may be array directly or { data: [...] }
  const listings: Record<string, unknown>[] =
    Array.isArray(listingsData)
      ? listingsData
      : Array.isArray((listingsData as Record<string, unknown>)?.data)
        ? (listingsData as Record<string, unknown[]>).data as Record<string, unknown>[]
        : [];

  const escrowList = Array.isArray(escrows) ? escrows : [];
  const convoList = Array.isArray(conversations) ? conversations : [];

  const unreadCount = (convoList as Record<string, number>[]).reduce((s, c) => s + (c.unread ?? 0), 0);
  const totalViews = (listings as Record<string, number>[]).reduce((s, l) => s + (l.views ?? 0), 0);
  const totalSaves = (listings as Record<string, number>[]).reduce((s, l) => s + (l.saves ?? 0), 0);
  const activeCount = (listings as Record<string, string>[]).filter(l => l.status === "active").length;

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "ME";

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.layout}>

          {/* ── LEFT SIDEBAR ── */}
          <aside className={styles.sidebar}>
            <div className={styles.profileCard}>
              <div className={styles.profileAvatar}>{initials}</div>
              <div className={styles.profileInfo}>
                <div className={styles.profileName}>{user?.firstName} {user?.lastName}</div>
                <div className={styles.profileAgency}>{user?.role}</div>
                <div className={styles.profileMeta}>
                  {user?.kycStatus === "verified" && <span className={styles.verifiedBadge}>✓ Verified</span>}
                  <span className={styles.tierBadge}>Trust: {user?.trustScore ?? 0}</span>
                </div>
                <div className={styles.profileJoined}>{user?.email}</div>
              </div>
              <Link to="/create-listing" className={styles.newListingBtn}>+ New Listing</Link>
            </div>

            <nav className={styles.nav}>
              {([
                ["listings",     "🏘️", "My Listings",  listings.length],
                ["analytics",    "📈", "Analytics",     null],
                ["transactions", "🔒", "Escrow",        escrowList.length],
                ["enquiries",    "💬", "Enquiries",     unreadCount || null],
              ] as [Tab, string, string, number | null][]).map(([key, icon, label, badge]) => (
                <button
                  key={key}
                  className={[styles.navItem, tab === key ? styles.navItemActive : ""].join(" ")}
                  onClick={() => setTab(key)}
                >
                  <span className={styles.navIcon}>{icon}</span>
                  <span className={styles.navLabel}>{label}</span>
                  {badge !== null && <span className={styles.navBadge}>{badge}</span>}
                </button>
              ))}
            </nav>

            <div className={styles.quickStats}>
              {[
                { label: "Active Listings", value: activeCount },
                { label: "Total Views",     value: totalViews.toLocaleString() },
                { label: "Total Saves",     value: totalSaves },
                { label: "Escrow Active",   value: (escrowList as Record<string, string>[]).filter(t => t.status !== "completed").length },
              ].map(({ label, value }) => (
                <div key={label} className={styles.quickStat}>
                  <span className={styles.quickStatVal}>{value}</span>
                  <span className={styles.quickStatLbl}>{label}</span>
                </div>
              ))}
            </div>

            <div className={styles.upgradeBox}>
              <p className={styles.upgradeTitle}>🚀 Go Premium</p>
              <p className={styles.upgradeText}>Homepage featured slot + email campaigns + full analytics. ₦25,000/mo.</p>
              <button className={styles.upgradeBtn}>Upgrade Now</button>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className={styles.main}>
            <div className={styles.mainHeader}>
              <h1 className={styles.mainTitle}>
                {tab === "listings"     && "My Listings"}
                {tab === "analytics"    && "Analytics"}
                {tab === "transactions" && "Escrow Transactions"}
                {tab === "enquiries"    && "Buyer Enquiries"}
              </h1>
              {tab === "listings" && (
                <Link to="/create-listing" className={styles.addBtn}>+ Add Listing</Link>
              )}
            </div>

            {/* ══ LISTINGS ══ */}
            {tab === "listings" && (
              <>
                {listingsLoading ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading listings…</div>
                ) : listings.length === 0 ? (
                  <div style={{ padding: "60px 0", textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>You haven't listed any properties yet.</p>
                    <Link to="/create-listing" className={styles.addBtn}>+ Create your first listing</Link>
                  </div>
                ) : (
                  <div className={styles.listingsTable}>
                    {listings.map(l => {
                      const st = STATUS_META[(l.status as string)] || STATUS_META.draft;
                      const imgs = l.images as Record<string, string>[] | undefined;
                      const coverImg = imgs?.[0]?.url
                        ?? "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&q=70";
                      const priceObj = l.price as Record<string, unknown> | number | undefined;
                      const price = typeof priceObj === "number"
                        ? priceObj
                        : (priceObj as Record<string, number>)?.amount
                          ?? (priceObj as Record<string, number>)?.minAmount ?? 0;
                      return (
                        <div key={l.id as string} className={styles.listingRow}>
                          <img src={coverImg} alt={l.title as string} className={styles.listingImg} />
                          <div className={styles.listingInfo}>
                            <p className={styles.listingTitle}>{l.title as string}</p>
                            <p className={styles.listingPrice}>{fmt(price)}</p>
                            <div className={styles.listingMeta}>
                              <span className={styles.listingTier}>{l.tier as string}</span>
                              <span className={styles.listingDate}>
                                Listed {new Date(l.createdAt as string).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          </div>
                          <div className={styles.listingStats}>
                            <div className={styles.lStat}><strong>{l.views as number}</strong><span>Views</span></div>
                            <div className={styles.lStat}><strong>{l.saves as number}</strong><span>Saves</span></div>
                          </div>
                          <span className={styles.listingStatus} style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}44` }}>
                            {st.label}
                          </span>
                          <div className={styles.listingActions}>
                            <Link to={`/listings/${l.slug ?? l.id}`} className={styles.lActionBtn}>View</Link>
                            {(l.status as string) === "draft" && <button className={styles.lActionBtnGold}>Publish</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ══ ANALYTICS ══ */}
            {tab === "analytics" && (
              <div className={styles.analyticsGrid}>
                <div className={styles.chartCard}>
                  <div className={styles.chartHeader}>
                    <div>
                      <p className={styles.chartLabel}>Views by Listing</p>
                      <p className={styles.chartVal}>{totalViews.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className={styles.chartArea}>
                    <Sparkline data={(listings as Record<string, number>[]).map(l => l.views ?? 0)} color="#d4af37" />
                  </div>
                </div>
                <div className={styles.chartCard}>
                  <div className={styles.chartHeader}>
                    <div>
                      <p className={styles.chartLabel}>Saves by Listing</p>
                      <p className={styles.chartVal}>{totalSaves}</p>
                    </div>
                  </div>
                  <div className={styles.chartArea}>
                    <Sparkline data={(listings as Record<string, number>[]).map(l => l.saves ?? 0)} color="#5a9e5a" />
                  </div>
                </div>

                <div className={styles.breakdownCard}>
                  <p className={styles.breakdownTitle}>Listing Performance</p>
                  {listings.filter(l => l.status !== "draft").map(l => (
                    <div key={l.id as string} className={styles.breakdownRow}>
                      <div className={styles.breakdownInfo}>
                        <p className={styles.breakdownName}>{(l.title as string).split("—")[0].trim()}</p>
                        <div className={styles.breakdownBar}>
                          <div className={styles.breakdownBarFill} style={{ width: `${Math.min(((l.views as number) / 1000) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <div className={styles.breakdownNums}>
                        <span>{(l.views as number).toLocaleString()} views</span>
                        <span>{l.saves as number} saves</span>
                      </div>
                    </div>
                  ))}
                  {listings.length === 0 && <p style={{ color: "var(--text-muted)", padding: "16px 0" }}>No listings to analyse yet.</p>}
                </div>
              </div>
            )}

            {/* ══ TRANSACTIONS ══ */}
            {tab === "transactions" && (
              <>
                {escrowsLoading ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading transactions…</div>
                ) : escrowList.length === 0 ? (
                  <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>No escrow transactions yet.</div>
                ) : (
                  <div className={styles.txList}>
                    {(escrowList as Record<string, unknown>[]).map(tx => {
                      const st = ESCROW_STATUS_META[(tx.status as string)] || ESCROW_STATUS_META.initiated;
                      const listing = tx.listing as Record<string, string> | undefined;
                      const buyer = tx.buyer as Record<string, string> | undefined;
                      const phase = (tx.currentPhase as number) ?? 1;
                      return (
                        <div key={tx.id as string} className={styles.txRow}>
                          <div className={styles.txLeft}>
                            <p className={styles.txId}>{(tx.id as string).slice(0, 8).toUpperCase()}</p>
                            <p className={styles.txProp}>{listing?.title ?? "Property"}</p>
                            {buyer && <p className={styles.txBuyer}>Buyer: {buyer.firstName} {buyer.lastName}</p>}
                          </div>
                          <div className={styles.txMid}>
                            <p className={styles.txAmt}>{fmt(tx.amount as number)}</p>
                            <div className={styles.txPhase}>
                              {[1,2,3].map(p => (
                                <div key={p} className={[styles.txPhaseStep, p <= phase ? styles.txPhaseStepDone : ""].join(" ")}>{p}</div>
                              ))}
                            </div>
                            <p className={styles.txPhaseLbl}>Phase {phase} of 3</p>
                          </div>
                          <div className={styles.txRight}>
                            <span className={styles.txStatus} style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}44` }}>{st.label}</span>
                            <p className={styles.txDate}>{new Date(tx.createdAt as string).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                            <Link to={`/escrow/${tx.id}`} className={styles.txViewBtn}>View Details →</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ══ ENQUIRIES ══ */}
            {tab === "enquiries" && (
              <>
                {convoList.length === 0 ? (
                  <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>No buyer enquiries yet.</div>
                ) : (
                  <div className={styles.enquiriesList}>
                    {(convoList as Record<string, unknown>[]).map(c => {
                      const parts = c.participants as Record<string, string>[] | undefined;
                      const name = parts?.[0] ? `${parts[0].firstName} ${parts[0].lastName}` : "Buyer";
                      const listing = c.listing as Record<string, string> | undefined;
                      return (
                        <div key={c.id as string} className={[styles.enquiryRow, (c.unread as number) > 0 ? styles.enquiryUnread : ""].join(" ")}>
                          <div className={styles.enquiryAvatar}>{name.charAt(0)}</div>
                          <div className={styles.enquiryBody}>
                            <div className={styles.enquiryTop}>
                              <span className={styles.enquiryName}>{name}</span>
                              <span className={styles.enquiryTime}>{new Date(c.updatedAt as string).toLocaleDateString("en-NG")}</span>
                            </div>
                            {listing && <p className={styles.enquiryProp}>{listing.title}</p>}
                            <p className={styles.enquiryMsg}>{c.lastMessage as string}</p>
                          </div>
                          <div className={styles.enquiryActions}>
                            {(c.unread as number) > 0 && <span className={styles.unreadDot} />}
                            <Link to="/messages" className={styles.replyBtn}>Reply</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
