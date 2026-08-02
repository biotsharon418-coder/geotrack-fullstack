// src/pages/osas/OsasNotifications.jsx
// Automated Notification and Reminder Module — OSAS-facing inbox. This is
// where the automatic sweep's "Student automatically flagged" notices and
// every new SOS's "Emergency Alert automation" broadcast land, so an admin
// can see them even if they aren't sitting on the Emergencies page.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

const CATEGORY_LABEL = {
  sos_alert: "SOS alert",
  flagging: "Compliance flag",
  announcement: "Announcement",
};

const CATEGORY_BADGE = {
  sos_alert: "warn",
  flagging: "warn",
  announcement: "pending",
};

export default function OsasNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    api.osas.myNotifications()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function markRead(id) {
    try {
      await api.osas.markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) { setError(err.message); }
  }

  async function markAll() {
    try {
      await api.osas.markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) { setError(err.message); }
  }

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Notifications</div>
          <div className="osas-main-sub">{unread} unread — automatic SOS alerts and flagging notices land here.</div>
        </div>
        {unread > 0 && <button className="btn" onClick={markAll}>Mark all as read</button>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : items.length === 0 ? (
          <div className="review-empty">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <div key={n.id} style={{
              padding: "12px 4px", borderBottom: "1px solid #ece7da", opacity: n.is_read ? 0.6 : 1,
              cursor: n.category === "sos_alert" ? "pointer" : "default",
            }}
              onClick={() => { if (n.category === "sos_alert") navigate("/osas/emergencies"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span className={`badge ${CATEGORY_BADGE[n.category] || "pending"}`}>
                  {CATEGORY_LABEL[n.category] || n.category}
                </span>
                <span style={{ fontSize: 11, color: "#a39c8a" }}>{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{n.title}</div>
              <div style={{ fontSize: 12.5, color: "#544f43", lineHeight: 1.5 }}>{n.message}</div>
              {!n.is_read && (
                <button className="btn" style={{ marginTop: 8, padding: "5px 10px", fontSize: 11 }}
                  onClick={(e) => { e.stopPropagation(); markRead(n.id); }}>
                  Mark as read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
