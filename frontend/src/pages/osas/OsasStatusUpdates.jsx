// src/pages/osas/OsasStatusUpdates.jsx - with search + filter panel
import { useEffect, useState } from "react";
import { api } from "../../api/client";

const MONTHS = ["July 2026","June 2026","May 2026","April 2026"];

export default function OsasStatusUpdates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // Filters
  const [search,     setSearch]     = useState("");
  const [isVerified, setIsVerified] = useState("");
  const [isFlagged,  setIsFlagged]  = useState("");
  const [gender,     setGender]     = useState("");
  const [month,      setMonth]      = useState("");

  useEffect(() => { load(); }, [isVerified, isFlagged, gender, month]);

  function load() {
    setLoading(true);
    const params = {};
    if (isFlagged  !== "") params.is_flagged  = isFlagged === "true";
    if (isVerified !== "") params.is_verified = isVerified === "true";
    if (gender)            params.gender      = gender;
    if (month)             params.month_label = month;
    api.osas.allStatusUpdates(params)
      .then(setUpdates)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleFlag(uid) {
    const reason = window.prompt("Reason for flagging this student?");
    if (!reason) return;
    if (!window.confirm(`Flag this student?\nReason: ${reason}`)) return;
    try { await api.osas.flagStatusUpdate(uid, reason); load(); }
    catch(err) { setError(err.message); }
  }

  function clearFilters() {
    setSearch(""); setIsVerified(""); setIsFlagged(""); setGender(""); setMonth("");
  }

  const displayed = updates.filter(u => {
    if (!search) return true;
    return u.student_name.toLowerCase().includes(search.toLowerCase()) ||
           u.student_email.toLowerCase().includes(search.toLowerCase());
  });

  const activeFilters = [isVerified, isFlagged, gender, month].filter(Boolean).length;

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Student status monitor</div>
          <div className="osas-main-sub">Every monthly check-in, with search and filter controls.</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* -- Filter panel -- */}
      <div className="card" style={{marginBottom:18}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div className="field" style={{flex:1,minWidth:200,marginBottom:0}}>
            <label>Search student</label>
            <input placeholder="Name or email..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label>Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">All months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field" style={{marginBottom:0}}>
            <label>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">All genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {/* -- Checkbox filters -- */}
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:14,paddingTop:12,borderTop:"1px solid var(--line)"}}>
          {[
            { label:"Verified",   state:isVerified, setter:setIsVerified, trueVal:"true",  falseVal:"false" },
            { label:"Pending",    state:isVerified, setter:setIsVerified, trueVal:"false", falseVal:"true"  },
            { label:"Flagged",    state:isFlagged,  setter:setIsFlagged,  trueVal:"true",  falseVal:"false" },
          ].map(({ label, state, setter, trueVal, falseVal }) => {
            const checked = state === trueVal;
            return (
              <label key={label} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={checked}
                  onChange={() => setter(checked ? "" : trueVal)}
                  style={{width:14,height:14}} />
                {label}
              </label>
            );
          })}
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
            <input type="checkbox" checked={gender==="male"}
              onChange={() => setGender(gender==="male" ? "" : "male")} style={{width:14,height:14}} />
            Male
          </label>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
            <input type="checkbox" checked={gender==="female"}
              onChange={() => setGender(gender==="female" ? "" : "female")} style={{width:14,height:14}} />
            Female
          </label>
          {MONTHS.slice(0,3).map(m => (
            <label key={m} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
              <input type="checkbox" checked={month===m}
                onChange={() => setMonth(month===m ? "" : m)} style={{width:14,height:14}} />
              {m}
            </label>
          ))}
          {activeFilters > 0 && (
            <button onClick={clearFilters} style={{
              background:"none",border:"none",color:"var(--pin)",cursor:"pointer",
              fontSize:12.5,fontFamily:"inherit",fontWeight:700,padding:0
            }}>x Clear filters ({activeFilters})</button>
          )}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-text">Loading...</div>
        : displayed.length === 0 ? <div className="review-empty">No results for the current filters.</div>
        : (
          <table>
            <tbody>
              <tr>
                <th>Student</th><th>Month</th><th>Status</th>
                <th>Note</th><th></th>
              </tr>
              {displayed.map(u => (
                <tr key={u.id}>
                  <td>
                    {u.student_name}
                    <div style={{fontSize:11,color:"#a39c8a"}}>{u.student_email}</div>
                  </td>
                  <td>{u.month_label}</td>
                  <td>
                    {u.status_type==="same"       && "Same boarding house"}
                    {u.status_type==="transferred" && `Transferred -> ${u.new_boarding_house_name||""}${u.new_barangay ? ` (${u.new_barangay})` : ""}`}
                    {u.status_type==="moved_home"  && "Moved back home"}
                  </td>
                  <td style={{maxWidth:200,fontSize:12,color:"#6b6457"}}>{u.note||"-"}</td>
                  <td>
                    {u.is_flagged
                      ? <span className="badge warn" title={u.flag_reason}>Flagged</span>
                      : <button className="btn" style={{padding:"5px 10px",fontSize:11}}
                          onClick={() => handleFlag(u.id)}>Flag</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && displayed.length > 0 && (
          <div style={{fontSize:11.5,color:"#a39c8a",marginTop:10}}>
            Showing {displayed.length} of {updates.length} record(s)
          </div>
        )}
      </div>
    </>
  );
}
