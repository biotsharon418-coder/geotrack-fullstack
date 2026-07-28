// src/pages/osas/OsasDashboard.jsx — with charts, stats, recent activities
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import OsasGeoMap from "../../components/OsasGeoMap";

const COLORS = ["#2f5d4f","#c1502e","#d4a017","#5a8a3c","#6b6457","#203f36","#e07b39","#3c7a5c"];

function ActionIcon({ action }) {
  const icons = { create:"✚", update:"✎", delete:"✕", flag:"⚑", verify:"✔", archive:"📦", login:"→", logout:"←", export:"↓" };
  return <span style={{marginRight:6}}>{icons[action]||"•"}</span>;
}

export default function OsasDashboard() {
  const { fullName } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.osas.dashboard().then(setStats).catch(err => setError(err.message));
    api.osas.allStatusUpdates({ is_flagged: true })
      .then(setFlagged).catch(() => {});
  }, []);

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">OSAS Dashboard</div>
          <div className="osas-main-sub">Real-time view of all off-campus students, San Pablo City.</div>
        </div>
        <div className="osas-user-chip">
          <div className="osas-avatar">{(fullName||"OS").slice(0,2).toUpperCase()}</div> {fullName}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {stats && (
        <>
          {/* ── Stat cards ── */}
          <div className="osas-grid osas-stat-row">
            {[
              { label:"Total students",       val:stats.total_students,         tag:"registered accounts",  color:"var(--ink)" },
              { label:"Updates submitted",    val:stats.updates_submitted,      tag:"all-time total",       color:"var(--ink)" },
              { label:"Flagged students",     val:stats.flagged_students,       tag:"needs follow-up",      color:"var(--pin)" },
              { label:"Pending verifications",val:stats.pending_verifications,  tag:"boarding houses",      color:"var(--warn)" },
            ].map(s => (
              <div className="card osas-stat-card" key={s.label}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-num" style={{color:s.color}}>{s.val}</div>
                <div className="stat-tag warn">{s.tag}</div>
              </div>
            ))}
          </div>

          {/* ── Map + Flagged ── */}
          <div className="osas-grid osas-two-col" style={{marginBottom:18}}>
            <div className="card">
              <div className="panel-title">Geo-tagged student locations</div>
              <OsasGeoMap height={300} />
              <div className="btn-row" style={{marginTop:14,display:"flex",gap:10}}>
                <button className="btn primary" onClick={() => navigate("/osas/status-updates")}>Open full map</button>
                <button className="btn" onClick={() => navigate("/osas/verification")}>Manage boarding houses</button>
              </div>
            </div>
            <div className="card">
              <div className="panel-title">Flagged students</div>
              {flagged.length === 0
                ? <div className="review-empty">No flagged students right now.</div>
                : <table><tbody>
                    <tr><th>Student</th><th>Reason</th><th></th></tr>
                    {flagged.slice(0,6).map(u => (
                      <tr key={u.id}>
                        <td>{u.student_name}</td>
                        <td style={{fontSize:12,color:"#6b6457"}}>{u.flag_reason||"—"}</td>
                        <td><span className="badge warn">Flagged</span></td>
                      </tr>
                    ))}
                  </tbody></table>
              }
            </div>
          </div>

          {/* ── Charts ── */}
          <div className="osas-grid osas-two-col" style={{marginBottom:18}}>
            <div className="card">
              <div className="panel-title">Students by gender</div>
              {stats.by_gender.length === 0
                ? <div className="review-empty">No data yet.</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.by_gender} dataKey="count" nameKey="label"
                           cx="50%" cy="50%" outerRadius={80} label={({label,count})=>`${label}: ${count}`}>
                        {stats.by_gender.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </div>
            <div className="card">
              <div className="panel-title">Students by department</div>
              {stats.by_department.length === 0
                ? <div className="review-empty">No data yet.</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.by_department} margin={{top:5,right:10,left:-20,bottom:20}}>
                      <XAxis dataKey="label" tick={{fontSize:10}} angle={-25} textAnchor="end" />
                      <YAxis tick={{fontSize:10}} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Students" fill="#2f5d4f" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>

          <div className="osas-grid osas-two-col" style={{marginBottom:18}}>
            <div className="card">
              <div className="panel-title">Students by barangay</div>
              {stats.by_barangay.length === 0
                ? <div className="review-empty">No location data yet.</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.by_barangay} layout="vertical" margin={{top:5,right:20,left:80,bottom:5}}>
                      <XAxis type="number" tick={{fontSize:10}} allowDecimals={false} />
                      <YAxis dataKey="label" type="category" tick={{fontSize:9}} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" name="Students" fill="#c1502e" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
            <div className="card">
              <div className="panel-title">Monthly status breakdown</div>
              {stats.by_status.length === 0
                ? <div className="review-empty">No status updates yet.</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.by_status} dataKey="count" nameKey="label"
                           cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                           label={({label,count})=>`${label}: ${count}`}>
                        {stats.by_status.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>

          {/* ── Recent activities ── */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div className="panel-title" style={{marginBottom:0}}>Latest activities</div>
              <button className="btn" style={{fontSize:12,padding:"5px 12px"}}
                onClick={() => navigate("/osas/audit-logs")}>View all →</button>
            </div>
            {stats.recent_activities.length === 0
              ? <div className="review-empty">No activity yet.</div>
              : stats.recent_activities.map(a => (
                  <div key={a.id} style={{
                    display:"flex",alignItems:"flex-start",gap:10,
                    padding:"10px 0",borderBottom:"1px solid #ece7da",
                  }}>
                    <div style={{
                      width:32,height:32,borderRadius:"50%",background:"#eef1e9",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:13,flexShrink:0,color:"var(--moss-dark)",fontWeight:700,
                    }}>
                      <ActionIcon action={a.action} />
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600}}>
                        <span style={{color:"var(--moss-dark)"}}>{a.actor}</span>
                        {" "}<span style={{fontWeight:400,color:"#6b6457"}}>{a.action}d</span>
                        {a.resource_label && <>{" "}<span style={{color:"var(--ink)"}}>{a.resource_label}</span></>}
                      </div>
                      {a.detail && <div style={{fontSize:11.5,color:"#a39c8a",marginTop:2}}>{a.detail}</div>}
                    </div>
                    <div style={{fontSize:11,color:"#a39c8a",flexShrink:0,paddingTop:2}}>
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
            }
          </div>
        </>
      )}
    </>
  );
}
