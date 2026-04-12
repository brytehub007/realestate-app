import { useState } from "react";
import styles from "./DocumentVaultPage.module.css";
import toast from "react-hot-toast";
import { usePresignedUrl } from "../../hooks/useUpload";
import { useMyEscrows } from "../../hooks/useEscrow";

type DocStatus = "locked" | "unlocked";

interface VaultDoc {
  id: string;
  name: string;
  icon: string;
  type: string;
  size: string;
  uploadedDate: string;
  status: DocStatus;
  critical: boolean;
}

interface VaultTx {
  id: string;
  property: string;
  seller: string;
  sellerAvatar: string;
  sellerVerified: boolean;
  address: string;
  price: number;
  escrowRef: string;
  vaultStatus: "pending" | "agreement_reached" | "unlocked";
  docs: VaultDoc[];
}

const VAULT_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:           { label: "Pending Agreement", color: "#e67e22", bg: "rgba(230,126,34,.1)", border: "rgba(230,126,34,.3)", icon: "⏳" },
  agreement_reached: { label: "Docs Unlocked",     color: "#5a9e5a", bg: "rgba(90,158,90,.1)",  border: "rgba(90,158,90,.3)",  icon: "🔓" },
  unlocked:          { label: "Transferred",        color: "#3d7a3d", bg: "rgba(61,122,61,.12)", border: "rgba(61,122,61,.3)",  icon: "✅" },
  completed:         { label: "Completed",          color: "#3d7a3d", bg: "rgba(61,122,61,.12)", border: "rgba(61,122,61,.3)",  icon: "✅" },
  initiated:         { label: "Pending Agreement",  color: "#e67e22", bg: "rgba(230,126,34,.1)", border: "rgba(230,126,34,.3)", icon: "⏳" },
  commitment_paid:   { label: "Pending Agreement",  color: "#e67e22", bg: "rgba(230,126,34,.1)", border: "rgba(230,126,34,.3)", icon: "⏳" },
  verification_in_progress: { label: "Docs Unlocked", color: "#5a9e5a", bg: "rgba(90,158,90,.1)", border: "rgba(90,158,90,.3)", icon: "🔓" },
};

const DOC_TYPES: VaultDoc[] = [
  { id: "coo",     name: "Certificate of Occupancy (C of O)", icon: "🏛️", type: "c_of_o",       size: "—", uploadedDate: "", status: "locked", critical: true  },
  { id: "survey",  name: "Survey Plan",                       icon: "📐", type: "survey_plan",  size: "—", uploadedDate: "", status: "locked", critical: true  },
  { id: "deed",    name: "Deed of Assignment",                icon: "📜", type: "deed",          size: "—", uploadedDate: "", status: "locked", critical: true  },
  { id: "title",   name: "Land Title Document",               icon: "🗺️", type: "land_title",   size: "—", uploadedDate: "", status: "locked", critical: true  },
  { id: "receipt", name: "Receipt of Purchase",               icon: "🧾", type: "receipt",       size: "—", uploadedDate: "", status: "locked", critical: false },
  { id: "tax",     name: "Tax Clearance Certificate",         icon: "💼", type: "tax_clearance", size: "—", uploadedDate: "", status: "locked", critical: false },
  { id: "id",      name: "Seller ID Verification",            icon: "🪪", type: "id",            size: "—", uploadedDate: "", status: "locked", critical: false },
  { id: "utility", name: "Utility Bill (Ownership Proof)",    icon: "🔌", type: "utility_bill",  size: "—", uploadedDate: "", status: "locked", critical: false },
];

function escrowToVaultTx(e: Record<string, unknown>): VaultTx {
  const listing = e.listing as Record<string, string> | undefined;
  const seller  = e.seller  as Record<string, string> | undefined;
  const status  = e.status  as string;
  const sellerName = seller
    ? `${seller.firstName ?? ""} ${seller.lastName ?? ""}`.trim()
    : "Seller";
  const sellerInitials = seller
    ? `${seller.firstName?.[0] ?? ""}${seller.lastName?.[0] ?? ""}`.toUpperCase()
    : "??";

  // Map escrow status → vault status
  const vaultStatus: VaultTx["vaultStatus"] =
    status === "completed" ? "unlocked" :
    ["verification_in_progress", "verification_complete", "final_payment_pending"].includes(status)
      ? "agreement_reached"
      : "pending";

  // Map uploaded docs from escrow, fill in standard list
  const uploadedDocs = (e.documents as Record<string, unknown>[] | undefined) ?? [];
  const docs: VaultDoc[] = DOC_TYPES.map(template => {
    const found = uploadedDocs.find((d: Record<string, unknown>) => d.type === template.type);
    if (found) {
      return {
        ...template,
        id:           found.id as string ?? template.id,
        size:         found.fileSize ? `${Math.round((found.fileSize as number) / 1024)} KB` : "—",
        uploadedDate: found.createdAt as string ?? "",
        status:       vaultStatus !== "pending" ? "unlocked" : "locked",
      };
    }
    return { ...template, status: vaultStatus !== "pending" ? "unlocked" : "locked" };
  });

  return {
    id:              e.id as string,
    property:        listing?.title ?? "Property",
    seller:          sellerName,
    sellerAvatar:    sellerInitials,
    sellerVerified:  !!(seller as unknown as Record<string, boolean>)?.isVerified,
    address:         listing
      ? `${listing.address ?? ""}, ${listing.lga ?? ""}, ${listing.state ?? ""}`.replace(/^,\s*/, "").replace(/,\s*,/g, ",")
      : "—",
    price:           (e.amount as number) ?? 0,
    escrowRef:       (e.reference as string) ?? `TX-${(e.id as string).slice(0, 8).toUpperCase()}`,
    vaultStatus,
    docs,
  };
}

function fmt(n: number) {
  if (n >= 1_000_000_000) return `₦${(n/1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `₦${(n/1_000_000).toFixed(0)}M`;
  return `₦${(n/1_000).toFixed(0)}k`;
}

export default function DocumentVaultPage() {
  const presignedUrl = usePresignedUrl();
  const { data: escrows = [], isLoading } = useMyEscrows();

  const escrowList = Array.isArray(escrows) ? escrows as Record<string, unknown>[] : [];
  const vaultTxs: VaultTx[] = escrowList.map(escrowToVaultTx);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected: VaultTx | null = vaultTxs.find(t => t.id === selectedId) ?? vaultTxs[0] ?? null;

  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded]   = useState<Set<string>>(new Set());

  async function viewDocument(docId: string) {
    try {
      const url = await presignedUrl.mutateAsync(docId);
      window.open(url as string, "_blank");
    } catch {
      toast.error("Document is locked or unavailable.");
    }
  }

  function simulateDownload(docId: string) {
    setDownloading(docId);
    setTimeout(() => {
      setDownloading(null);
      setDownloaded(prev => new Set([...prev, docId]));
    }, 1400);
  }

  if (isLoading) {
    return (
      <div style={{ padding: "120px 0", textAlign: "center", color: "var(--text-muted)" }}>
        Loading vault…
      </div>
    );
  }

  if (vaultTxs.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <div className={styles.topBarInner}>
            <div>
              <h1 className={styles.pageTitle}>Document Vault</h1>
              <p className={styles.pageSub}>Secure property documents — released only after agreement</p>
            </div>
            <div className={styles.vaultIcon}>🔐</div>
          </div>
        </div>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-muted)" }}>
          <p>No escrow transactions yet. Documents will appear here once you have active transactions.</p>
        </div>
      </div>
    );
  }

  const unlockedDocs = selected?.docs.filter(d => d.status === "unlocked") ?? [];
  const lockedDocs   = selected?.docs.filter(d => d.status === "locked")   ?? [];
  const st = selected ? (VAULT_STATUS_META[selected.vaultStatus] ?? VAULT_STATUS_META.pending) : VAULT_STATUS_META.pending;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div>
            <h1 className={styles.pageTitle}>Document Vault</h1>
            <p className={styles.pageSub}>Secure property documents — released only after agreement</p>
          </div>
          <div className={styles.vaultIcon}>🔐</div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>My Transactions</div>
          {vaultTxs.map(tx => {
            const s = VAULT_STATUS_META[tx.vaultStatus] ?? VAULT_STATUS_META.pending;
            return (
              <button
                key={tx.id}
                className={[styles.txCard, (selected?.id === tx.id) ? styles.txCardActive : ""].join(" ")}
                onClick={() => setSelectedId(tx.id)}
              >
                <div className={styles.txProp}>{tx.property}</div>
                <div className={styles.txAddr}>{tx.address.split(",")[1]?.trim() || tx.address}</div>
                <div className={styles.txMeta}>
                  <span className={styles.txPrice}>{fmt(tx.price)}</span>
                  <span className={styles.txStatus} style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                    {s.icon} {s.label}
                  </span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Main */}
        {selected && (
          <main className={styles.main}>
            <div className={styles.propHeader}>
              <div className={styles.propInfo}>
                <div className={styles.propName}>{selected.property}</div>
                <div className={styles.propAddr}>📍 {selected.address}</div>
                <div className={styles.propMeta}>
                  <span className={styles.propPrice}>{fmt(selected.price)}</span>
                  <span className={styles.propTx}>Escrow: {selected.escrowRef}</span>
                </div>
              </div>
              <div className={styles.sellerCard}>
                <div className={styles.sellerAvatar}>{selected.sellerAvatar}</div>
                <div>
                  <div className={styles.sellerName}>{selected.seller}</div>
                  <div className={styles.sellerRole}>Property Seller</div>
                </div>
                {selected.sellerVerified && <span className={styles.verifiedPill}>✓ Verified</span>}
              </div>
            </div>

            {/* Status banners */}
            {selected.vaultStatus === "pending" && (
              <div className={styles.bannerPending}>
                <span className={styles.bannerIcon}>🔒</span>
                <div>
                  <div className={styles.bannerTitle}>Documents are locked</div>
                  <div className={styles.bannerText}>
                    The seller has uploaded all required documents. They will be released automatically once you reach a formal agreement and escrow payment is confirmed.
                  </div>
                </div>
              </div>
            )}
            {selected.vaultStatus === "agreement_reached" && (
              <div className={styles.bannerUnlocked}>
                <span className={styles.bannerIcon}>🔓</span>
                <div>
                  <div className={styles.bannerTitle}>Documents are unlocked!</div>
                  <div className={styles.bannerText}>
                    Agreement confirmed. You can now view, download, and print all property documents below. Keep these records safe.
                  </div>
                </div>
              </div>
            )}

            {/* Unlocked docs */}
            {unlockedDocs.length > 0 && (
              <div className={styles.docSection}>
                <div className={styles.docSectionHead}>
                  <div className={styles.docSectionTitle}>🔓 Released Documents ({unlockedDocs.length})</div>
                  <button className={styles.downloadAllBtn} onClick={() => unlockedDocs.forEach(d => simulateDownload(d.id))}>
                    Download All
                  </button>
                </div>
                <div className={styles.docGrid}>
                  {unlockedDocs.map(doc => (
                    <div key={doc.id} className={[styles.docCard, doc.critical ? styles.docCritical : ""].join(" ")}>
                      <div className={styles.docIcon}>{doc.icon}</div>
                      <div className={styles.docBody}>
                        <div className={styles.docName}>
                          {doc.name}
                          {doc.critical && <span className={styles.criticalBadge}>Required</span>}
                        </div>
                        <div className={styles.docMeta}>
                          {doc.size !== "—" ? doc.size : "On file"}
                          {doc.uploadedDate && ` · Uploaded ${new Date(doc.uploadedDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`}
                        </div>
                      </div>
                      <div className={styles.docActions}>
                        <button className={styles.docPreviewBtn} title="Preview" onClick={() => viewDocument(doc.id)}>👁</button>
                        <button
                          className={[styles.docDownloadBtn, downloaded.has(doc.id) ? styles.docDownloaded : ""].join(" ")}
                          onClick={() => simulateDownload(doc.id)}
                          disabled={downloading === doc.id}
                          title="Download"
                        >
                          {downloading === doc.id ? "⏳" : downloaded.has(doc.id) ? "✓" : "⬇"}
                        </button>
                        <button className={styles.docPrintBtn} title="Print">🖨</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked docs */}
            {lockedDocs.length > 0 && (
              <div className={styles.docSection}>
                <div className={styles.docSectionHead}>
                  <div className={styles.docSectionTitle}>🔒 Locked Documents ({lockedDocs.length})</div>
                </div>
                <div className={styles.docGrid}>
                  {lockedDocs.map(doc => (
                    <div key={doc.id} className={[styles.docCard, styles.docLocked].join(" ")}>
                      <div className={styles.docIcon} style={{ opacity: 0.35 }}>{doc.icon}</div>
                      <div className={styles.docBody}>
                        <div className={styles.docName} style={{ color: "#aaa" }}>
                          {doc.name}
                          {doc.critical && <span className={styles.criticalBadge} style={{ opacity: 0.5 }}>Required</span>}
                        </div>
                        <div className={styles.docMeta} style={{ color: "#bbb" }}>Awaiting agreement</div>
                      </div>
                      <div className={styles.lockIcon}>🔒</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flow diagram */}
            <div className={styles.flowDiagram}>
              <div className={styles.flowTitle}>How Document Transfer Works</div>
              <div className={styles.flowSteps}>
                {[
                  { icon: "📤", label: "Seller Uploads", desc: "All docs go into the vault" },
                  { icon: "🔒", label: "Vault Locked",   desc: "Only accessible post-agreement" },
                  { icon: "🤝", label: "Agreement",      desc: "Both parties confirm terms" },
                  { icon: "🔓", label: "Docs Released",  desc: "Buyer can view & download" },
                ].map((f, i) => {
                  const done =
                    (selected.vaultStatus === "unlocked" || selected.vaultStatus === "agreement_reached")
                      ? i <= 3
                      : i <= 1;
                  const lineDone =
                    (selected.vaultStatus === "unlocked" || selected.vaultStatus === "agreement_reached")
                      ? i < 3
                      : i < 1;
                  return (
                    <div key={i} className={styles.flowStep}>
                      <div className={[styles.flowStepDot, done ? styles.flowStepDone : ""].join(" ")}>{f.icon}</div>
                      {i < 3 && <div className={[styles.flowLine, lineDone ? styles.flowLineDone : ""].join(" ")} />}
                      <div className={styles.flowLabel}>{f.label}</div>
                      <div className={styles.flowDesc}>{f.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
