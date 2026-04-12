import { useState } from "react";
import toast from "react-hot-toast";
import styles from "./AlertsPage.module.css";
import {
  useSavedSearches, useDeleteSavedSearch, useUpdateSavedSearch,
  useNotifications, useMarkNotificationsRead,
} from "../../hooks/useUser";

type AlertFreq = "instant" | "daily" | "weekly";
type Channel = "email" | "sms" | "whatsapp" | "push";

const FREQ_META: Record<AlertFreq, { icon: string; label: string; desc: string }> = {
  instant: { icon: "⚡", label: "Instant", desc: "As soon as it's listed" },
  daily:   { icon: "🗓️", label: "Daily",   desc: "Once a day digest" },
  weekly:  { icon: "📅", label: "Weekly",  desc: "Weekly summary" },
};

const CH_META: Record<Channel, { icon: string; label: string }> = {
  email:    { icon: "📧", label: "Email" },
  sms:      { icon: "📱", label: "SMS" },
  whatsapp: { icon: "💬", label: "WhatsApp" },
  push:     { icon: "🔔", label: "Push" },
};

const NOTIF_ICONS: Record<string, string> = {
  new_listing: "🏠",
  price_drop: "📉",
  saved_match: "⭐",
  saved_search: "🔔",
  escrow_update: "🔒",
  message: "💬",
};

export default function AlertsPage() {
  const { data: searches = [], isLoading: searchesLoading } = useSavedSearches();
  const { data: notifData } = useNotifications();
  const notifs: Record<string, unknown>[] = Array.isArray((notifData as Record<string, unknown>)?.notifications)
    ? ((notifData as Record<string, unknown[]>).notifications as Record<string, unknown>[])
    : Array.isArray(notifData) ? (notifData as Record<string, unknown>[]) : [];
  const markAllRead = useMarkNotificationsRead();
  const deleteMutation = useDeleteSavedSearch();
  const updateMutation = useUpdateSavedSearch;
  const [activeTab, setActiveTab] = useState<"alerts" | "history" | "settings">("alerts");
  const [globalEmail, setGlobalEmail] = useState(true);
  const [globalSms, setGlobalSms] = useState(false);
  const [globalWhatsapp, setGlobalWhatsapp] = useState(true);
  const [globalPush, setGlobalPush] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const searchList = Array.isArray(searches) ? searches as Record<string, unknown>[] : [];
  const unreadCount = notifs.filter(n => !(n.isRead ?? n.read)).length;
  const totalNewMatches = searchList.reduce((a, s) => a + ((s.newMatches as number) ?? 0), 0);

  function deleteSearch(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Alert deleted"),
      onError:   () => toast.error("Could not delete alert"),
    });
  }

  function setFreq(id: string, freq: AlertFreq) {
    const update = updateMutation(id);
    update.mutate({ frequency: freq }, {
      onError: () => toast.error("Could not update frequency"),
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.title}>Property Alerts</h1>
            <p className={styles.sub}>Manage saved searches and notification preferences</p>
          </div>
          <button className={styles.newAlertBtn}>+ New Alert</button>
        </div>
      </div>

      <div className={styles.tabBar}>
        <div className={styles.tabBarInner}>
          <button className={[styles.tabBtn, activeTab === "alerts" ? styles.tabBtnActive : ""].join(" ")} onClick={() => setActiveTab("alerts")}>
            🔔 Saved Alerts
            {totalNewMatches > 0 && <span className={styles.tabBadge}>{totalNewMatches}</span>}
          </button>
          <button className={[styles.tabBtn, activeTab === "history" ? styles.tabBtnActive : ""].join(" ")} onClick={() => setActiveTab("history")}>
            📋 Notification History
            {unreadCount > 0 && <span className={styles.tabBadge}>{unreadCount}</span>}
          </button>
          <button className={[styles.tabBtn, activeTab === "settings" ? styles.tabBtnActive : ""].join(" ")} onClick={() => setActiveTab("settings")}>
            ⚙️ Global Settings
          </button>
        </div>
      </div>

      <div className={styles.body}>

        {/* SAVED ALERTS */}
        {activeTab === "alerts" && (
          <div className={styles.alertsWrap}>
            {searchesLoading && (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading alerts…</div>
            )}
            {!searchesLoading && searchList.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🔕</span>
                <h3 className={styles.emptyTitle}>No saved alerts yet</h3>
                <p className={styles.emptySub}>Set up alerts to be notified when properties matching your criteria are listed.</p>
                <button className={styles.newAlertBtn}>+ Create your first alert</button>
              </div>
            )}
            {searchList.map(s => (
              <div key={s.id as string} className={[styles.alertCard, !(s.active ?? s.isActive) ? styles.alertCardOff : ""].join(" ")}>
                <div className={styles.alertCardTop}>
                  <div className={styles.alertMeta}>
                    <div className={styles.alertName}>{s.name as string}</div>
                    <div className={styles.alertDetails}>
                      {s.category && <span className={styles.alertPill}>{s.category as string}</span>}
                      {(s.state || s.location) && <span className={styles.alertPill}>📍 {(s.state ?? s.location) as string}</span>}
                      {(s.minPrice || s.maxPrice) && (
                        <span className={styles.alertPill}>
                          💰 {s.minPrice ? `₦${((s.minPrice as number)/1_000_000).toFixed(0)}M` : "Any"} – {s.maxPrice ? `₦${((s.maxPrice as number)/1_000_000).toFixed(0)}M` : "Any"}
                        </span>
                      )}
                    </div>
                  </div>
                  {(s.newMatches as number) > 0 && (
                    <span className={styles.matchBadge}>{s.newMatches as number} new matches</span>
                  )}
                  <div className={styles.alertToggle}>
                    <div className={[styles.toggleTrack, (s.active ?? s.isActive) ? styles.toggleTrackOn : ""].join(" ")}>
                      <div className={styles.toggleThumb} />
                    </div>
                  </div>
                </div>

                {editingId === s.id ? (
                  <div className={styles.alertEdit}>
                    <div className={styles.editSection}>
                      <div className={styles.editLabel}>Alert frequency</div>
                      <div className={styles.freqRow}>
                        {(["instant", "daily", "weekly"] as AlertFreq[]).map(f => (
                          <button
                            key={f}
                            className={[styles.freqBtn, (s.frequency ?? s.alertFrequency) === f ? styles.freqBtnOn : ""].join(" ")}
                            onClick={() => setFreq(s.id as string, f)}
                          >
                            <span>{FREQ_META[f].icon}</span>
                            <span className={styles.freqBtnLabel}>{FREQ_META[f].label}</span>
                            <span className={styles.freqBtnDesc}>{FREQ_META[f].desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className={styles.doneBtn} onClick={() => setEditingId(null)}>Done ✓</button>
                  </div>
                ) : (
                  <div className={styles.alertCardBottom}>
                    <div className={styles.alertFreq}>
                      {FREQ_META[(s.frequency ?? "daily") as AlertFreq]?.icon} {FREQ_META[(s.frequency ?? "daily") as AlertFreq]?.label}
                    </div>
                    <div className={styles.alertCardActions}>
                      <button className={styles.editAlertBtn} onClick={() => setEditingId(s.id as string)}>Edit</button>
                      <button className={styles.deleteAlertBtn} onClick={() => deleteSearch(s.id as string)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* NOTIFICATION HISTORY */}
        {activeTab === "history" && (
          <div className={styles.historyWrap}>
            <div className={styles.historyTopRow}>
              <div className={styles.historyCount}>{notifs.length} notifications · {unreadCount} unread</div>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={() => markAllRead.mutate()}>Mark all as read</button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No notifications yet.</div>
            ) : (
              <div className={styles.notifList}>
                {notifs.map(n => (
                  <div
                    key={n.id as string}
                    className={[styles.notifCard, !(n.isRead ?? n.read) ? styles.notifCardUnread : ""].join(" ")}
                  >
                    <div className={styles.notifIcon}>{NOTIF_ICONS[(n.type as string)] ?? "🔔"}</div>
                    <div className={styles.notifBody}>
                      <div className={styles.notifTitle}>{(n.title ?? n.message) as string}</div>
                      {n.body && <div className={styles.notifDesc}>{n.body as string}</div>}
                      <div className={styles.notifMeta}>
                        <span className={styles.notifTime}>{new Date(n.createdAt as string).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                    {!(n.isRead ?? n.read) && <div className={styles.unreadDot} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GLOBAL SETTINGS */}
        {activeTab === "settings" && (
          <div className={styles.settingsWrap}>
            <div className={styles.settingsSection}>
              <div className={styles.settingsSectionTitle}>Notification Channels</div>
              <p className={styles.settingsSectionDesc}>Choose how you want to receive property alerts. You can override these per saved search.</p>

              {([
                { key: "email",    state: globalEmail,    setState: setGlobalEmail,    icon: "📧", title: "Email Alerts",       desc: "Receive alerts at your registered email address" },
                { key: "sms",      state: globalSms,      setState: setGlobalSms,      icon: "📱", title: "SMS Alerts",         desc: "Text messages to your verified phone number" },
                { key: "whatsapp", state: globalWhatsapp, setState: setGlobalWhatsapp, icon: "💬", title: "WhatsApp Alerts",    desc: "Rich media alerts via WhatsApp" },
                { key: "push",     state: globalPush,     setState: setGlobalPush,     icon: "🔔", title: "Push Notifications", desc: "Instant browser or app notifications" },
              ]).map(opt => (
                <div key={opt.key} className={styles.settingRow}>
                  <div className={styles.settingIcon}>{opt.icon}</div>
                  <div className={styles.settingInfo}>
                    <div className={styles.settingTitle}>{opt.title}</div>
                    <div className={styles.settingDesc}>{opt.desc}</div>
                  </div>
                  <div className={styles.settingToggle} onClick={() => opt.setState(!opt.state)}>
                    <div className={[styles.toggleTrack, opt.state ? styles.toggleTrackOn : ""].join(" ")}>
                      <div className={styles.toggleThumb} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
