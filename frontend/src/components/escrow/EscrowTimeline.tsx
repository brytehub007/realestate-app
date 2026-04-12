import type { EscrowTransaction, EscrowMilestone } from "../../types";
import styles from "./EscrowTimeline.module.css";

interface Props {
  transaction: EscrowTransaction;
  onPayPhase?: (phase: number) => void;
  isbuyer?: boolean;
}

const PHASE_META = [
  {
    phase: 1,
    title: "Commitment Fee",
    subtitle: "Held in Escrow",
    icon: "🔒",
    color: "#d4af37",
    description:
      "Buyer pays a commitment fee (typically 5–10% of purchase price). Funds are held securely. This locks the property and initiates the review.",
  },
  {
    phase: 2,
    title: "Due Diligence",
    subtitle: "Surveyor & Legal Review",
    icon: "⚖️",
    color: "#5a9e5a",
    description:
      "Licensed Surveyor verifies boundary and soil. Lawyer reviews title documents. Professionals are paid from Phase 1 funds upon report submission.",
  },
  {
    phase: 3,
    title: "Final Payment",
    subtitle: "Title Transfer Confirmed",
    icon: "🏛️",
    color: "#a8a8a8",
    description:
      "Balance of purchase price transferred to seller. Title officially transferred to buyer. Transaction completed and recorded on-platform.",
  },
];

function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function PhaseStatus({ milestone }: { milestone: EscrowMilestone }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Pending",  cls: styles.statusPending },
    held:     { label: "Held",     cls: styles.statusHeld },
    released: { label: "Released", cls: styles.statusReleased },
    refunded: { label: "Refunded", cls: styles.statusRefunded },
  };
  const s = map[milestone.status];
  return <span className={`${styles.statusBadge} ${s.cls}`}>{s.label}</span>;
}

export default function EscrowTimeline({ transaction, onPayPhase, isbuyer }: Props) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className="section-eyebrow" style={{ color: "var(--accent-gold)" }}>
            Escrow Transaction
          </p>
          <h2 className={styles.heading}>Milestone Payment System</h2>
        </div>
        <div className={styles.totalBadge}>
          <span className={styles.totalLabel}>Total Value</span>
          <span className={styles.totalVal}>{formatNGN(transaction.totalAmount)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${((transaction.currentPhase - 1) / 3) * 100}%` }}
        />
        {PHASE_META.map((m) => (
          <div
            key={m.phase}
            className={[
              styles.progressDot,
              transaction.currentPhase >= m.phase ? styles.dotActive : "",
              transaction.currentPhase > m.phase ? styles.dotDone : "",
            ].join(" ")}
            style={{ left: `${((m.phase - 1) / 2) * 100}%` }}
          />
        ))}
      </div>

      {/* Phase cards */}
      <div className={styles.phases}>
        {PHASE_META.map((meta) => {
          const milestone = transaction.milestones.find((m) => m.phase === meta.phase);
          const isCurrent = transaction.currentPhase === meta.phase;
          const isDone = milestone?.status === "released";
          const isLocked = transaction.currentPhase < meta.phase;

          return (
            <div
              key={meta.phase}
              className={[
                styles.phase,
                isCurrent ? styles.phaseCurrent : "",
                isDone ? styles.phaseDone : "",
                isLocked ? styles.phaseLocked : "",
              ].join(" ")}
            >
              {/* Phase number + icon */}
              <div className={styles.phaseIcon} style={{ borderColor: isDone || isCurrent ? meta.color : "transparent" }}>
                <span>{isDone ? "✓" : meta.icon}</span>
              </div>

              {/* Content */}
              <div className={styles.phaseContent}>
                <div className={styles.phaseTop}>
                  <div>
                    <span className={styles.phaseNum}>Phase {meta.phase}</span>
                    <h3 className={styles.phaseTitle}>{meta.title}</h3>
                    <p className={styles.phaseSub}>{meta.subtitle}</p>
                  </div>
                  {milestone && <PhaseStatus milestone={milestone} />}
                </div>

                <p className={styles.phaseDesc}>{meta.description}</p>

                {milestone && (
                  <div className={styles.amountRow}>
                    <span className={styles.amountLabel}>Amount</span>
                    <span className={styles.amountVal}>{formatNGN(milestone.amount)}</span>
                  </div>
                )}

                {milestone?.paidAt && (
                  <p className={styles.timestamp}>
                    Paid: {new Date(milestone.paidAt).toLocaleDateString("en-NG", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                )}

                {isCurrent && isbuyer && milestone?.status === "pending" && (
                  <button
                    className={`btn btn-primary ${styles.payBtn}`}
                    onClick={() => onPayPhase?.(meta.phase)}
                  >
                    Pay {meta.phase === 1 ? "Commitment Fee" : "Phase " + meta.phase}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                )}

                {milestone?.transactionRef && (
                  <p className={styles.txRef}>
                    Ref: <code>{milestone.transactionRef}</code>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status footer */}
      <div className={styles.statusFooter}>
        <div className={styles.gatewayInfo}>
          <span className={styles.gatewayLabel}>Powered by</span>
          <strong className={styles.gatewayName}>
            {transaction.paymentGateway === "flutterwave" ? "Flutterwave" : "Paystack"}
          </strong>
        </div>
        <span className={`badge ${transaction.status === "completed" ? "badge-green" : "badge-gold"}`}>
          {transaction.status.replace(/_/g, " ").toUpperCase()}
        </span>
      </div>
    </div>
  );
}
