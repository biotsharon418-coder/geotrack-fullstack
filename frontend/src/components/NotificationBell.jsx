// src/components/NotificationBell.jsx
// Small unread-count indicator used in the student layout; links through
// to the full notifications inbox.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      api.student.myNotifications()
        .then((items) => { if (!cancelled) setUnread(items.filter((n) => !n.is_read).length); })
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <Link
      to="/student/notifications"
      className="nav-btn"
      style={{ position: "relative", textDecoration: "none" }}
    >
      <div className="ic"></div>
      Notifications
      {unread > 0 && (
        <span style={{
          background: "var(--pin)", color: "#fff", borderRadius: 20,
          fontSize: 10, fontWeight: 700, padding: "1px 6px", marginLeft: 6,
        }}>
          {unread}
        </span>
      )}
    </Link>
  );
}
