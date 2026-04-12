import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import styles from "./MessagingPage.module.css";
import { useConversations, useMessages, useSendMessage, useRealtimeMessages } from "../../hooks/useMessages";
import { useAuthStore } from "../../store/auth.store";

type MessageRole = "buyer" | "seller" | "agent" | "landlord" | "caretaker";
type MessageStatus = "sent" | "delivered" | "read";
type ConversationStatus = "active" | "offer_pending" | "offer_accepted" | "viewing_scheduled" | "closed";

interface Message {
  id: string;
  from: "me" | "them";
  text: string;
  timestamp: string;
  status?: MessageStatus;
  attachments?: { name: string; type: "image" | "doc"; icon: string }[];
  isOffer?: boolean;
  offerAmount?: number;
}

interface Conversation {
  id: string;
  contactName: string;
  contactAvatar: string;
  contactRole: MessageRole;
  contactVerified: boolean;
  contactOnline: boolean;
  propertyTitle: string;
  propertyImage: string;
  propertyPrice: string;
  propertyLocation: string;
  status: ConversationStatus;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
}

const STATUS_META: Record<ConversationStatus, { label: string; color: string; bg: string; border: string }> = {
  active:            { label: "Active",            color: "#3d7a3d", bg: "rgba(61,122,61,.08)",    border: "rgba(61,122,61,.2)" },
  offer_pending:     { label: "Offer Pending",      color: "#e67e22", bg: "rgba(230,126,34,.08)",   border: "rgba(230,126,34,.25)" },
  offer_accepted:    { label: "Offer Accepted",     color: "#27ae60", bg: "rgba(39,174,96,.08)",    border: "rgba(39,174,96,.25)" },
  viewing_scheduled: { label: "Viewing Scheduled",  color: "#3498db", bg: "rgba(52,152,219,.08)",   border: "rgba(52,152,219,.25)" },
  closed:            { label: "Closed",             color: "#999",    bg: "rgba(150,150,150,.08)",   border: "rgba(150,150,150,.2)" },
};

const ROLE_LABELS: Record<MessageRole, string> = {
  buyer: "Buyer", seller: "Seller", agent: "Agent",
  landlord: "Landlord", caretaker: "Caretaker",
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n/1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n/1_000_000).toFixed(0)}M`;
  return `₦${(n/1_000).toFixed(0)}k`;
}

export default function MessagingPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showPropertyCard, setShowPropertyCard] = useState(true);
  const [offerMode, setOfferMode] = useState(false);
  const [offerVal, setOfferVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rawConvos = [], isLoading: convosLoading } = useConversations();

  const convos = (rawConvos as Record<string, unknown>[]).map(c => {
    const rawParts = (c.participants as Record<string, string>[] | undefined) ?? [];
    const other = rawParts[0];
    const listing = c.listing as Record<string, unknown> | undefined;
    const imgs = listing?.images as Record<string, string>[] | undefined;
    const contactName = other ? `${other.firstName ?? ""} ${other.lastName ?? ""}`.trim() : "Unknown";
    const contactAvatar = contactName.slice(0, 2).toUpperCase();
    const lastMsgTime = c.updatedAt as string;
    const lastTimeFormatted = lastMsgTime
      ? new Date(lastMsgTime).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
      : "";
    return {
      id:              c.id as string,
      contactName,
      contactAvatar,
      contactRole:     (other?.role as string) ?? "buyer",
      contactVerified: !!(other as unknown as Record<string, boolean>)?.isVerified,
      contactOnline:   false,
      propertyTitle:   (listing?.title as string) ?? "",
      propertyLocation: listing ? `${(listing.lga as string) ?? ""}, ${(listing.state as string) ?? ""}` : "",
      propertyPrice:   listing?.price ? (() => {
        const p = listing.price as Record<string, number>;
        const amt = p.amount ?? p.minAmount ?? 0;
        return amt >= 1_000_000 ? `₦${(amt/1_000_000).toFixed(0)}M` : `₦${(amt/1_000).toFixed(0)}k`;
      })() : "",
      propertyImage:   imgs?.[0]?.url ?? "",
      lastTime:        lastTimeFormatted,
      lastMessage:     (c.lastMessage as string) ?? "",
      unread:          (c.unread as number) ?? 0,
      status:          (c.status as string) ?? "active",
    };
  });

  const currentId = activeId ?? convos[0]?.id;
  const active = convos.find(c => c.id === currentId);

  const { user } = useAuthStore();
  const { data: msgPages } = useMessages(currentId);

  // Normalise API message shape (sender/content) → component shape (from/text)
  const rawMessages = msgPages?.pages?.flatMap((p: Record<string, unknown>) => (p.data as unknown[]) ?? []) ?? [];
  const messages = (rawMessages as Record<string, unknown>[]).map(msg => ({
    ...msg,
    from: (msg.sender as Record<string, string>)?.id === user?.id ? "me" : "them",
    text: (msg.content as string) ?? (msg.text as string) ?? "",
    isOffer: !!(msg.isOffer),
    offerAmount: (msg.offerAmount as number),
    attachments: (msg.attachments as Record<string, string>[] | undefined),
    timestamp: msg.createdAt
      ? new Date(msg.createdAt as string).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
      : "",
    status: (msg.status as string) ?? "sent",
  }));

  const sendMutation = useSendMessage(currentId ?? "");

  useRealtimeMessages(currentId, () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const statusMeta = active
    ? (STATUS_META[(active.status as ConversationStatus)] ?? STATUS_META["active"])
    : STATUS_META["active"];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentId, messages.length]);

  function selectConvo(id: string) {
    setActiveId(id);
    setDraft("");
    setOfferMode(false);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !currentId) return;
    try {
      await sendMutation.mutateAsync({ text: text.trim() });
      setDraft("");
      setOfferMode(false);
    } catch {
      toast.error("Message failed to send. Try again.");
    }
  }

  async function sendOffer() {
    if (!offerVal || !currentId) return;
    const amount = parseInt(offerVal.replace(/\D/g, ""));
    try {
      await sendMutation.mutateAsync({
        text: `I'd like to make a formal offer of ${fmt(amount)} for this property. Please confirm if you'd like to proceed to escrow.`,
        isOffer: true,
        offerAmount: amount,
      });
      setOfferVal("");
      setOfferMode(false);
    } catch {
      toast.error("Offer failed to send. Try again.");
    }
  }

  return (
    <div className={styles.page}>
      {/* LEFT: Conversation list */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <h1 className={styles.sidebarTitle}>Messages</h1>
          <span className={styles.totalBadge}>{convos.reduce((s, c) => s + (c.unread ?? 0), 0)} unread</span>
        </div>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input className={styles.searchInp} placeholder="Search conversations…" />
        </div>
        <div className={styles.convoList}>
          {convos.map(c => {
            const st = STATUS_META[(c.status as ConversationStatus)] ?? STATUS_META["active"];
            return (
              <button
                key={c.id}
                className={[styles.convoItem, c.id === currentId ? styles.convoItemActive : ""].join(" ")}
                onClick={() => selectConvo(c.id)}
              >
                <div className={styles.convoAvatarWrap}>
                  <div className={styles.convoAvatar}>{c.contactAvatar}</div>
                  {c.contactOnline && <div className={styles.onlineDot} />}
                </div>
                <div className={styles.convoBody}>
                  <div className={styles.convoTopRow}>
                    <span className={styles.convoName}>{c.contactName}</span>
                    <span className={styles.convoTime}>{c.lastTime}</span>
                  </div>
                  <div className={styles.convoProp}>{c.propertyTitle}</div>
                  <div className={styles.convoLast}>{c.lastMessage}</div>
                  <div className={styles.convoFootRow}>
                    <span className={styles.convoStatus} style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                      {st.label}
                    </span>
                    {c.unread > 0 && <span className={styles.unreadBadge}>{c.unread}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* RIGHT: Active conversation */}
      <div className={styles.chat}>
        {!active ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
            Select a conversation to start chatting
          </div>
        ) : (<>
        {/* Chat header */}
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            <div className={styles.chatAvatarWrap}>
              <div className={styles.chatAvatar}>{active.contactAvatar}</div>
              {active.contactOnline && <div className={styles.chatOnline} />}
            </div>
            <div>
              <div className={styles.chatName}>
                {active.contactName}
                {active.contactVerified && <span className={styles.verifiedBadge}>✓</span>}
              </div>
              <div className={styles.chatRole}>
                {ROLE_LABELS[(active.contactRole as MessageRole)] ?? active.contactRole} · {active.contactOnline ? "Online now" : "Last seen recently"}
              </div>
            </div>
          </div>
          <div className={styles.chatHeaderRight}>
            <span className={styles.statusPill} style={{ color: statusMeta.color, background: statusMeta.bg, border: `1px solid ${statusMeta.border}` }}>
              {statusMeta.label}
            </span>
            <button className={styles.headerBtn} title="Schedule viewing" onClick={() => alert("Opening viewing scheduler…")}>📅</button>
            <button className={styles.headerBtn} title="Initiate escrow" onClick={() => alert("Opening escrow flow…")}>🔒</button>
            <button className={styles.headerBtn} title="Report conversation" onClick={() => alert("Report submitted.")}>⚠</button>
          </div>
        </div>

        {/* Property context card */}
        {showPropertyCard && (
          <div className={styles.propCard}>
            <img src={active.propertyImage} alt="" className={styles.propCardImg} />
            <div className={styles.propCardBody}>
              <div className={styles.propCardTitle}>{active.propertyTitle}</div>
              <div className={styles.propCardMeta}>📍 {active.propertyLocation} · <strong>{active.propertyPrice}</strong></div>
            </div>
            <div className={styles.propCardActions}>
              <a href={`/listings/${active.id}`} className={styles.propCardBtn}>View →</a>
              <button className={styles.propCardClose} onClick={() => setShowPropertyCard(false)}>✕</button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className={styles.messages}>
          {(messages as Record<string, unknown>[]).map(msg => (
            <div key={msg.id} className={[styles.msgWrap, msg.from === "me" ? styles.msgWrapMe : styles.msgWrapThem].join(" ")}>
              {msg.from === "them" && (
                <div className={styles.msgAvatar}>{active.contactAvatar}</div>
              )}
              <div className={[styles.bubble, msg.from === "me" ? styles.bubbleMe : styles.bubbleThem, msg.isOffer ? styles.bubbleOffer : ""].join(" ")}>
                {msg.isOffer && (
                  <div className={styles.offerHeader}>
                    <span className={styles.offerIcon}>💰</span>
                    <span className={styles.offerLabel}>Formal Offer</span>
                    <span className={styles.offerAmt}>{fmt((msg.offerAmount as number) ?? 0)}</span>
                  </div>
                )}
                <p className={styles.msgText}>{msg.text}</p>
                {msg.attachments && (msg.attachments as Record<string, string>[]).map((a, i) => (
                  <div key={i} className={styles.attachment}>
                    <span>{a.icon}</span>
                    <span className={styles.attachName}>{a.name}</span>
                    <button className={styles.attachDl}>⬇</button>
                  </div>
                ))}
                <div className={styles.msgMeta}>
                  <span className={styles.msgTime}>{msg.timestamp}</span>
                  {msg.from === "me" && msg.status && (
                    <span className={styles.msgStatus}>
                      {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Offer mode */}
        {offerMode && (
          <div className={styles.offerBar}>
            <div className={styles.offerBarLabel}>Making a formal offer</div>
            <div className={styles.offerBarRow}>
              <span className={styles.offerBarPrefix}>₦</span>
              <input
                className={styles.offerBarInput}
                type="number"
                placeholder="e.g. 295000000"
                value={offerVal}
                onChange={e => setOfferVal(e.target.value)}
              />
              <button className={styles.offerSendBtn} onClick={sendOffer} disabled={!offerVal}>
                Send Offer →
              </button>
              <button className={styles.offerCancelBtn} onClick={() => setOfferMode(false)}>Cancel</button>
            </div>
            <p className={styles.offerBarNote}>
              Sending an offer doesn't commit you — the seller must accept before escrow is initiated.
            </p>
          </div>
        )}

        {/* Input bar */}
        {!offerMode && (
          <div className={styles.inputBar}>
            <div className={styles.inputActions}>
              <button className={styles.inputAction} title="Attach file" onClick={() => alert("File picker opening…")}>📎</button>
              <button className={styles.inputAction} title="Schedule viewing" onClick={() => alert("Viewing scheduler opening…")}>📅</button>
              {active.status !== "closed" && (
                <button className={styles.offerBtn} onClick={() => setOfferMode(true)}>
                  💰 Make Offer
                </button>
              )}
            </div>
            <div className={styles.inputWrap}>
              <textarea
                className={styles.inputArea}
                placeholder={active.status === "closed" ? "This conversation is closed." : "Type a message…"}
                value={draft}
                disabled={active.status === "closed"}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(draft);
                  }
                }}
                rows={1}
              />
              <button
                className={styles.sendBtn}
                disabled={!draft.trim() || active.status === "closed"}
                onClick={() => sendMessage(draft)}
              >
                ➤
              </button>
            </div>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}
