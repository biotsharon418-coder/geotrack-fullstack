// src/pages/osas/OsasReports.jsx
// Multiple checkboxes for group-by selection; all sections printed together.

import { useState } from "react";
import { api } from "../../api/client";

const MONTHS = ["", "July 2026", "June 2026", "May 2026", "April 2026"];
const GROUP_OPTIONS = [
  { value:"barangay",       label:"Barangay" },
  { value:"boarding_house", label:"Boarding house" },
  { value:"gender",         label:"Gender" },
  { value:"department",     label:"Department (course & section)" },
  { value:"monthly_status", label:"Monthly status" },
];

const SECTION_LABELS = {
  barangay:"Barangay", boarding_house:"Boarding house",
  gender:"Gender", department:"Department",
  monthly_status:"Monthly status",
};

export default function OsasReports() {
  const [selected, setSelected] = useState(["barangay"]);
  const [monthLabel, setMonthLabel] = useState("July 2026");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleGroup(val) {
    setSelected(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
    setReport(null);
  }

  function toggleAll() {
    setSelected(prev =>
      prev.length === GROUP_OPTIONS.length ? [] : GROUP_OPTIONS.map(g => g.value)
    );
    setReport(null);
  }

  async function handleGenerate() {
    if (selected.length === 0) { setError("Select at least one grouping."); return; }
    setLoading(true); setError(""); setReport(null);
    try {
      const data = await api.osas.generateTallyReport(selected, monthLabel || null);
      setReport(data);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const allChecked = selected.length === GROUP_OPTIONS.length;
  const someChecked = selected.length > 0 && !allChecked;

  return (
    <>
      <div className="osas-main-head no-print">
        <div>
          <div className="osas-main-title">Generate tally report</div>
          <div className="osas-main-sub">Select one or more groupings, then generate a student count report.</div>
        </div>
      </div>

      {error && <div className="error-banner no-print">{error}</div>}

      <div className="card no-print" style={{marginBottom:18}}>
        <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:12.5,fontWeight:700,color:"#544f43",marginBottom:10}}>Group by</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--line)"}}>
              <input type="checkbox" id="chk-all"
                checked={allChecked}
                ref={el => { if (el) el.indeterminate = someChecked; }}
                onChange={toggleAll}
                style={{width:14,height:14,cursor:"pointer"}} />
              <label htmlFor="chk-all" style={{fontSize:12.5,fontWeight:700,cursor:"pointer",color:"var(--moss-dark)"}}>
                Select all
              </label>
            </div>
            {GROUP_OPTIONS.map(g => (
              <div key={g.value} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <input type="checkbox" id={`chk-${g.value}`}
                  checked={selected.includes(g.value)}
                  onChange={() => toggleGroup(g.value)}
                  style={{width:14,height:14,cursor:"pointer"}} />
                <label htmlFor={`chk-${g.value}`} style={{fontSize:13,cursor:"pointer",color:"#544f43"}}>
                  {g.label}
                </label>
              </div>
            ))}
          </div>
          <div>
            <div className="field" style={{minWidth:200}}>
              <label>Month</label>
              <select value={monthLabel} onChange={e => { setMonthLabel(e.target.value); setReport(null); }}>
                <option value="">All months</option>
                {MONTHS.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        <button className="btn primary" style={{marginTop:14}} onClick={handleGenerate} disabled={loading||selected.length===0}>
          {loading ? "Generating…" : "Generate report"}
        </button>
      </div>

      {report && (
        <div id="tally-report-printable">
          {report.sections.map(section => (
            <div className="card" key={section.group_by} style={{marginBottom:18}}>
              <div className="panel-title">
                {SECTION_LABELS[section.group_by] || section.group_by}
                {report.month_label ? ` · ${report.month_label}` : " · All months"}
              </div>
              <table>
                <tbody>
                  <tr>
                    <th>{SECTION_LABELS[section.group_by]}</th>
                    <th>Count</th>
                    <th>Students</th>
                  </tr>
                  {section.rows.length === 0 ? (
                    <tr><td colSpan={3} style={{color:"#a39c8a"}}>No data for this selection.</td></tr>
                  ) : section.rows.map(row => (
                    <tr key={row.group_label}>
                      <td style={{verticalAlign:"top"}}>{row.group_label}</td>
                      <td style={{verticalAlign:"top"}}>{row.count}</td>
                      <td style={{fontSize:12,color:"#544f43"}}>{row.student_names?.join(", ")||"—"}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{fontWeight:700}}>Total</td>
                    <td style={{fontWeight:700}}>{section.total}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          <button className="btn primary no-print" onClick={() => window.print()}>
            Generate printable report
          </button>
        </div>
      )}
    </>
  );
}
