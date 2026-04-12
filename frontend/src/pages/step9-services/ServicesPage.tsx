import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import styles from "./ServicesPage.module.css";
import { useServiceProviders, useMyServiceRequests, useServiceRequest, type ServiceProvider } from "../../hooks/useServices";

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceType = "all" | "surveyor" | "lawyer" | "valuer" | "inspector" | "agent" | "architect";
type ModalStep = 1 | 2 | 3 | "success";
type SortKey = "rating" | "jobs" | "price_asc" | "price_desc";
type Tab = "browse" | "my_requests";

// ── Static metadata ───────────────────────────────────────────────────────────

const SERVICE_TYPES: { key: ServiceType; label: string; icon: string; desc: string }[] = [
  { key: "all",       label: "All Services",       icon: "🔍", desc: "Browse all" },
  { key: "surveyor",  label: "Land Surveyor",       icon: "📏", desc: "Boundary, topographic" },
  { key: "lawyer",    label: "Property Lawyer",     icon: "⚖️", desc: "Title, conveyancing" },
  { key: "valuer",    label: "Valuation Expert",    icon: "🏷️", desc: "Residential, commercial" },
  { key: "inspector", label: "Building Inspector",  icon: "🔬", desc: "Structural, MEP" },
  { key: "agent",     label: "Licensed Agent",      icon: "🤝", desc: "Buy, sell, lease" },
  { key: "architect", label: "Architect / Planner", icon: "📐", desc: "Design, approvals" },
];


const TYPE_ICON: Record<string, string> = {
  surveyor: "📏", lawyer: "⚖️", valuer: "🏷️",
  inspector: "🔬", agent: "🤝", architect: "📐",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  in_progress: { label: "In Progress", color: "#d4af37", bg: "rgba(212,175,55,.1)", border: "rgba(212,175,55,.3)" },
  completed:   { label: "Completed",   color: "#5a9e5a", bg: "rgba(90,158,90,.1)",  border: "rgba(90,158,90,.3)"  },
  pending:     { label: "Pending",     color: "#e67e22", bg: "rgba(230,126,34,.1)", border: "rgba(230,126,34,.3)" },
  cancelled:   { label: "Cancelled",  color: "#888",    bg: "rgba(136,136,136,.1)", border: "rgba(136,136,136,.3)" },
};

function fmtPrice(n: number) {
  if (n === 0) return "Commission";
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  return `₦${(n / 1_000).toFixed(0)}k`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [tab, setTab]             = useState<Tab>("browse");
  const [filterType, setFilterType] = useState<ServiceType>("all");
  const [searchQ, setSearchQ]     = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortKey, setSortKey]     = useState<SortKey>("rating");
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>(1);
  const [requestProvider, setRequestProvider] = useState<ServiceProvider | null>(null);

  // ── Live API data ──────────────────────────────────────────────────────────
  const { data: providersData = [], isLoading: providersLoading } = useServiceProviders(
    filterType !== "all" ? filterType : undefined
  );
  const { data: myRequestsData = [] } = useMyServiceRequests();
  const serviceRequest = useServiceRequest();

  const PROVIDERS: ServiceProvider[] = Array.isArray(providersData) ? providersData : [];
  const MY_REQUESTS = Array.isArray(myRequestsData) ? myRequestsData as Record<string, unknown>[] : [];
  const [fProperty, setFProperty] = useState("");
  const [fTxId, setFTxId]         = useState("");
  const [fDetails, setFDetails]   = useState("");
  const [fUrgency, setFUrgency]   = useState("standard");
  const [fPayment, setFPayment]   = useState("escrow");
  const [fDocName, setFDocName]   = useState("");

  const filtered = useMemo(() => {
    let list = PROVIDERS.filter(p => {
      if (availableOnly && !p.available) return false;
      const q = searchQ.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.location.toLowerCase().includes(q) && !p.specialties.some((s: string) => s.toLowerCase().includes(q))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortKey === "rating")     return b.rating - a.rating;
      if (sortKey === "jobs")       return b.completedJobs - a.completedJobs;
      if (sortKey === "price_asc")  return a.priceFrom - b.priceFrom;
      if (sortKey === "price_desc") return b.priceFrom - a.priceFrom;
      return 0;
    });
    return list;
  }, [PROVIDERS, searchQ, availableOnly, sortKey]);

  function openRequest(provider: ServiceProvider) {
    setRequestProvider(provider);
    setModalStep(1);
    setFProperty(""); setFTxId(""); setFDetails(""); setFUrgency("standard"); setFPayment("escrow"); setFDocName("");
    setShowRequestModal(true);
    setSelectedProvider(null);
  }

  const step1Valid = fProperty.trim().length > 0 && fDetails.trim().length >= 20;

  const surchargeLabel = fUrgency === "express" ? "+25%" : fUrgency === "urgent" ? "+60%" : "";

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <header className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroGrain} />
        <div className="container">
          <div className={styles.heroInner}>
            <div className={styles.heroLeft}>
              <span className={styles.heroEyebrow}>Professional Services Marketplace</span>
              <h1 className={styles.heroTitle}>
                Verified Experts.<br /><em>Protected Payments.</em>
              </h1>
              <p className={styles.heroSub}>
                Every professional is licensed, insured, and vetted by our compliance team. Hire directly from your escrow — fees held safely until you approve the delivered report.
              </p>
              <div className={styles.heroCtas}>
                <button className={styles.heroPrimary} onClick={() => setTab("browse")}>Browse Professionals</button>
                <button className={styles.heroSecondary} onClick={() => setTab("my_requests")}>My Requests</button>
              </div>
            </div>
            <div className={styles.heroRight}>
              <div className={styles.heroStats}>
                {[
                  { num: "48", lbl: "Verified\nProfessionals" },
                  { num: "2,100+", lbl: "Jobs\nCompleted" },
                  { num: "4.8★", lbl: "Average\nRating" },
                  { num: "100%", lbl: "Escrow\nProtected" },
                ].map(({ num, lbl }) => (
                  <div key={num} className={styles.heroStat}>
                    <span className={styles.heroStatNum}>{num}</span>
                    <span className={styles.heroStatLbl}>{lbl}</span>
                  </div>
                ))}
              </div>
              <div className={styles.heroTrustBadge}>
                <span className={styles.heroTrustIcon}>🔒</span>
                <div>
                  <p className={styles.heroTrustTitle}>All fees held in escrow</p>
                  <p className={styles.heroTrustSub}>Released only when you approve the delivered report</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className={styles.tabBar}>
        <div className="container">
          <div className={styles.tabBarInner}>
            <button className={[styles.tabBtn, tab === "browse" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("browse")}>
              Browse Professionals
            </button>
            <button className={[styles.tabBtn, tab === "my_requests" ? styles.tabActive : ""].join(" ")} onClick={() => setTab("my_requests")}>
              My Service Requests
              <span className={styles.tabBadge}>{MY_REQUESTS.length}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container">

        {/* ══ BROWSE ══ */}
        {tab === "browse" && (
          <div className={styles.browseWrap}>

            {/* Service type grid */}
            <div className={styles.typeGrid}>
              {SERVICE_TYPES.map(st => (
                <button
                  key={st.key}
                  className={[styles.typeCard, filterType === st.key ? styles.typeCardActive : ""].join(" ")}
                  onClick={() => setFilterType(st.key)}
                >
                  <span className={styles.typeCardIcon}>{st.icon}</span>
                  <span className={styles.typeCardLabel}>{st.label}</span>
                  <span className={styles.typeCardDesc}>{st.desc}</span>
                </button>
              ))}
            </div>

            {/* Search + Sort + Filter bar */}
            <div className={styles.controlBar}>
              <div className={styles.searchWrap}>
                <span className={styles.searchIconEl}>🔍</span>
                <input
                  className={styles.searchInput}
                  placeholder="Search by name, city, or specialty…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                />
                {searchQ && <button className={styles.searchClear} onClick={() => setSearchQ("")}>✕</button>}
              </div>
              <div className={styles.controlRight}>
                <label className={styles.availToggle}>
                  <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} className={styles.availCheckbox} />
                  <span className={styles.availToggleTrack}>
                    <span className={styles.availToggleThumb} />
                  </span>
                  Available now
                </label>
                <select className={styles.sortSelect} value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
                  <option value="rating">Top Rated</option>
                  <option value="jobs">Most Experienced</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                </select>
              </div>
            </div>

            <div className={styles.resultMeta}>
              <span>{filtered.length} professional{filtered.length !== 1 ? "s" : ""} found</span>
              {(filterType !== "all" || searchQ || availableOnly) && (
                <button className={styles.clearFilters} onClick={() => { setFilterType("all"); setSearchQ(""); setAvailableOnly(false); }}>
                  Clear filters ✕
                </button>
              )}
            </div>

            {/* Provider cards */}
            {providersLoading ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading professionals…</div>
            ) : filtered.length > 0 ? (
              <div className={styles.providerGrid}>
                {filtered.map((p, i) => (
                  <div
                    key={p.id}
                    className={[styles.providerCard, p.featured ? styles.providerCardFeatured : "", !p.available ? styles.providerCardUnavailable : ""].join(" ")}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {p.featured && <div className={styles.featuredRibbon}>Featured</div>}
                    {!p.available && <div className={styles.unavailableTag}>Unavailable</div>}

                    <div className={styles.pcHeader}>
                      <div className={styles.pcAvatar} style={{ background: p.avatarColor }}>{p.avatar}</div>
                      <div className={styles.pcHeaderInfo}>
                        <div className={styles.pcType}>{TYPE_ICON[p.type]} {SERVICE_TYPES.find(s => s.key === p.type)?.label}</div>
                        <h3 className={styles.pcName}>{p.name}</h3>
                        <p className={styles.pcCompany}>{p.company}</p>
                        <p className={styles.pcLoc}>📍 {p.location}</p>
                      </div>
                      {p.verified && <div className={styles.verifiedPill}>✓ Verified</div>}
                    </div>

                    <div className={styles.pcMetaRow}>
                      <div className={styles.pcMeta}>
                        <span className={styles.pcMetaVal}>★ {p.rating}</span>
                        <span className={styles.pcMetaLbl}>{p.reviews} reviews</span>
                      </div>
                      <div className={styles.pcMetaDivider} />
                      <div className={styles.pcMeta}>
                        <span className={styles.pcMetaVal}>{p.completedJobs}</span>
                        <span className={styles.pcMetaLbl}>jobs done</span>
                      </div>
                      <div className={styles.pcMetaDivider} />
                      <div className={styles.pcMeta}>
                        <span className={styles.pcMetaVal}>{p.responseTime}</span>
                        <span className={styles.pcMetaLbl}>response</span>
                      </div>
                      <div className={styles.pcMetaDivider} />
                      <div className={styles.pcMeta}>
                        <span className={styles.pcMetaVal}>{p.turnaround}</span>
                        <span className={styles.pcMetaLbl}>turnaround</span>
                      </div>
                    </div>

                    <p className={styles.pcBio}>{p.bio}</p>

                    <div className={styles.pcSpecialties}>
                      {p.specialties.map(s => <span key={s} className={styles.pcTag}>{s}</span>)}
                    </div>

                    <div className={styles.pcCerts}>
                      {p.certifications.slice(0, 2).map(c => (
                        <span key={c} className={styles.pcCert}>🏅 {c}</span>
                      ))}
                      {p.certifications.length > 2 && (
                        <span className={styles.pcCertMore}>+{p.certifications.length - 2} more</span>
                      )}
                    </div>

                    <div className={styles.pcFooter}>
                      <div className={styles.pcPriceBlock}>
                        <span className={styles.pcPriceLbl}>From</span>
                        <span className={styles.pcPrice}>{fmtPrice(p.priceFrom)}</span>
                        {p.priceTo > 0 && <span className={styles.pcPriceTo}>– {fmtPrice(p.priceTo)}</span>}
                      </div>
                      <div className={styles.pcActions}>
                        <button className={styles.pcBtnView} onClick={() => setSelectedProvider(p)}>
                          View Profile
                        </button>
                        <button
                          className={[styles.pcBtnHire, !p.available ? styles.pcBtnHireOff : ""].join(" ")}
                          onClick={() => p.available && openRequest(p)}
                          disabled={!p.available}
                        >
                          {p.available ? "Hire Now →" : "Unavailable"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🔍</span>
                <p className={styles.emptyTitle}>No professionals found</p>
                <p className={styles.emptySub}>Try clearing your filters or broadening your search.</p>
                <button className={styles.emptyCta} onClick={() => { setFilterType("all"); setSearchQ(""); setAvailableOnly(false); }}>
                  Clear all filters
                </button>
              </div>
            )}

            {/* How it works */}
            <div className={styles.hiwSection}>
              <h2 className={styles.hiwTitle}>How the Service Marketplace Works</h2>
              <div className={styles.hiwGrid}>
                {[
                  { n: "01", icon: "🔍", title: "Browse & Compare", body: "Filter by profession, city, or specialty. Compare ratings, certifications, turnaround times, and price ranges side by side." },
                  { n: "02", icon: "📋", title: "Submit Your Request", body: "Select your professional, describe the property and scope of work, and link your escrow transaction for seamless payment." },
                  { n: "03", icon: "🔒", title: "Payment Held in Escrow", body: "Service fees are deducted from your Phase 2 escrow funds and held securely — the professional receives nothing until you're satisfied." },
                  { n: "04", icon: "📄", title: "Approve & Release", body: "The professional delivers their report directly to your dashboard. Review it, request revisions if needed, then approve to release payment." },
                ].map(step => (
                  <div key={step.n} className={styles.hiwCard}>
                    <div className={styles.hiwNum}>{step.n}</div>
                    <div className={styles.hiwIcon}>{step.icon}</div>
                    <h3 className={styles.hiwCardTitle}>{step.title}</h3>
                    <p className={styles.hiwCardBody}>{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ MY REQUESTS ══ */}
        {tab === "my_requests" && (
          <div className={styles.requestsWrap}>
            <div className={styles.requestsTopBar}>
              <div>
                <h2 className={styles.requestsTitle}>My Service Requests</h2>
                <p className={styles.requestsSub}>{MY_REQUESTS.filter(r => r.status === "in_progress").length} active · {MY_REQUESTS.filter(r => r.status === "completed").length} completed</p>
              </div>
              <button className={styles.newRequestBtn} onClick={() => setTab("browse")}>+ New Request</button>
            </div>

            <div className={styles.requestsList}>
              {MY_REQUESTS.length === 0 && (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  <p>No service requests yet.</p>
                  <button className={styles.newRequestBtn} style={{ marginTop: 16 }} onClick={() => setTab("browse")}>Browse Professionals →</button>
                </div>
              )}
              {MY_REQUESTS.map(req => {
                const status = (req.status as string) ?? "pending";
                const st = STATUS_META[status] || STATUS_META.pending;
                const reqType = (req.type as string) ?? "";
                const typeInfo = SERVICE_TYPES.find(s => s.key === reqType);
                const providerObj = req.provider as Record<string, string> | undefined;
                const providerName = providerObj?.name ?? (req.providerId as string ?? "Provider");
                const providerCompany = providerObj?.company ?? "";
                const location = (req.location as string) ?? "";
                const escrowId = (req.escrowTransactionId as string) ?? "";
                const amount = (req.budget as number) ?? 0;
                const reportReady = !!(req.reportUrl as string);
                return (
                  <div key={req.id as string} className={styles.requestCard}>
                    <div className={styles.rcIcon}>{TYPE_ICON[reqType] ?? "🔧"}</div>
                    <div className={styles.rcBody}>
                      <div className={styles.rcTopRow}>
                        <div>
                          <span className={styles.rcType}>{typeInfo?.label ?? reqType}</span>
                          <h3 className={styles.rcProvider}>{providerName}</h3>
                          {providerCompany && <p className={styles.rcCompany}>{providerCompany}</p>}
                        </div>
                        <span className={styles.rcStatus} style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                      </div>

                      <div className={styles.rcPropRow}>
                        <span className={styles.rcPropIcon}>📍</span>
                        <span className={styles.rcProp}>{location}</span>
                        {escrowId && (
                          <Link to={`/escrow/${escrowId}`} className={styles.rcTxLink}>
                            🔒 {escrowId.slice(0, 8).toUpperCase()}
                          </Link>
                        )}
                      </div>

                      <div className={styles.rcMilestone}>
                        <div className={styles.rcMilestoneBar}>
                          <div className={styles.rcMilestoneFill} style={{ width: status === "completed" ? "100%" : status === "in_progress" ? "50%" : "10%" }} />
                        </div>
                        <span className={styles.rcMilestoneLabel}>{st.label}</span>
                      </div>

                      <div className={styles.rcFooterRow}>
                        <div className={styles.rcMeta}>
                          {amount > 0 && <><span className={styles.rcMetaItem}>💰 ₦{(amount / 1_000).toFixed(0)}k</span><span className={styles.rcMetaDot}>·</span></>}
                          <span className={styles.rcMetaItem}>📅 {new Date(req.createdAt as string).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                          {req.deliveredAt && (
                            <>
                              <span className={styles.rcMetaDot}>·</span>
                              <span className={styles.rcMetaItem}>✅ Delivered {new Date(req.deliveredAt as string).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                            </>
                          )}
                        </div>
                        {reportReady ? (
                          <a href={req.reportUrl as string} target="_blank" rel="noreferrer" className={styles.rcDownloadBtn}>📄 Download Report</a>
                        ) : (
                          <button className={styles.rcMessageBtn}>💬 Message Provider</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ PROVIDER PROFILE DRAWER ══ */}
      {selectedProvider && (
        <>
          <div className={styles.drawerBackdrop} onClick={() => setSelectedProvider(null)} />
          <aside className={styles.drawer}>
            <button className={styles.drawerClose} onClick={() => setSelectedProvider(null)} aria-label="Close">✕</button>

            <div className={styles.drawerTop}>
              <div className={styles.drawerAvatar} style={{ background: selectedProvider.avatarColor }}>
                {selectedProvider.avatar}
              </div>
              <div>
                <div className={styles.drawerTypeLabel}>
                  {TYPE_ICON[selectedProvider.type]} {SERVICE_TYPES.find(s => s.key === selectedProvider.type)?.label}
                </div>
                <h2 className={styles.drawerName}>{selectedProvider.name}</h2>
                <p className={styles.drawerCompany}>{selectedProvider.company}</p>
                <p className={styles.drawerLoc}>📍 {selectedProvider.location}</p>
              </div>
            </div>

            <div className={styles.drawerStatRow}>
              {[
                { val: `★ ${selectedProvider.rating}`, lbl: `${selectedProvider.reviews} reviews` },
                { val: String(selectedProvider.completedJobs), lbl: "jobs completed" },
                { val: selectedProvider.responseTime, lbl: "avg response" },
                { val: selectedProvider.turnaround, lbl: "turnaround" },
              ].map(({ val, lbl }) => (
                <div key={lbl} className={styles.drawerStat}>
                  <span className={styles.drawerStatVal}>{val}</span>
                  <span className={styles.drawerStatLbl}>{lbl}</span>
                </div>
              ))}
            </div>

            <div className={styles.drawerSection}>
              <h3 className={styles.drawerSecTitle}>About</h3>
              <p className={styles.drawerBio}>{selectedProvider.bio}</p>
            </div>

            <div className={styles.drawerSection}>
              <h3 className={styles.drawerSecTitle}>Specialties</h3>
              <div className={styles.drawerTags}>
                {selectedProvider.specialties.map(s => <span key={s} className={styles.drawerTag}>{s}</span>)}
              </div>
            </div>

            <div className={styles.drawerSection}>
              <h3 className={styles.drawerSecTitle}>Certifications & Licences</h3>
              {selectedProvider.certifications.map(c => (
                <div key={c} className={styles.drawerCert}>🏅 {c}</div>
              ))}
            </div>

            <div className={styles.drawerSection}>
              <h3 className={styles.drawerSecTitle}>Recent Reviews</h3>
              {selectedProvider.reviewSnippets.map((r, i) => (
                <div key={i} className={styles.drawerReview}>
                  <div className={styles.drawerReviewHeader}>
                    <span className={styles.drawerReviewAuthor}>{r.author}</span>
                    <span className={styles.drawerReviewStars}>{"★".repeat(r.rating)}</span>
                  </div>
                  <p className={styles.drawerReviewText}>"{r.text}"</p>
                </div>
              ))}
            </div>

            <div className={styles.drawerFooter}>
              <div>
                <span className={styles.drawerPriceLbl}>Starting from</span>
                <span className={styles.drawerPriceVal}>{fmtPrice(selectedProvider.priceFrom)}</span>
              </div>
              <button
                className={[styles.drawerHireBtn, !selectedProvider.available ? styles.drawerHireBtnOff : ""].join(" ")}
                disabled={!selectedProvider.available}
                onClick={() => openRequest(selectedProvider)}
              >
                {selectedProvider.available ? "Hire This Professional →" : "Currently Unavailable"}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ══ HIRE MODAL ══ */}
      {showRequestModal && requestProvider && (
        <>
          <div className={styles.modalBackdrop} onClick={() => modalStep === "success" && setShowRequestModal(false)} />
          <div className={styles.modal} role="dialog">

            {modalStep === "success" ? (
              <div className={styles.modalSuccess}>
                <div className={styles.modalSuccessIcon}>✅</div>
                <h2 className={styles.modalSuccessTitle}>Request Sent!</h2>
                <p className={styles.modalSuccessText}>
                  Your request has been sent to <strong>{requestProvider.name}</strong>.
                  They'll respond within {requestProvider.responseTime}.
                  Your fee of {fmtPrice(requestProvider.priceFrom)}+ is securely held in escrow until you approve their report.
                </p>
                <button className={styles.modalSuccessBtn} onClick={() => { setShowRequestModal(false); setTab("my_requests"); }}>
                  View My Requests →
                </button>
              </div>
            ) : (
              <>
                <button className={styles.modalClose} onClick={() => setShowRequestModal(false)}>✕</button>

                <div className={styles.modalHeader}>
                  <div>
                    <p className={styles.modalStepLabel}>
                      Step {modalStep} of 3 — {modalStep === 1 ? "Property Details" : modalStep === 2 ? "Scope & Urgency" : "Payment & Confirm"}
                    </p>
                    <h2 className={styles.modalTitle}>Hire {requestProvider.name}</h2>
                    <p className={styles.modalSubtitle}>{TYPE_ICON[requestProvider.type]} {Service_Types_Find(requestProvider.type)} · {requestProvider.location}</p>
                  </div>
                  <div className={styles.modalProgress}>
                    {[1, 2, 3].map(n => (
                      <div key={n} className={styles.modalProgressStep}>
                        <div className={[styles.modalProgressDot, (modalStep as number) >= n ? styles.modalProgressDotOn : ""].join(" ")}>
                          {(modalStep as number) > n ? "✓" : n}
                        </div>
                        {n < 3 && <div className={[styles.modalProgressLine, (modalStep as number) > n ? styles.modalProgressLineOn : ""].join(" ")} />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.modalBody}>
                  {/* Step 1: Property */}
                  {modalStep === 1 && (
                    <>
                      <div className={styles.mField}>
                        <label className={styles.mLabel}>Property Address *</label>
                        <input className={styles.mInput} placeholder="e.g. Plot 45, Sunrise Estate, Jabi, Abuja" value={fProperty} onChange={e => setFProperty(e.target.value)} />
                      </div>
                      <div className={styles.mField}>
                        <label className={styles.mLabel}>Link to Escrow Transaction <span className={styles.mLabelOpt}>(optional)</span></label>
                        <input className={styles.mInput} placeholder="e.g. TX-2024-0042" value={fTxId} onChange={e => setFTxId(e.target.value)} />
                        <p className={styles.mHint}>🔒 Linking an escrow TX allows fees to be deducted directly from your held funds.</p>
                      </div>
                      <div className={styles.mField}>
                        <label className={styles.mLabel}>Upload Supporting Document <span className={styles.mLabelOpt}>(optional)</span></label>
                        <div className={styles.mUpload} onClick={() => setFDocName(fDocName ? "" : "PropertyDocuments.pdf")}>
                          {fDocName ? (
                            <div className={styles.mUploadedFile}>
                              <span>📎 {fDocName}</span>
                              <button className={styles.mRemoveFile} onClick={e => { e.stopPropagation(); setFDocName(""); }}>✕</button>
                            </div>
                          ) : (
                            <>
                              <span className={styles.mUploadIcon}>📁</span>
                              <span className={styles.mUploadText}>Click to attach deed, survey plan, or title document</span>
                              <span className={styles.mUploadSub}>PDF, JPG, PNG up to 20MB</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={styles.mActions}>
                        <button className={styles.mBtnSec} onClick={() => setShowRequestModal(false)}>Cancel</button>
                        <button className={styles.mBtnPri} disabled={fProperty.trim().length === 0} onClick={() => setModalStep(2)}>Continue →</button>
                      </div>
                    </>
                  )}

                  {/* Step 2: Scope */}
                  {modalStep === 2 && (
                    <>
                      <div className={styles.mField}>
                        <label className={styles.mLabel}>Describe the Scope of Work *</label>
                        <textarea className={styles.mTextarea} placeholder={`What specifically do you need ${requestProvider.name} to do? Be as detailed as possible — include any known issues, site access notes, or special requirements.`} value={fDetails} onChange={e => setFDetails(e.target.value)} rows={5} />
                        <p className={styles.mHint}>{fDetails.length} chars · minimum 20 required for submission</p>
                      </div>
                      <div className={styles.mField}>
                        <label className={styles.mLabel}>Urgency Level</label>
                        <div className={styles.urgencyGrid}>
                          {[
                            { key: "standard", icon: "🗓️", label: "Standard", sub: "5–7 business days", extra: "" },
                            { key: "express",  icon: "⚡",  label: "Express",  sub: "2–3 business days", extra: "+25% fee" },
                            { key: "urgent",   icon: "🔥",  label: "Urgent",   sub: "Within 24 hours",  extra: "+60% fee" },
                          ].map(u => (
                            <button key={u.key} className={[styles.urgencyCard, fUrgency === u.key ? styles.urgencyCardOn : ""].join(" ")} onClick={() => setFUrgency(u.key)}>
                              <span className={styles.urgencyIcon}>{u.icon}</span>
                              <span className={styles.urgencyLabel}>{u.label}</span>
                              <span className={styles.urgencySub}>{u.sub}</span>
                              {u.extra && <span className={styles.urgencyExtra}>{u.extra}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.mActions}>
                        <button className={styles.mBtnSec} onClick={() => setModalStep(1)}>← Back</button>
                        <button className={styles.mBtnPri} disabled={!step1Valid} onClick={() => setModalStep(3)}>Continue →</button>
                      </div>
                    </>
                  )}

                  {/* Step 3: Payment */}
                  {modalStep === 3 && (
                    <>
                      <div className={styles.mSummaryCard}>
                        <h3 className={styles.mSummaryTitle}>Order Summary</h3>
                        <div className={styles.mSummaryRows}>
                          <div className={styles.mSummaryRow}><span>Professional</span><strong>{requestProvider.name}</strong></div>
                          <div className={styles.mSummaryRow}><span>Service</span><strong>{Service_Types_Find(requestProvider.type)}</strong></div>
                          <div className={styles.mSummaryRow}><span>Property</span><strong>{fProperty}</strong></div>
                          {fTxId && <div className={styles.mSummaryRow}><span>Escrow TX</span><strong>{fTxId}</strong></div>}
                          <div className={styles.mSummaryRow}><span>Urgency</span><strong style={{ textTransform: "capitalize" }}>{fUrgency}{surchargeLabel ? ` (${surchargeLabel})` : ""}</strong></div>
                          <div className={styles.mSummaryDivider} />
                          <div className={[styles.mSummaryRow, styles.mSummaryTotal].join(" ")}>
                            <span>Estimated Fee</span>
                            <strong>{fmtPrice(requestProvider.priceFrom)}{fUrgency !== "standard" ? "+" : ""}</strong>
                          </div>
                        </div>
                      </div>
                      <div className={styles.mField}>
                        <label className={styles.mLabel}>Payment Method</label>
                        <div className={styles.paymentCards}>
                          {[
                            { key: "escrow", icon: "🔒", title: "From Escrow Funds", sub: "Deducted from your linked escrow (Phase 2) — safest option" },
                            { key: "direct", icon: "💳", title: "Direct Payment",    sub: "Pay by card or bank transfer — funds still held until you approve" },
                          ].map(opt => (
                            <button key={opt.key} className={[styles.payCard, fPayment === opt.key ? styles.payCardOn : ""].join(" ")} onClick={() => setFPayment(opt.key)}>
                              <div className={styles.payCardHeader}>
                                <span className={styles.payCardIcon}>{opt.icon}</span>
                                <span className={styles.payCardTitle}>{opt.title}</span>
                                <div className={[styles.payCardRadio, fPayment === opt.key ? styles.payCardRadioOn : ""].join(" ")} />
                              </div>
                              <p className={styles.payCardSub}>{opt.sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.mNotice}>
                        <span>🛡️</span>
                        <p>Payment is held securely until you review and explicitly approve the professional's deliverable. Disputes are handled by our compliance team.</p>
                      </div>
                      <div className={styles.mActions}>
                        <button className={styles.mBtnSec} onClick={() => setModalStep(2)}>← Back</button>
                        <button className={styles.mBtnPri} onClick={() => {
                          if (!requestProvider) return;
                          serviceRequest.mutate({
                            providerId: requestProvider.id,
                            type: requestProvider.type,
                            description: fDetails,
                            location: fProperty,
                            budget: requestProvider.priceFrom,
                          }, {
                            onSuccess: () => { setModalStep("success"); },
                            onError: () => toast.error("Could not send request. Please try again."),
                          });
                        }} disabled={serviceRequest.isPending}>
                          {serviceRequest.isPending ? "Sending…" : "Confirm & Send Request ✓"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Service_Types_Find(type: string) {
  return SERVICE_TYPES.find(s => s.key === type)?.label ?? type;
}
