import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import styles from "./EscrowPage.module.css";
import { useEscrow, useCompleteEscrow, useDisputeEscrow } from "../../hooks/useEscrow";

type MilestoneStatus = "pending" | "held" | "released" | "refunded";
type View = "overview" | "documents" | "timeline" | "services";

function fmt(n: number) {
  if (n >= 1_000_000_000) return `₦${(n/1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `₦${(n/1_000_000).toFixed(1)}M`;
  return `₦${(n/1_000).toFixed(0)}k`;
}

const PHASE_COLORS: Record<MilestoneStatus, string> = {
  released: "var(--clr-green-500)",
  held:     "var(--accent-gold)",
  pending:  "var(--clr-silver-500)",
  refunded: "#e74c3c",
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  initiated:               { label: "Initiated",              color: "#5a9e5a", bg: "rgba(90,158,90,0.1)" },
  commitment_paid:         { label: "Commitment Paid",        color: "#d4af37", bg: "rgba(212,175,55,0.1)" },
  verification_in_progress:{ label: "Verification In Progress",color: "#d4af37", bg: "rgba(212,175,55,0.1)" },
  verification_complete:   { label: "Verification Complete",  color: "#5a9e5a", bg: "rgba(90,158,90,0.1)" },
  final_payment_pending:   { label: "Final Payment Pending",  color: "#e0c050", bg: "rgba(224,192,80,0.1)" },
  completed:               { label: "Completed",              color: "#5a9e5a", bg: "rgba(90,158,90,0.12)" },
  disputed:                { label: "Disputed",               color: "#e74c3c", bg: "rgba(231,76,60,0.1)" },
  refunded:                { label: "Refunded",               color: "#e74c3c", bg: "rgba(231,76,60,0.1)" },
};

export default function EscrowPage() {
  const { transactionId } = useParams();
  const [view, setView] = useState<View>("overview");
  const [showDispute, setShowDispute] = useState(false);
  const [showRelease, setShowRelease] = useState(false);
  const [releasePhase, setReleasePhase] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [released, setReleased] = useState<number[]>([]);

  const { data: rawTx, isLoading, isError } = useEscrow(transactionId);
  const completeMutation = useCompleteEscrow(transactionId ?? "");
  const disputeMutation  = useDisputeEscrow(transactionId ?? "");

  if (isLoading) return <div style={{ padding: "120px 0", textAlign: "center", color: "var(--text-muted)" }}>Loading transaction…</div>;
  if (isError || !rawTx) return <div style={{ padding: "120px 0", textAlign: "center", color: "var(--text-muted)" }}>Transaction not found. <Link to="/dashboard">Go to Dashboard</Link></div>;

  // Provide safe defaults for optional API fields
  const tx = {
    ...(rawTx as object),
    milestones:       ((rawTx as Record<string, unknown>).milestones as Record<string, unknown>[]) ?? [],
    documents:        ((rawTx as Record<string, unknown>).documents  as Record<string, unknown>[]) ?? [],
    timeline:         ((rawTx as Record<string, unknown>).timeline   as Record<string, unknown>[]) ?? [],
    serviceProviders: ((rawTx as Record<string, unknown>).serviceProviders as Record<string, unknown>[]) ?? [],
    currentPhase:     ((rawTx as Record<string, unknown>).currentPhase as number) ?? 1,
  } as typeof rawTx & {
    milestones:       Record<string, unknown>[];
    documents:        Record<string, unknown>[];
    timeline:         Record<string, unknown>[];
    serviceProviders: Record<string, unknown>[];
    currentPhase:     number;
  };

  const statusInfo = STATUS_MAP[tx.status as string] ?? STATUS_MAP["initiated"];
  const phase = tx.status === "funded" ? 2 : tx.status === "inspection_period" ? 2 : tx.status === "completed" ? 3 : 1;
  const progress = phase === 1 ? 20 : phase === 2 ? 55 : 90;

  async function handleRelease(_phase: number) {
    setShowRelease(true);
    setReleasePhase(_phase);
  }

  async function confirmRelease() {
    try {
      await completeMutation.mutateAsync();
      if (releasePhase !== null) setReleased(prev => [...prev, releasePhase]);
      setShowRelease(false);
      toast.success("Funds released successfully!");
    } catch {
      toast.error("Could not release funds. Please try again.");
    }
  }

  // confirmRelease is defined above as async

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <div className={styles.crumb}>
        <div className="container">
          <Link to="/" className={styles.crumbLink}>Home</Link>
          <span className={styles.crumbSep}>›</span>
          <Link to="/dashboard" className={styles.crumbLink}>Dashboard</Link>
          <span className={styles.crumbSep}>›</span>
          <span className={styles.crumbCur}>Escrow #{tx.id}</span>
        </div>
      </div>

      <div className="container">
        <div className={styles.layout}>

          {/* ── LEFT MAIN ── */}
          <div className={styles.main}>

            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <div className={styles.txId}>{tx.id}</div>
                <h1 className={styles.txTitle}>{tx.property.title}</h1>
                <p className={styles.txAddr}>📍 {tx.property.address}</p>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.statusBadge}
                  style={{ color: statusInfo.color, background: statusInfo.bg, border: `1px solid ${statusInfo.color}44` }}>
                  {statusInfo.label}
                </span>
                <p className={styles.txDate}>Since {new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>

            {/* Phase Progress */}
            <div className={styles.phaseBar}>
              <div className={styles.phaseBarTrack}>
                <div className={styles.phaseBarFill} style={{ width: `${progress}%` }} />
              </div>
              <div className={styles.phases}>
                {tx.milestones.map((m, i) => {
                  const done = m.status === "released" ;
                  const active = m.phase === tx.currentPhase && !done;
                  return (
                    <div key={i} className={[styles.phaseNode, done ? styles.phaseDone : active ? styles.phaseActive : styles.phasePending].join(" ")}>
                      <div className={styles.phaseNodeDot}>
                        {done ? "✓" : active ? m.phase : m.phase}
                      </div>
                      <div className={styles.phaseNodeBody}>
                        <p className={styles.phaseNodeLabel}>{m.label}</p>
                        <p className={styles.phaseNodeAmt}>{fmt(m.amount)}</p>
                        <span className={styles.phaseNodeStatus} style={{ color: PHASE_COLORS[(m.status as MilestoneStatus)] ?? "#888" }}>
                          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tab navigation */}
            <div className={styles.tabs}>
              {([["overview","Overview"],["documents","Documents"],["timeline","Activity Log"],["services","Service Providers"]] as [View, string][]).map(([key, label]) => (
                <button key={key} className={[styles.tab, view === key ? styles.tabActive : ""].join(" ")} onClick={() => setView(key)}>
                  {label}
                  {key === "documents" && <span className={styles.tabBadge}>{tx.documents.length}</span>}
                </button>
              ))}
            </div>

            {/* ══ OVERVIEW ══ */}
            {view === "overview" && (
              <div className={styles.tabContent}>
                <div className={styles.milestonesGrid}>
                  {tx.milestones.map((m, i) => {
                    const isReleased = m.status === "released" ;
                    const canRelease = m.status === "held" && !released.includes(m.phase) && m.phase === tx.currentPhase;
                    return (
                      <div key={i} className={[styles.milestoneCard, isReleased ? styles.milestoneReleased : m.status === "held" ? styles.milestoneHeld : styles.milestonePending].join(" ")}>
                        <div className={styles.milestoneTop}>
                          <div className={styles.milestonePhaseTag}>Phase {m.phase}</div>
                          <span className={styles.milestoneStatusDot} style={{ background: isReleased ? PHASE_COLORS.released : PHASE_COLORS[(m.status as MilestoneStatus)] ?? "#888" }} />
                        </div>
                        <h3 className={styles.milestoneLabel}>{m.label}</h3>
                        <p className={styles.milestoneDesc}>{m.description}</p>
                        <p className={styles.milestoneAmt}>{fmt(m.amount)}</p>

                        {m.paidAt && (
                          <div className={styles.milestoneMeta}>
                            <span>Paid: {new Date(m.paidAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                            {m.txRef && <span className={styles.txRef}>{m.txRef}</span>}
                          </div>
                        )}
                        {isReleased && m.releasedAt && (
                          <div className={styles.milestoneMeta}>
                            <span style={{ color: "var(--clr-green-500)" }}>✓ Released {new Date(m.releasedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                          </div>
                        )}

                        {canRelease && (
                          <button className={styles.releaseBtn} onClick={() => handleRelease(m.phase)}>
                            Release Funds →
                          </button>
                        )}
                        {m.status === "pending" && (
                          <div className={styles.pendingHint}>Awaiting Phase {m.phase - 1} completion</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Parties */}
                <div className={styles.partiesSection}>
                  <h2 className={styles.sectionH}>Transaction Parties</h2>
                  <div className={styles.parties}>
                    {[
                      { role: "Buyer",  party: tx.buyer  },
                      { role: "Seller", party: tx.seller },
                    ].map(({ role, party }) => (
                      <div key={role} className={styles.partyCard}>
                        <div className={styles.partyAvatar}>{party.initials}</div>
                        <div className={styles.partyInfo}>
                          <p className={styles.partyRole}>{role}</p>
                          <p className={styles.partyName}>{party.name}</p>
                          {"agency" in party && party.agency && <p className={styles.partyAgency}>{party.agency}</p>}
                          <div className={styles.partyMeta}>
                            {party.verified && <span className={styles.verifiedBadge}>✓ Verified</span>}
                            <span className={styles.partyPhone}>{party.phone}</span>
                          </div>
                        </div>
                        <button className={styles.msgBtn}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ DOCUMENTS ══ */}
            {view === "documents" && (
              <div className={styles.tabContent}>
                <div className={styles.docSectionHeader}>
                  <h2 className={styles.sectionH}>Document Exchange</h2>
                  <button className={styles.uploadDocBtn}>+ Upload Document</button>
                </div>

                <div className={styles.docList}>
                  {tx.documents.map((doc, i) => (
                    <div key={i} className={styles.docRow}>
                      <span className={styles.docIcon}>📄</span>
                      <div className={styles.docInfo}>
                        <p className={styles.docName}>{doc.name}</p>
                        <p className={styles.docMeta}>
                          Uploaded by <strong>{doc.uploadedBy}</strong> · {doc.uploadedAt}
                        </p>
                      </div>
                      <div className={styles.docActions}>
                        {doc.verified ? (
                          <span className={styles.docVerified}>✓ Verified</span>
                        ) : (
                          <span className={styles.docPending}>⏳ Pending review</span>
                        )}
                        <a href={doc.url} className={styles.docViewBtn} target="_blank" rel="noopener noreferrer">
                          View →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.docDropZone}>
                  <span>📎</span>
                  <strong>Drop a document here or click to upload</strong>
                  <p>PDF, JPG, PNG · Accessible only to buyer, seller, and assigned professionals</p>
                </div>

                <div className={styles.docNotice}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                  </svg>
                  <p>All documents are encrypted and only accessible to transaction participants and assigned service providers. Shelters' Horizon does not retain copies after transaction completion.</p>
                </div>
              </div>
            )}

            {/* ══ TIMELINE ══ */}
            {view === "timeline" && (
              <div className={styles.tabContent}>
                <h2 className={styles.sectionH}>Activity Log</h2>
                <div className={styles.timeline}>
                  {tx.timeline.map((ev, i) => (
                    <div key={i} className={styles.timelineItem}>
                      <div className={styles.timelineLeft}>
                        <div className={styles.timelineDot}>{ev.icon}</div>
                        {i < tx.timeline.length - 1 && <div className={styles.timelineLine} />}
                      </div>
                      <div className={styles.timelineBody}>
                        <p className={styles.timelineEvent}>{ev.event}</p>
                        <p className={styles.timelineDate}>{ev.date}</p>
                        <span className={styles.timelinePhase}>Phase {ev.phase}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ SERVICES ══ */}
            {view === "services" && (
              <div className={styles.tabContent}>
                <h2 className={styles.sectionH}>Assigned Service Providers</h2>
                <div className={styles.servicesGrid}>
                  {tx.serviceProviders.map((sp, i) => (
                    <div key={i} className={styles.serviceCard}>
                      <div className={styles.serviceHeader}>
                        <span className={styles.serviceType}>{sp.type === "surveyor" ? "📏" : "⚖️"} {sp.type.charAt(0).toUpperCase() + sp.type.slice(1)}</span>
                        <span className={[styles.serviceStatus, sp.status === "completed" ? styles.serviceStatusDone : styles.serviceStatusActive].join(" ")}>
                          {sp.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className={styles.serviceName}>{sp.name}</p>
                      <p className={styles.serviceAssigned}>Assigned: {sp.assignedAt}</p>
                      {sp.reportUrl ? (
                        <a href={sp.reportUrl} className={styles.reportBtn}>Download Report →</a>
                      ) : (
                        <div className={styles.reportPending}>
                          <div className={styles.spinner} />
                          Report in progress...
                        </div>
                      )}
                    </div>
                  ))}
                  <div className={styles.serviceCardAdd}>
                    <span>+</span>
                    <p>Add Service Provider</p>
                    <p className={styles.serviceAddHint}>Request a valuer or building inspector</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <aside className={styles.sidebar}>
            {/* Summary card */}
            <div className={styles.summaryCard}>
              <img src={tx.property.image} alt="" className={styles.summaryImg} />
              <div className={styles.summaryBody}>
                <p className={styles.summaryLabel}>Total Transaction</p>
                <p className={styles.summaryTotal}>{fmt(tx.totalAmount)}</p>
                <div className={styles.summaryRows}>
                  <div className={styles.summaryRow}><span>Phase 1 (Released)</span><strong style={{ color: "var(--clr-green-500)" }}>{fmt(tx.milestones[0].amount)}</strong></div>
                  <div className={styles.summaryRow}><span>Phase 2 (Held)</span><strong style={{ color: "var(--accent-gold)" }}>{fmt(tx.milestones[1].amount)}</strong></div>
                  <div className={styles.summaryRow}><span>Phase 3 (Pending)</span><strong style={{ color: "var(--clr-silver-500)" }}>{fmt(tx.milestones[2].amount)}</strong></div>
                </div>
                <div className={styles.summaryGateway}>
                  <span className={styles.gatewayLabel}>via</span>
                  <span style={{ color: "#f5a623", fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: "0.85rem" }}>{tx.gateway}</span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className={styles.actionsCard}>
              <p className={styles.actionsTitle}>Quick Actions</p>
              <button className={styles.actionBtn} onClick={() => handleRelease(2)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                Release Phase 2 Funds
              </button>
              <button className={styles.actionBtn} onClick={() => {}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Pay Phase 3 Balance
              </button>
              <button className={styles.actionBtnOutline} onClick={() => setShowDispute(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Raise a Dispute
              </button>
            </div>

            {/* Support */}
            <div className={styles.supportCard}>
              <p className={styles.supportTitle}>🛟 Escrow Support</p>
              <p className={styles.supportText}>Issues with this transaction? Our dedicated escrow team is available Mon–Sat 8am–8pm WAT.</p>
              <a href="tel:+2341234567890" className={styles.supportPhone}>📞 +234 123 456 7890</a>
              <a href="mailto:escrow@sheltershorizon.ng" className={styles.supportEmail}>✉ escrow@sheltershorizon.ng</a>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Release Modal ── */}
      {showRelease && (
        <>
          <div className={styles.backdrop} onClick={() => setShowRelease(false)} />
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Release Phase {releasePhase} Funds</h2>
            <p className={styles.modalText}>
              You are about to release <strong>{fmt(tx.milestones[(releasePhase ?? 1) - 1]?.amount ?? 0)}</strong> from escrow to the {releasePhase === 1 ? "seller" : "service providers"}. This action is irreversible.
            </p>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setShowRelease(false)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={confirmRelease}>✓ Confirm Release</button>
            </div>
          </div>
        </>
      )}

      {/* ── Dispute Modal ── */}
      {showDispute && (
        <>
          <div className={styles.backdrop} onClick={() => setShowDispute(false)} />
          <div className={styles.modal}>
            <button className={styles.modalClose} onClick={() => setShowDispute(false)}>✕</button>
            <h2 className={styles.modalTitle}>Raise a Dispute</h2>
            <p className={styles.modalText}>A Shelters' Horizon mediator will review your dispute within 48 hours. Funds remain frozen until resolved.</p>
            <div className={styles.disputeField}>
              <label className={styles.disputeLabel}>Reason for Dispute</label>
              <select className={styles.disputeSelect} value={disputeReason} onChange={e => setDisputeReason(e.target.value)}>
                <option value="">Select reason...</option>
                <option value="title_fraud">Title document fraud</option>
                <option value="property_misrepresentation">Property misrepresentation</option>
                <option value="seller_unresponsive">Seller unresponsive</option>
                <option value="survey_discrepancy">Survey discrepancy</option>
                <option value="encumbrance">Undisclosed encumbrance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className={styles.disputeField}>
              <label className={styles.disputeLabel}>Describe the Issue</label>
              <textarea
                className={styles.disputeTextarea}
                value={disputeDesc}
                onChange={e => setDisputeDesc(e.target.value)}
                placeholder="Provide detailed information about the issue..."
                rows={5}
              />
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.modalCancel} onClick={() => setShowDispute(false)}>Cancel</button>
              <button
                className={styles.modalDispute}
                onClick={() => { alert("Dispute raised. A mediator will contact you within 48 hours."); setShowDispute(false); }}
                disabled={!disputeReason || disputeDesc.length < 20}
              >
                🚨 Submit Dispute
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
