// src/pages/student/StudentNotifications.jsx
// Automated Notification and Reminder Module — student-facing inbox for
// monthly reminders, final reminders, approval/rejection notices,
// emergency alerts, flagging notices, and OSAS announcements.

import { useEffect, useState } from "react";
import { api } from "../../api/client";

const CATEGORY_LABEL = {
  monthly_reminder: "Monthly reminder",
  final_reminder: "Final reminder",
  approval: "Approval",
  rejection: "Rejection",
  emergency_alert: "Emergency",
  flagging: "Compliance flag",
  announcement: "Announcement",
  resolution: "Concern resolved",
};

const CATEGORY_BADGE = {
  monthly_reminder: "pending",
  final_reminder: "warn",
  approval: "ok",
  rejection: "warn",
  emergency_alert: "warn",
  flagging: "warn",
  announcement: "pending",
  resolution: "ok",
};

export default function StudentNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    api.student.myNotifications()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function markRead(id) {
    try {
      await api.student.markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) { setError(err.message); }
  }

  async function markAll() {
    try {
      await api.student.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) { setError(err.message); }
  }

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div style={{ padding: 20 }}>
      <div className="osas-main-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="osas-main-title" style={{ fontSize: 22 }}>Notifications</div>
          <div className="osas-main-sub">{unread} unread</div>
        </div>
        {unread > 0 && <button className="btn" onClick={markAll}>Mark all as read</button>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-text">Loading...</div>
      ) : items.length === 0 ? (
        <div className="review-empty">No notifications yet.</div>
      ) : (
        items.map((n) => (
          <div key={n.id} className="card" style={{ marginBottom: 10, opacity: n.is_read ? 0.65 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span className={`badge ${CATEGORY_BADGE[n.category] || "pending"}`}>
                {CATEGORY_LABEL[n.category] || n.category}
              </span>
              <span style={{ fontSize: 11, color: "#a39c8a" }}>{new Date(n.created_at).toLocaleString()}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
            <div style={{ fontSize: 13, color: "#544f43", lineHeight: 1.5 }}>{n.message}</div>
            {!n.is_read && (
              <button className="btn" style={{ marginTop: 10, padding: "5px 10px", fontSize: 11 }}
                onClick={() => markRead(n.id)}>
                Mark as read
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
