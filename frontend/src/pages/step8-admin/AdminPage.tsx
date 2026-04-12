import { useState } from "react";
import toast from "react-hot-toast";
import styles from "./AdminPage.module.css";
import {
  useAdminDashboard, useAdminEscrows, useApproveListing, useRejectListing,
  useSuspendUser, useVerifyDocument, useResolveReport,
} from "../../hooks/useAdmin";

const RISK_ICON: Record<string, string> = {
  land_grabbers: "⚠️", flood_prone: "🌊", disputed_title: "⚖️",
  government_acquisition: "🏛️", demolition_notice: "🔨", security_risk: "🔓",
};

const RECENT_ACTIVITY = [
  { icon: "✅", text: "Listing approved: '4-Bed Duplex, Ikoyi'", time: "2 min ago", type: "success" },
  { icon: "🔒", text: "New escrow TX initiated — ₦180M", time: "14 min ago", type: "info" },
  { icon: "🚨", text: "Listing flagged by 3 users", time: "31 min ago", type: "warning" },
  { icon: "👤", text: "New verified seller registered", time: "1h ago", type: "success" },
  { icon: "⚠️", text: "Area report verified: Flood zone, Ikorodu", time: "2h ago", type: "info" },
];

type Section = "overview" | "listings" | "users" | "reports" | "escrow";

function fmt(n: number) {
  if (n >= 1_000_000_000) return `₦${(n/1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `₦${(n/1_000_000).toFixed(0)}M`;
  return `₦${(n/1_000).toFixed(0)}k`;
}

export default function AdminPage() {
  const [section, setSection] = useState<Section>("overview");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<{ id: string; type: "listing" | "report" } | null>(null);

  const { data: dashboardData, isLoading } = useAdminDashboard();
  const { data: escrowData = [] } = useAdminEscrows();
  const approveListing  = useApproveListing();
  const rejectListing   = useRejectListing();
  const suspendUser     = useSuspendUser();
  const verifyDoc       = useVerifyDocument();
  const resolveReport   = useResolveReport();

  const stats             = dashboardData?.stats ?? {};
  const pendingListings   = dashboardData?.recentListings ?? [];
  const pendingReports    = dashboardData?.recentReports  ?? [];
  const escrows           = Array.isArray(escrowData) ? escrowData : [];

  const PLATFORM_STATS = [
    { label: "Total Users",     value: stats.totalUsers?.toLocaleString()    ?? "—", delta: "",           up: true,  icon: "👥" },
    { label: "Active Listings", value: stats.activeListings?.toLocaleString() ?? "—", delta: "",          up: true,  icon: "🏘️" },
    { label: "Active Escrows",  value: stats.activeEscrows?.toLocaleString()  ?? "—", delta: "",          up: true,  icon: "🔒" },
    { label: "Total Revenue",   value: stats.totalRevenue ? fmt(stats.totalRevenue) : "—", delta: "",     up: true,  icon: "💰" },
    { label: "Pending Review",  value: pendingListings.length.toString(),               delta: "Listings", up: false, icon: "⏳" },
    { label: "Open Reports",    value: pendingReports.length.toString(),                delta: "Reports",  up: false, icon: "⚠️" },
  ];

  function handleApproveListing(id: string) {
    approveListing.mutate(id, {
      onSuccess: () => toast.success("Listing approved"),
      onError:   () => toast.error("Action failed"),
    });
  }
  function handleRejectListing(id: string) {
    setShowRejectModal({ id, type: "listing" });
  }
  function handleSuspendUser(id: string) {
    suspendUser.mutate(id, {
      onSuccess: () => toast.success("User suspended"),
      onError:   () => toast.error("Action failed"),
    });
  }
  function handleResolveReport(id: string) {
    resolveReport.mutate(id, {
      onSuccess: () => toast.success("Report resolved"),
      onError:   () => toast.error("Action failed"),
    });
  }

  function confirmReject() {
    if (!showRejectModal || !rejectReason) return;
    if (showRejectModal.type === "listing") {
      rejectListing.mutate(showRejectModal.id, {
        onSuccess: () => toast.success("Listing rejected"),
        onError:   () => toast.error("Action failed"),
      });
    }
    setShowRejectModal(null);
    setRejectReason("");
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className="container">
          <div className={styles.topBarInner}>
            <div className={styles.topBarLeft}>
              <span className={styles.adminBadge}>⚙️ Admin Panel</span>
              <span className={styles.adminSep}>·</span>
              <span className={styles.adminEnv}>shelters-horizon.ng</span>
            </div>
            <div className={styles.topBarRight}>
              {pendingListings.length + pendingReports.length > 0 && (
                <div className={styles.pendingAlert}>
                  🔔 {pendingListings.length + pendingReports.length} pending actions
                </div>
              )}
              <div className={styles.adminAvatar}>SA</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>

          {/* ── LEFT NAV ── */}
          <aside className={styles.nav}>
            {([
              ["overview",  "📊", "Overview",         null],
              ["listings",  "🏘️", "Listing Review",    pendingListings.length || null],
              ["users",     "👥", "User Verification", null],
              ["reports",   "⚠️", "Area Reports",      pendingReports.length  || null],
              ["escrow",    "🔒", "Escrow Monitor",    null],
            ] as [Section, string, string, number | null][]).map(([key, icon, label, badge]) => (
              <button
                key={key}
                className={[styles.navItem, section === key ? styles.navItemActive : ""].join(" ")}
                onClick={() => setSection(key)}
              >
                <span className={styles.navIcon}>{icon}</span>
                <span className={styles.navLabel}>{label}</span>
                {badge !== null && badge > 0 && (
                  <span className={styles.navBadge}>{badge}</span>
                )}
              </button>
            ))}

            <div className={styles.navDivider} />
            <div className={styles.systemHealth}>
              <p className={styles.healthTitle}>System Health</p>
              {[
                { label: "API",          status: "ok"   },
                { label: "Mapbox",       status: "ok"   },
                { label: "Flutterwave",  status: "ok"   },
                { label: "Paystack",     status: "ok"   },
                { label: "Email",        status: "warn" },
              ].map(s => (
                <div key={s.label} className={styles.healthItem}>
                  <span className={styles.healthDot} style={{ background: s.status === "ok" ? "#5a9e5a" : "#e67e22" }} />
                  <span className={styles.healthLabel}>{s.label}</span>
                  <span className={styles.healthStatus} style={{ color: s.status === "ok" ? "#5a9e5a" : "#e67e22" }}>
                    {s.status === "ok" ? "Operational" : "Degraded"}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          {/* ── MAIN ── */}
          <main className={styles.main}>

            {/* ══ OVERVIEW ══ */}
            {section === "overview" && (
              <>
                <h1 className={styles.sectionTitle}>Platform Overview</h1>
                {isLoading ? (
                  <div style={{ padding: "40px 0", color: "var(--text-muted)", textAlign: "center" }}>Loading dashboard…</div>
                ) : (
                  <>
                    <div className={styles.statsGrid}>
                      {PLATFORM_STATS.map(s => (
                        <div key={s.label} className={styles.statCard}>
                          <div className={styles.statIcon}>{s.icon}</div>
                          <div className={styles.statBody}>
                            <p className={styles.statLabel}>{s.label}</p>
                            <p className={styles.statValue}>{s.value}</p>
                            {s.delta && <p className={styles.statDelta} style={{ color: s.up ? "var(--clr-green-500)" : "#e74c3c" }}>
                              {s.up ? "↑" : "⚑"} {s.delta}
                            </p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={styles.overviewGrid}>
                      <div className={styles.activityCard}>
                        <p className={styles.cardTitle}>Recent Activity</p>
                        <div className={styles.activityList}>
                          {RECENT_ACTIVITY.map((a, i) => (
                            <div key={i} className={styles.activityItem}>
                              <span className={styles.activityIcon}
                                style={{ background: a.type === "success" ? "rgba(90,158,90,.12)" : a.type === "warning" ? "rgba(230,126,34,.12)" : "rgba(212,175,55,.08)" }}>
                                {a.icon}
                              </span>
                              <div className={styles.activityBody}>
                                <p className={styles.activityText}>{a.text}</p>
                                <p className={styles.activityTime}>{a.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={styles.pendingCard}>
                        <p className={styles.cardTitle}>Pending Actions</p>
                        <div className={styles.pendingList}>
                          {[
                            { label: "Listings to review", count: pendingListings.length, section: "listings" as Section, color: "#d4af37" },
                            { label: "Area reports",        count: pendingReports.length,  section: "reports"  as Section, color: "#e74c3c" },
                          ].map(p => (
                            <button key={p.label} className={styles.pendingItem} onClick={() => setSection(p.section)}>
                              <div className={styles.pendingItemLeft}>
                                <div className={styles.pendingCount} style={{ background: `${p.color}1a`, color: p.color, border: `1px solid ${p.color}44` }}>
                                  {p.count}
                                </div>
                                <span className={styles.pendingLabel}>{p.label}</span>
                              </div>
                              <span className={styles.pendingArrow} style={{ color: p.color }}>→</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ══ LISTING REVIEW ══ */}
            {section === "listings" && (
              <>
                <h1 className={styles.sectionTitle}>Listing Review</h1>
                <p className={styles.sectionSub}>{pendingListings.length} listings awaiting review.</p>
                {pendingListings.length === 0 && (
                  <div className={styles.emptyState}><span className={styles.emptyIcon}>✅</span><p>All listings reviewed!</p></div>
                )}
                <div className={styles.reviewList}>
                  {(pendingListings as Record<string, unknown>[]).map(l => (
                    <div key={l.id as string} className={styles.reviewCard}>
                      <div className={styles.reviewCardTop}>
                        <div>
                          <p className={styles.reviewCardId}>{(l.id as string).slice(0, 8)}</p>
                          <p className={styles.reviewCardTitle}>{l.title as string}</p>
                          <p className={styles.reviewCardSeller}>Seller: <strong>{(l.owner as Record<string,string>)?.firstName} {(l.owner as Record<string,string>)?.lastName}</strong></p>
                        </div>
                        <div className={styles.reviewCardMeta}>
                          <span className={styles.reviewTierBadge}>{l.tier as string}</span>
                          <span className={styles.reviewCatBadge}>{l.category as string}</span>
                        </div>
                      </div>
                      <div className={styles.reviewCardDocs}>
                        <span className={styles.reviewDate}>Submitted: {new Date(l.createdAt as string).toLocaleDateString("en-NG")}</span>
                      </div>
                      <div className={styles.reviewActions}>
                        <div style={{ flex: 1 }} />
                        <button className={styles.rejectBtn} onClick={() => handleRejectListing(l.id as string)}>✕ Reject</button>
                        <button className={styles.approveBtn} onClick={() => handleApproveListing(l.id as string)}>✓ Approve & Publish</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══ USER VERIFICATION ══ */}
            {section === "users" && (
              <>
                <h1 className={styles.sectionTitle}>User Verification</h1>
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>👥</span>
                  <p>User verification queue managed via API. No pending KYC submissions.</p>
                </div>
              </>
            )}

            {/* ══ AREA REPORTS ══ */}
            {section === "reports" && (
              <>
                <h1 className={styles.sectionTitle}>Area Report Review</h1>
                <p className={styles.sectionSub}>{pendingReports.length} reports awaiting verification.</p>
                {pendingReports.length === 0 && (
                  <div className={styles.emptyState}><span className={styles.emptyIcon}>✅</span><p>All area reports reviewed!</p></div>
                )}
                <div className={styles.reviewList}>
                  {(pendingReports as Record<string, unknown>[]).map(r => (
                    <div key={r.id as string} className={styles.reviewCard}>
                      <div className={styles.reviewCardTop}>
                        <div>
                          <div className={styles.reportRiskTag}>
                            {RISK_ICON[(r.riskType as string)] || "📌"} {(r.riskType as string).replace(/_/g, " ")}
                          </div>
                          <p className={styles.reviewCardTitle}>{r.description as string}</p>
                          <p className={styles.reviewCardSeller}>📍 {r.lga as string}, {r.state as string}</p>
                        </div>
                        <div className={styles.reviewCardMeta}>
                          <span className={styles.upvoteCount}>👍 {r.upvotes as number}</span>
                          <span className={styles.reviewDate}>{new Date(r.createdAt as string).toLocaleDateString("en-NG")}</span>
                        </div>
                      </div>
                      <div className={styles.reviewActions}>
                        <div style={{ flex: 1 }} />
                        <button className={styles.approveBtn} onClick={() => handleResolveReport(r.id as string)}>✓ Resolve</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══ ESCROW MONITOR ══ */}
            {section === "escrow" && (
              <>
                <h1 className={styles.sectionTitle}>Escrow Monitor</h1>
                <div className={styles.escrowTable}>
                  <div className={styles.escrowTableHead}>
                    <span>ID</span><span>Property</span><span>Amount</span><span>Phase</span><span>Status</span><span>Action</span>
                  </div>
                  {escrows.length === 0 && (
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No escrow transactions.</div>
                  )}
                  {(escrows as Record<string, unknown>[]).map(tx => {
                    const phase = (tx.currentPhase as number) ?? 1;
                    const status = tx.status as string;
                    return (
                      <div key={tx.id as string} className={styles.escrowTableRow}>
                        <span className={styles.escrowTxId}>{(tx.id as string).slice(0, 8).toUpperCase()}</span>
                        <span className={styles.escrowProp}>{(tx.listing as Record<string,string>)?.title ?? "Property"}</span>
                        <span className={styles.escrowAmt}>{fmt(tx.amount as number)}</span>
                        <div className={styles.escrowPhase}>
                          {[1,2,3].map(p => <div key={p} className={[styles.escrowPhaseStep, p <= phase ? styles.escrowPhaseStepDone : ""].join(" ")} />)}
                          <span>P{phase}</span>
                        </div>
                        <span className={styles.escrowStatus}
                          style={{
                            color: status === "completed" ? "#5a9e5a" : status === "disputed" ? "#e74c3c" : "#d4af37",
                            background: status === "completed" ? "rgba(90,158,90,.1)" : status === "disputed" ? "rgba(231,76,60,.1)" : "rgba(212,175,55,.1)",
                          }}>
                          {status.replace(/_/g, " ")}
                        </span>
                        <button className={styles.escrowViewBtn}>View →</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {showRejectModal && (
        <>
          <div className={styles.backdrop} onClick={() => setShowRejectModal(null)} />
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Reject Listing</h2>
            <p className={styles.modalText}>Please provide a reason. The seller will be notified via email.</p>
            <select className={styles.modalSelect} value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
              <option value="">Select reason...</option>
              <option value="doc_fraud">Document appears fraudulent</option>
              <option value="duplicate">Duplicate listing</option>
              <option value="prohibited">Prohibited property type</option>
              <option value="incomplete">Incomplete information</option>
              <option value="misleading">Misleading / false information</option>
            </select>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setShowRejectModal(null)}>Cancel</button>
              <button className={styles.modalReject} disabled={!rejectReason} onClick={confirmReject}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
