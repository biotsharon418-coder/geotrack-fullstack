// src/pages/osas/OsasEmergencies.jsx
//
// Emergency Assistance / SOS module (OSAS side). Lists every SOS case
// students have triggered, filterable by status, with an expandable
// detail panel showing the full timeline and controls to update status
// or add a response note. Case Status + Response Tracking + Emergency
// History all live here.

import { useEffect, useRef, useState, Fragment } from "react";
import { api } from "../../api/client";

const POLL_INTERVAL_MS = 12000; // near-real-time refresh for new SOS alerts / live location pings

function collapseLocationPings(entries) {
  const lastLocationIdx = entries.map(e => e.event).lastIndexOf("Location updated");
  return entries.filter((e, i) => e.event !== "Location updated" || i === lastLocationIdx);
}

function timeAgo(dateStr) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const STATUS_FILTERS = ["All", "Active", "Responding", "Resolved", "Cancelled"];
const STATUS_ACTIONS = ["Active", "Responding", "Resolved", "Cancelled"];

const STATUS_STYLE = {
  Active:     { bg: "#fbe4dc", color: "#7a3a23" },
  Responding: { bg: "#fdeecb", color: "#8a6414" },
  Resolved:   { bg: "#e1f0e6", color: "#2f5d3f" },
  Cancelled:  { bg: "#eee9dd", color: "#6b6457" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Active;
  return (
    <span style={{
      display:"inline-block", padding:"3px 10px", borderRadius:999,
      fontSize:11, fontWeight:700, background:s.bg, color:s.color,
    }}>{status}</span>
  );
}

export default function OsasEmergencies() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [freshIds, setFreshIds] = useState(new Set());
  const knownIdsRef = useRef(null);

  function load(isPoll = false) {
    if (!isPoll) setLoading(true);
    api.osas.listEmergencies(filter === "All" ? null : filter)
      .then(list => {
        if (knownIdsRef.current) {
          const newlySeen = list.filter(c => c.status === "Active" && !knownIdsRef.current.has(c.id));
          if (newlySeen.length) {
            setFreshIds(prev => new Set([...prev, ...newlySeen.map(c => c.id)]));
          }
        }
        knownIdsRef.current = new Set(list.map(c => c.id));
        setCases(list);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    knownIdsRef.current = null;
    load();
    const id = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleStatusChange(caseId, status) {
    setSavingId(caseId);
    try {
      await api.osas.updateEmergencyStatus(caseId, { status, note: null });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleAddNote(caseId) {
    if (!noteDraft.trim()) return;
    setSavingId(caseId);
    try {
      await api.osas.addEmergencyNote(caseId, noteDraft.trim());
      setNoteDraft("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  const activeCount = cases.filter(c => c.status === "Active").length;

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Emergency / SOS cases</div>
          <div className="osas-main-sub">
            Every SOS alert students have sent, with live status and response tracking.
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {activeCount > 0 && (
        <div className="error-banner" style={{ background:"#fbe4dc", color:"#7a3a23", fontWeight:700 }}>
          {activeCount} unattended active emergenc{activeCount===1?"y":"ies"} - please respond.
        </div>
      )}

      <div className="pill-row" style={{ marginBottom: 14 }}>
        {STATUS_FILTERS.map(s => (
          <button key={s} className="btn" onClick={() => setFilter(s)}
            style={{
              fontSize:12, padding:"7px 12px",
              background: filter===s ? "var(--moss-dark)" : "transparent",
              color: filter===s ? "#fff" : "inherit",
              borderColor: filter===s ? "var(--moss-dark)" : undefined,
            }}>
            {s}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : cases.length === 0 ? (
          <div className="review-empty">No emergency cases{filter!=="All" ? ` with status "${filter}"` : ""}.</div>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Student</th>
                <th>Category</th>
                <th>Location</th>
                <th>Reported</th>
                <th>Status</th>
                <th></th>
              </tr>
              {cases.map(c => {
                const collapsedTimeline = collapseLocationPings(c.timeline);
                const lastLocationEntry = [...c.timeline].reverse().find(e => e.event === "Location updated");
                const isFresh = freshIds.has(c.id);
                return (
                <Fragment key={c.id}>
                  <tr key={c.id} style={isFresh ? { background:"#fbe4dc" } : undefined}>
                    <td>
                      {isFresh && <span className="badge warn" style={{ marginRight:6 }}>New</span>}
                      {c.student_name}
                      <div style={{ fontSize: 11, color: "#a39c8a" }}>{c.student_email}</div>
                    </td>
                    <td>{c.category}</td>
                    <td style={{ fontSize: 11.5 }}>
                      {c.latitude
                        ? <>
                            <a href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}`}
                               target="_blank" rel="noreferrer" style={{ color:"var(--moss)" }}>
                              {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                            </a>
                            {(c.status === "Active" || c.status === "Responding") && lastLocationEntry && (
                              <div style={{ color:"#2f5d3f", fontWeight:700, marginTop:2 }}>
                                Live - updated {timeAgo(lastLocationEntry.created_at)}
                              </div>
                            )}
                          </>
                        : <span style={{ color:"#a39c8a" }}>Not shared</span>}
                    </td>
                    <td style={{ fontSize: 11.5 }}>{new Date(c.created_at).toLocaleString()}</td>
                    <td>
                      <select
                        value={c.status}
                        disabled={savingId === c.id}
                        onChange={(e) => handleStatusChange(c.id, e.target.value)}
                        style={{ padding: "6px 8px", fontSize: 12 }}
                      >
                        {STATUS_ACTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="btn" style={{ fontSize:11.5, padding:"5px 10px" }}
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                        {expandedId === c.id ? "Hide" : "Details"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr key={`${c.id}-detail`}>
                      <td colSpan={6} style={{ background:"#f6f4ee", padding:16 }}>
                        {c.details && (
                          <div style={{ fontSize:12.5, color:"#544f43", marginBottom:12 }}>
                            <strong>Student's note:</strong> {c.details}
                          </div>
                        )}
                        <div className="panel-title" style={{ fontSize:12.5, marginBottom:8 }}>Timeline</div>
                        {collapsedTimeline.map((e, i) => (
                          <div key={e.id} style={{ display:"flex", gap:10, marginBottom: i===collapsedTimeline.length-1?0:8 }}>
                            <div style={{
                              width:8, height:8, borderRadius:"50%", marginTop:4, flexShrink:0,
                              background: e.actor_role==="osas_admin" ? "var(--moss)" : "var(--pin)",
                            }}/>
                            <div>
                              <div style={{ fontSize:12, fontWeight:700 }}>{e.event}</div>
                              {e.note && <div style={{ fontSize:11.5, color:"#6b6457" }}>{e.note}</div>}
                              <div style={{ fontSize:10.5, color:"#a39c8a" }}>
                                {e.actor_name} - {new Date(e.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div style={{ display:"flex", gap:8, marginTop:14 }}>
                          <input type="text" value={noteDraft} onChange={e=>setNoteDraft(e.target.value)}
                            placeholder="Add a response note..." style={{ flex:1, padding:"8px 10px", fontSize:12.5 }} />
                          <button className="btn" disabled={savingId===c.id || !noteDraft.trim()}
                            onClick={() => handleAddNote(c.id)}>Add note</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
