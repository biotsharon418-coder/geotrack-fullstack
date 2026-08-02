// src/pages/osas/OsasPrivacy.jsx
// Data Privacy and Consent Management Module — shows which students have
// agreed to the Data Privacy Act consent form and location sharing, per
// RA 10173. Audit trail / access logs are covered by the existing
// Activity logs page (AuditLog table), linked below.
// Also hosts the Announcement Notification composer for the Automated
// Notification and Reminder Module, since both are OSAS-to-student
// broadcast tools.

import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function OsasPrivacy() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    api.osas.consentLogs()
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleAnnounce(e) {
    e.preventDefault();
    setSending(true); setSent(""); setError("");
    try {
      const res = await api.osas.sendAnnouncement({ title, message });
      setSent(`Sent to ${res.recipients} students.`);
      setTitle(""); setMessage("");
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  const agreedCount = logs.filter((l) => l.data_privacy_agreed).length;

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Data privacy & announcements</div>
          <div className="osas-main-sub">Consent status under the Data Privacy Act (RA 10173), and system-wide announcements.</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="osas-grid osas-two-col">
        <div className="card">
          <div className="panel-title">Send announcement</div>
          <form onSubmit={handleAnnounce}>
            <div className="field">
              <label>Title</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Message</label>
              <textarea required value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <button className="btn primary" type="submit" disabled={sending}>
              {sending ? "Sending..." : "Broadcast to all students"}
            </button>
            {sent && <span className="badge ok" style={{ marginLeft: 10 }}>{sent}</span>}
          </form>
        </div>

        <div className="card">
          <div className="panel-title">Consent overview</div>
          <div style={{ fontSize: 13, color: "#544f43", marginBottom: 10 }}>
            {agreedCount} of {logs.length} students have agreed to the data privacy consent form.
          </div>
          <div style={{ fontSize: 12, color: "#857d6c" }}>
            Full audit trail of every account action (who did what, when) is on the
            {" "}<a href="/osas/audit-logs">Activity logs</a> page.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="panel-title">Student consent records</div>
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="review-empty">No consent records yet.</div>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Student</th>
                <th>Data privacy consent</th>
                <th>Location sharing consent</th>
                <th>Agreed at</th>
                <th>Policy version</th>
              </tr>
              {logs.map((l) => (
                <tr key={l.student_id}>
                  <td>{l.student_name}<div style={{ fontSize: 11, color: "#a39c8a" }}>{l.email}</div></td>
                  <td><span className={`badge ${l.data_privacy_agreed ? "ok" : "warn"}`}>{l.data_privacy_agreed ? "Agreed" : "Not yet"}</span></td>
                  <td><span className={`badge ${l.location_sharing_agreed ? "ok" : "warn"}`}>{l.location_sharing_agreed ? "Agreed" : "Not yet"}</span></td>
                  <td>{l.agreed_at ? new Date(l.agreed_at).toLocaleString() : "—"}</td>
                  <td>{l.policy_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
