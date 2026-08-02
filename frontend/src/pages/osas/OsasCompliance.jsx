// src/pages/osas/OsasCompliance.jsx
// Student Compliance Monitoring Module — the backend already tracked
// monthly submissions, deadlines, and flags; this page is the missing
// OSAS-facing dashboard/history/actions front end for it.

import { useEffect, useState } from "react";
import { api } from "../../api/client";

const STATUS_BADGE = { Submitted: "ok", Pending: "pending", Missed: "warn" };

export default function OsasCompliance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    api.osas.complianceHistory(monthFilter ? { month: monthFilter } : {})
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function runAction(fn, label) {
    setBusy(true); setMsg(""); setError("");
    try {
      const res = await fn();
      setMsg(res.message || `${label} completed.`);
      load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const totals = rows.reduce((acc, r) => {
    acc[r.submission_status] = (acc[r.submission_status] || 0) + 1;
    acc.flagged += r.is_flagged ? 1 : 0;
    return acc;
  }, { Submitted: 0, Pending: 0, Missed: 0, flagged: 0 });

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Student compliance monitoring</div>
          <div className="osas-main-sub">
            Monthly boarding-house status submissions, deadlines, and flags — this now runs
            automatically every day at 00:10 UTC (new records, reminders, missed-detection, and
            flagging all happen without anyone clicking a button). Use the actions below to run it
            early or to trigger one step on its own.
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {msg && <div className="badge ok" style={{ marginBottom: 14, display: "inline-block" }}>{msg}</div>}

      <div className="osas-grid osas-stat-row" style={{ marginBottom: 20 }}>
        <div className="card osas-stat-card"><div className="stat-label">Submitted</div><div className="stat-num">{totals.Submitted}</div></div>
        <div className="card osas-stat-card"><div className="stat-label">Pending</div><div className="stat-num">{totals.Pending}</div></div>
        <div className="card osas-stat-card"><div className="stat-label">Missed</div><div className="stat-num">{totals.Missed}</div></div>
        <div className="card osas-stat-card"><div className="stat-label">Flagged</div><div className="stat-num">{totals.flagged}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="panel-title">Compliance actions</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn primary" disabled={busy}
            onClick={() => runAction(api.osas.runComplianceAutomation, "Automation sweep")}>
            Run automation now
          </button>
          <button className="btn" disabled={busy} onClick={() => runAction(api.osas.sendComplianceReminders, "Reminders sent")}>
            Send monthly reminders
          </button>
          <button className="btn" disabled={busy} onClick={() => runAction(api.osas.checkMissedSubmissions, "Missed-submission check")}>
            Check missed submissions
          </button>
          <button className="btn" disabled={busy} onClick={() => runAction(api.osas.updateComplianceFlags, "Flags updated")}>
            Recompute student flags
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="panel-title" style={{ marginBottom: 0 }}>Submission history</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Month e.g. August" value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6 }} />
            <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={load}>Filter</button>
          </div>
        </div>

        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="review-empty">No compliance records yet.</div>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Student</th>
                <th>Month</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Missed (total)</th>
                <th>Flagged</th>
              </tr>
              {rows.map((r) => (
                <tr key={`${r.student_id}-${r.month}-${r.year}`}>
                  <td>{r.student_name}<div style={{ fontSize: 11, color: "#a39c8a" }}>{r.email}</div></td>
                  <td>{r.month} {r.year}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.submission_status] || "pending"}`}>{r.submission_status}</span></td>
                  <td>{r.deadline ? new Date(r.deadline).toLocaleDateString() : "—"}</td>
                  <td>{r.missed_submissions}</td>
                  <td>{r.is_flagged ? <span className="badge warn">Flagged</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
