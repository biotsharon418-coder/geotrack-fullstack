// src/pages/osas/OsasAnnouncements.jsx
//
// Announcement Notification feature: OSAS composes a message and sends it
// by email to all students, or just the ones currently flagged. A short
// history of past announcements (reused from the audit log) sits below.

import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function OsasAnnouncements() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  function loadHistory() {
    setLoadingHistory(true);
    api.osas.announcementHistory()
      .then(setHistory)
      .catch(err => setError(err.message))
      .finally(() => setLoadingHistory(false));
  }

  useEffect(() => { loadHistory(); }, []);

  async function handleSend(e) {
    e.preventDefault();
    setError(""); setResult(null); setSending(true);
    try {
      const r = await api.osas.sendAnnouncement({ subject, message, audience });
      setResult(r);
      setSubject(""); setMessage("");
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Announcements</div>
          <div className="osas-main-sub">
            Send a message by email to all students, or just the ones currently flagged.
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {result && (
        <div className="error-banner" style={{ background:"#e1f0e6", color:"#2f5d3f" }}>
          Sent to {result.sent} of {result.recipients} recipient(s).
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <form onSubmit={handleSend}>
          <div className="field">
            <label>Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)}>
              <option value="all">All students</option>
              <option value="flagged">Flagged students only</option>
            </select>
          </div>
          <div className="field">
            <label>Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Water interruption this weekend" required />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Write the announcement..." required rows={5} />
          </div>
          <button className="btn primary" type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send announcement"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="panel-title" style={{ marginBottom: 10 }}>Sent history</div>
        {loadingHistory ? (
          <div className="loading-text">Loading...</div>
        ) : history.length === 0 ? (
          <div className="review-empty">No announcements sent yet.</div>
        ) : (
          history.map(h => (
            <div key={h.id} style={{ padding: "10px 0", borderBottom: "1px solid #ece7da" }}>
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>{h.subject}</div>
              <div style={{ fontSize: 12, color: "#6b6457", marginTop: 2 }}>{h.detail}</div>
              <div style={{ fontSize: 11, color: "#a39c8a", marginTop: 2 }}>
                {h.sent_by} - {new Date(h.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
