// src/components/NotificationBell.jsx
// Small unread-count indicator used in the student and OSAS layouts; links
// through to the full notifications inbox for whichever role it's used in.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function NotificationBell({ role = "student", className = "nav-btn" }) {
  const [unread, setUnread] = useState(0);
  const isOsas = role === "osas";
  const to = isOsas ? "/osas/notifications" : "/student/notifications";
  const fetchFn = isOsas ? api.osas.myNotifications : api.student.myNotifications;

  useEffect(() => {
    let cancelled = false;
    function poll() {
      fetchFn()
        .then((items) => { if (!cancelled) setUnread(items.filter((n) => !n.is_read).length); })
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <Link
      to={to}
      className={className}
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
