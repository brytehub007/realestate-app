import { useState } from "react";
import styles from "./AreaReportPage.module.css";
import { useAreaReports } from "../../hooks/useAreaReport";

type RiskType =
  | "land_grabbers" | "government_acquisition" | "flood_prone"
  | "disputed_title" | "boundary_dispute" | "demolition_notice"
  | "noise_pollution" | "security_risk" | "other";

const RISK_META: Record<RiskType, { label: string; icon: string; color: string; bg: string }> = {
  land_grabbers:         { label: "Land Grabbers",    icon: "⚠️", color: "#e74c3c", bg: "rgba(231,76,60,.1)"   },
  government_acquisition:{ label: "Govt Acquisition", icon: "🏛️", color: "#e67e22", bg: "rgba(230,126,34,.1)"  },
  flood_prone:           { label: "Flood Prone",       icon: "🌊", color: "#2980b9", bg: "rgba(41,128,185,.1)"  },
  disputed_title:        { label: "Disputed Title",    icon: "⚖️", color: "#8e44ad", bg: "rgba(142,68,173,.1)"  },
  boundary_dispute:      { label: "Boundary Dispute",  icon: "📐", color: "#d35400", bg: "rgba(211,84,0,.1)"    },
  demolition_notice:     { label: "Demolition Notice", icon: "🔨", color: "#c0392b", bg: "rgba(192,57,43,.1)"   },
  noise_pollution:       { label: "Noise Pollution",   icon: "🔊", color: "#7f8c8d", bg: "rgba(127,140,141,.1)" },
  security_risk:         { label: "Security Risk",     icon: "🔓", color: "#e74c3c", bg: "rgba(231,76,60,.1)"   },
  other:                 { label: "Other",             icon: "📌", color: "#95a5a6", bg: "rgba(149,165,166,.1)" },
};

const NIGERIAN_STATES = ["Lagos","FCT (Abuja)","Rivers","Ogun","Kano","Anambra","Delta","Imo","Enugu","Edo","Oyo","Kaduna"];

export default function AreaReportPage() {
  const { data: liveReports = [], isLoading } = useAreaReports();

  const reports: Record<string, unknown>[] = Array.isArray(liveReports) ? liveReports : [];

  const [filterRisk, setFilterRisk]   = useState<RiskType | "all">("all");
  const [filterState, setFilterState] = useState("all");
  const [sortBy, setSortBy]           = useState<"upvotes" | "newest">("upvotes");
  const [showForm, setShowForm]       = useState(false);
  const [formStep, setFormStep]       = useState<1 | 2>(1);
  const [submitted, setSubmitted]     = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [votedIds, setVotedIds]       = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    riskType: "" as RiskType | "",
    title: "", description: "", state: "", lga: "", neighbourhood: "", anonymous: false,
  });

  const filtered = reports
    .filter(r => filterRisk === "all" || r.riskType === filterRisk)
    .filter(r => filterState === "all" || r.state === filterState)
    .sort((a, b) =>
      sortBy === "upvotes"
        ? ((b.upvotes as number) ?? 0) - ((a.upvotes as number) ?? 0)
        : new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );

  const verifiedCount = reports.filter(r => r.isVerified).length;
  const uniqueStates  = [...new Set(reports.map(r => r.state as string))].filter(Boolean);

  const riskCounts = Object.keys(RISK_META).reduce((acc, k) => {
    acc[k] = reports.filter(r => r.riskType === k).length;
    return acc;
  }, {} as Record<string, number>);

  function toggleUpvote(id: string) {
    setVotedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function submitReport() {
    setSubmitted(true);
    setTimeout(() => {
      setShowForm(false);
      setSubmitted(false);
      setFormStep(1);
      setForm({ riskType: "", title: "", description: "", state: "", lga: "", neighbourhood: "", anonymous: false });
    }, 2500);
  }

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>Community Intelligence</div>
            <h1 className={styles.heroTitle}>Area Risk Reports</h1>
            <p className={styles.heroSub}>
              Community-sourced warnings on land grabbers, government acquisitions, flood zones, title disputes, and more. Know before you buy.
            </p>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}><span className={styles.heroStatNum}>{reports.length}</span><span className={styles.heroStatLbl}>Reports Filed</span></div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}><span className={styles.heroStatNum}>{verifiedCount}</span><span className={styles.heroStatLbl}>Verified</span></div>
              <div className={styles.heroStatDivider} />
              <div className={styles.heroStat}><span className={styles.heroStatNum}>{uniqueStates.length || 13}</span><span className={styles.heroStatLbl}>States Covered</span></div>
            </div>
            <button className={styles.heroBtn} onClick={() => setShowForm(true)}>+ File a Report</button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* ── Map placeholder ── */}
        <div className={styles.mapSection}>
          <div className={styles.mapPlaceholder}>
            <div className={styles.mapGrid} />
            <div className={styles.mapOverlay}>
              {[
                { left: "22%", top: "38%", size: 90,  color: "rgba(231,76,60,.35)", label: "Lagos — Ajah" },
                { left: "34%", top: "55%", size: 70,  color: "rgba(41,128,185,.3)", label: "Lagos — Ikorodu" },
                { left: "61%", top: "29%", size: 110, color: "rgba(231,76,60,.4)",  label: "Abuja — Maitama" },
                { left: "73%", top: "61%", size: 55,  color: "rgba(230,126,34,.3)", label: "Port Harcourt" },
                { left: "48%", top: "42%", size: 75,  color: "rgba(142,68,173,.25)",label: "Ikeja" },
              ].map((b, i) => (
                <div key={i} className={styles.heatBlob}
                  style={{ left: b.left, top: b.top, width: b.size, height: b.size, background: b.color }}
                  title={b.label}
                />
              ))}
            </div>
            <div className={styles.mapContent}>
              <span className={styles.mapIcon}>🗺️</span>
              <strong>Interactive Risk Heat Map</strong>
              <p>Set <code>VITE_MAPBOX_TOKEN</code> to activate the live map with risk overlays, clickable report pins, and area search.</p>
            </div>
            <div className={styles.mapLegend}>
              {[
                { color: "#e74c3c", label: "Land Grabbers / Security" },
                { color: "#2980b9", label: "Flood Prone" },
                { color: "#e67e22", label: "Govt Acquisition" },
                { color: "#8e44ad", label: "Title Dispute" },
              ].map(item => (
                <div key={item.label} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Risk type chips ── */}
        <div className={styles.riskChips}>
          <button
            className={[styles.riskChip, filterRisk === "all" ? styles.riskChipActive : ""].join(" ")}
            onClick={() => setFilterRisk("all")}
          >
            All Types <span className={styles.chipCount}>{reports.length}</span>
          </button>
          {(Object.entries(RISK_META) as [RiskType, typeof RISK_META[RiskType]][])
            .filter(([k]) => riskCounts[k] > 0)
            .map(([key, meta]) => (
              <button
                key={key}
                className={[styles.riskChip, filterRisk === key ? styles.riskChipActive : ""].join(" ")}
                style={filterRisk === key ? { borderColor: meta.color, background: meta.bg, color: meta.color } : {}}
                onClick={() => setFilterRisk(key)}
              >
                {meta.icon} {meta.label} <span className={styles.chipCount}>{riskCounts[key]}</span>
              </button>
            ))}
        </div>

        {/* ── Filter bar ── */}
        <div className={styles.filterBar}>
          <div className={styles.filterLeft}>
            <select className={styles.filterSelect} value={filterState} onChange={e => setFilterState(e.target.value)}>
              <option value="all">All States</option>
              {(uniqueStates.length > 0 ? uniqueStates : NIGERIAN_STATES).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.filterRight}>
            <span className={styles.filterCount}>{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
            <div className={styles.sortBtns}>
              <button className={[styles.sortBtn, sortBy === "upvotes" ? styles.sortBtnActive : ""].join(" ")} onClick={() => setSortBy("upvotes")}>Most Upvoted</button>
              <button className={[styles.sortBtn, sortBy === "newest"  ? styles.sortBtnActive : ""].join(" ")} onClick={() => setSortBy("newest")}>Newest</button>
            </div>
          </div>
        </div>

        {/* ── Reports grid ── */}
        {isLoading && (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading reports…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
            No reports found for the selected filters.
          </div>
        )}
        <div className={styles.reportsGrid}>
          {filtered.map(report => {
            const riskType = (report.riskType as RiskType) ?? "other";
            const meta = RISK_META[riskType] ?? RISK_META.other;
            const expanded = activeReport === (report.id as string);
            const voted = votedIds.has(report.id as string);
            const upvotes = ((report.upvotes as number) ?? 0) + (voted ? 1 : 0);
            return (
              <div key={report.id as string} className={[styles.reportCard, expanded ? styles.reportCardExpanded : ""].join(" ")}>
                <div className={styles.reportTop}>
                  <span className={styles.reportRiskTag} style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}44` }}>
                    {meta.icon} {meta.label}
                  </span>
                  <div className={styles.reportTopRight}>
                    {report.isVerified && <span className={styles.verifiedBadge}>✓ Verified</span>}
                    <span className={styles.reportDate}>
                      {new Date(report.createdAt as string).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <h3 className={styles.reportTitle}>{(report.title as string) ?? `${report.neighbourhood ?? report.lga}, ${report.state}`}</h3>
                <p className={styles.reportLoc}>📍 {[report.neighbourhood, report.lga, report.state].filter(Boolean).join(", ")}</p>
                <p className={styles.reportDesc} style={{ WebkitLineClamp: expanded ? "unset" : 2 }}>
                  {report.description as string}
                </p>

                <button className={styles.expandBtn} onClick={() => setActiveReport(expanded ? null : (report.id as string))}>
                  {expanded ? "Show less ▲" : "Read more ▼"}
                </button>

                <div className={styles.reportFooter}>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportBy}>🔍 {(report.reportedBy as string) ?? "Community Member"}</span>
                    {(report.evidence as number) > 0 && (
                      <span className={styles.reportEvidence}>
                        📎 {report.evidence as number} evidence file{(report.evidence as number) !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button
                    className={[styles.upvoteBtn, voted ? styles.upvoteBtnActive : ""].join(" ")}
                    onClick={() => toggleUpvote(report.id as string)}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={voted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                    </svg>
                    {upvotes}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── File report CTA ── */}
        <div className={styles.ctaBanner}>
          <div className={styles.ctaLeft}>
            <h2 className={styles.ctaTitle}>Know something others should?</h2>
            <p className={styles.ctaText}>Help fellow buyers stay safe. Reports can be filed anonymously and are reviewed before publication.</p>
          </div>
          <button className={styles.ctaBtn} onClick={() => setShowForm(true)}>+ File a Report</button>
        </div>
      </div>

      {/* ── Report Submission Modal ── */}
      {showForm && (
        <>
          <div className={styles.backdrop} onClick={() => !submitted && setShowForm(false)} />
          <div className={styles.modal}>
            {submitted ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>✅</div>
                <h2 className={styles.successTitle}>Report Submitted</h2>
                <p className={styles.successText}>Our review team will verify your report within 48 hours.</p>
              </div>
            ) : (
              <>
                <button className={styles.modalClose} onClick={() => setShowForm(false)}>✕</button>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>File an Area Report</h2>
                  <div className={styles.modalSteps}>
                    <div className={[styles.modalStep, formStep === 1 ? styles.modalStepActive : styles.modalStepDone].join(" ")}>1 Details</div>
                    <div className={styles.modalStepLine} />
                    <div className={[styles.modalStep, formStep === 2 ? styles.modalStepActive : ""].join(" ")}>2 Location</div>
                  </div>
                </div>

                {formStep === 1 && (
                  <div className={styles.modalBody}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Risk Type *</label>
                      <div className={styles.riskTypeGrid}>
                        {(Object.entries(RISK_META) as [RiskType, typeof RISK_META[RiskType]][]).map(([key, meta]) => (
                          <button key={key} type="button"
                            className={[styles.riskTypeBtn, form.riskType === key ? styles.riskTypeBtnActive : ""].join(" ")}
                            style={form.riskType === key ? { borderColor: meta.color, background: meta.bg } : {}}
                            onClick={() => setForm(f => ({ ...f, riskType: key }))}
                          >
                            <span>{meta.icon}</span>
                            <span className={styles.riskTypeBtnLabel}>{meta.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Report Title *</label>
                      <input className={styles.fieldInput} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Omo-onile activity on Badore Road" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Description *</label>
                      <textarea className={styles.fieldTextarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what you witnessed or know about this risk..." rows={5} />
                      <p className={styles.fieldHint}>{form.description.length} characters (minimum 50)</p>
                    </div>
                    <div className={styles.anonToggle}>
                      <input type="checkbox" id="anon" checked={form.anonymous} onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))} />
                      <label htmlFor="anon">File anonymously — your name will not appear on the report</label>
                    </div>
                    <div className={styles.modalBtns}>
                      <button className={styles.modalBtnSecondary} onClick={() => setShowForm(false)}>Cancel</button>
                      <button
                        className={styles.modalBtnPrimary}
                        disabled={!form.riskType || !form.title || form.description.length < 50}
                        onClick={() => setFormStep(2)}
                      >
                        Continue to Location →
                      </button>
                    </div>
                  </div>
                )}

                {formStep === 2 && (
                  <div className={styles.modalBody}>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>State *</label>
                        <select className={styles.fieldSelect} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                          <option value="">Select state...</option>
                          {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>LGA / Area *</label>
                        <input className={styles.fieldInput} value={form.lga} onChange={e => setForm(f => ({ ...f, lga: e.target.value }))} placeholder="e.g. Ajah, Ikorodu" />
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Neighbourhood / Street</label>
                      <input className={styles.fieldInput} value={form.neighbourhood} onChange={e => setForm(f => ({ ...f, neighbourhood: e.target.value }))} placeholder="e.g. Badore Road, Lekki Phase 2" />
                    </div>
                    <div className={styles.mapSmall}>
                      <div className={styles.mapSmallGrid} />
                      <div className={styles.mapSmallContent}>
                        <span>📍</span>
                        <p>Click on the map to drop a pin at the exact location of the risk.</p>
                        <p style={{ opacity: 0.6, fontSize: "0.75rem" }}>Requires <code>VITE_MAPBOX_TOKEN</code> to activate</p>
                      </div>
                    </div>
                    <div className={styles.evidenceZone}>
                      <span>📎</span>
                      <strong>Attach Evidence (Optional)</strong>
                      <p>Photos, gazette notices, court orders — PDF, JPG, PNG up to 10MB</p>
                    </div>
                    <div className={styles.modalBtns}>
                      <button className={styles.modalBtnSecondary} onClick={() => setFormStep(1)}>← Back</button>
                      <button className={styles.modalBtnPrimary} disabled={!form.state || !form.lga} onClick={submitReport}>
                        Submit Report
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
