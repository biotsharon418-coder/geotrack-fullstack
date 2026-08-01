// src/pages/osas/OsasAuditLogs.jsx - Activity / Audit logs
import { useEffect, useState } from "react";
import { api } from "../../api/client";

const ACTION_COLORS = {
  create:"#3c7a5c", update:"#d4a017", delete:"#c1502e", flag:"#c1502e",
  verify:"#3c7a5c", archive:"#857d6c", unarchive:"#5a8a3c", login:"#2f5d4f",
  export:"#6b6457", lockout:"#c1502e",
};

const ACTION_LABELS = {
  create:"Created", update:"Updated", delete:"Deleted", flag:"Flagged",
  verify:"Verified", archive:"Archived", unarchive:"Unarchived",
  login:"Signed in", logout:"Signed out", export:"Exported", lockout:"Locked out",
};

export default function OsasAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, [filterAction, filterResource]);

  function load() {
    setLoading(true);
    const params = {};
    if (filterAction) params.action = filterAction;
    if (filterResource) params.resource_type = filterResource;
    api.osas.auditLogs({ ...params, limit: 100 })
      .then(setLogs)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  const filtered = logs.filter(l => {
    if (!search) return true;
    return [l.actor_name, l.resource_label, l.detail, l.action]
      .some(v => v && v.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Activity logs</div>
          <div className="osas-main-sub">Full audit trail - who did what, to which resource, and when.</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Filters */}
      <div className="card no-print" style={{marginBottom:18}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div className="field" style={{flex:1,minWidth:200,marginBottom:0}}>
            <label>Search</label>
            <input placeholder="Search by name, resource, action..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label>Action</label>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label>Resource</label>
            <select value={filterResource} onChange={e => setFilterResource(e.target.value)}>
              <option value="">All resources</option>
              {["user","student","osas_account","boarding_house","status_update","review","concern","report","email"].map(r => (
                <option key={r} value={r}>{r.replace("_"," ")}</option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={load} style={{padding:"10px 16px"}}>Refresh</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-text">Loading...</div>
        : filtered.length === 0 ? <div className="review-empty">No activity logs found.</div>
        : (
          <table>
            <tbody>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Detail</th>
              </tr>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td style={{fontSize:11,color:"#a39c8a",whiteSpace:"nowrap"}}>
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div style={{fontWeight:600,fontSize:12.5}}>{l.actor_name}</div>
                    <div style={{fontSize:11,color:"#a39c8a"}}>{l.actor_role.replace("_"," ")}</div>
                  </td>
                  <td>
                    <span style={{
                      display:"inline-block",padding:"2px 8px",borderRadius:12,
                      fontSize:11,fontWeight:700,
                      background: (ACTION_COLORS[l.action]||"#6b6457") + "22",
                      color: ACTION_COLORS[l.action]||"#6b6457",
                    }}>
                      {ACTION_LABELS[l.action]||l.action}
                    </span>
                  </td>
                  <td style={{fontSize:12}}>
                    <div style={{color:"#544f43"}}>{l.resource_type?.replace("_"," ")}</div>
                    {l.resource_label && <div style={{fontSize:11,color:"#857d6c"}}>{l.resource_label}</div>}
                  </td>
                  <td style={{fontSize:12,color:"#6b6457",maxWidth:260}}>{l.detail||"-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
