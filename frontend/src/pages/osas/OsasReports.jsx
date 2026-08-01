// src/pages/osas/OsasReports.jsx - multi-select grouping, charts, preview, PDF/Excel/CSV export
import { useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../../api/client";

const MONTHS = [
  "",
  new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
  "July 2026",
  "June 2026",
  "May 2026",
  "April 2026"
];
const GROUP_OPTIONS = [
  { value:"barangay",       label:"Barangay" },
  { value:"boarding_house", label:"Boarding house" },
  { value:"gender",         label:"Gender" },
  { value:"department",     label:"Department (course & section)" },
  { value:"monthly_status", label:"Monthly status" },
];
const COLORS = ["#2f5d4f","#c1502e","#d4a017","#5a8a3c","#6b6457","#203f36","#e07b39","#3c7a5c"];
const SECTION_LABELS = { barangay:"Barangay", boarding_house:"Boarding house",
  gender:"Gender", department:"Department", monthly_status:"Monthly status" };

export default function OsasReports() {
  const [selected, setSelected] = useState(["barangay"]);
  const [monthLabel, setMonthLabel] = useState(new Date().toLocaleString("en-US", { 
  month: "long", 
  year: "numeric" 
}));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  function toggleGroup(val) {
    setSelected(prev => prev.includes(val) ? prev.filter(v=>v!==val) : [...prev,val]);
    setReport(null);
  }
  function toggleAll() {
    setSelected(prev => prev.length===GROUP_OPTIONS.length ? [] : GROUP_OPTIONS.map(g=>g.value));
    setReport(null);
  }

  async function handleGenerate() {
    if (!selected.length) { setError("Select at least one grouping."); return; }
    setLoading(true); setError(""); setReport(null); setShowPreview(false);
    try {
      const data = await api.osas.generateTallyReport(selected, monthLabel||null);
      setReport(data); setShowPreview(true);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function handleExport(fmt) {
    const url = api.osas.exportURL(fmt, selected, monthLabel||null);
    // Append auth token as query param since we can't set headers on an anchor download
    window.open(url, "_blank");
  }

  const allChecked = selected.length === GROUP_OPTIONS.length;
  const someChecked = selected.length > 0 && !allChecked;

  return (
    <>
      <div className="osas-main-head no-print">
        <div>
          <div className="osas-main-title">Generate tally report</div>
          <div className="osas-main-sub">Select groupings, preview the report, then export as PDF, Excel, or CSV.</div>
        </div>
      </div>

      {error && <div className="error-banner no-print">{error}</div>}

      <div className="card no-print" style={{marginBottom:18}}>
        <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:12.5,fontWeight:700,color:"#544f43",marginBottom:10}}>Group by</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--line)"}}>
              <input type="checkbox" id="chk-all" checked={allChecked}
                ref={el => { if(el) el.indeterminate = someChecked; }}
                onChange={toggleAll} style={{width:14,height:14,cursor:"pointer"}} />
              <label htmlFor="chk-all" style={{fontSize:12.5,fontWeight:700,cursor:"pointer",color:"var(--moss-dark)"}}>Select all</label>
            </div>
            {GROUP_OPTIONS.map(g => (
              <div key={g.value} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <input type="checkbox" id={`chk-${g.value}`} checked={selected.includes(g.value)}
                  onChange={() => toggleGroup(g.value)} style={{width:14,height:14,cursor:"pointer"}} />
                <label htmlFor={`chk-${g.value}`} style={{fontSize:13,cursor:"pointer",color:"#544f43"}}>{g.label}</label>
              </div>
            ))}
          </div>
          <div>
            <div className="field" style={{minWidth:200}}>
              <label>Month</label>
              <select value={monthLabel} onChange={e=>{setMonthLabel(e.target.value);setReport(null);}}>
                <option value="">All months</option>
                {MONTHS.filter(Boolean).map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
          <button className="btn primary" onClick={handleGenerate} disabled={loading||!selected.length}>
            {loading ? "Generating..." : "Generate & preview"}
          </button>
          {report && <>
            <button className="btn" onClick={()=>handleExport("pdf")} style={{color:"var(--pin)"}}>Download PDF</button>
            <button className="btn" onClick={()=>handleExport("excel")} style={{color:"var(--moss)"}}>Download Excel</button>
            <button className="btn" onClick={()=>handleExport("csv")} style={{color:"#6b6457"}}>Download CSV</button>
            <button className="btn" style={{color:"#2f5d4f"}} onClick={() => window.print()} > Download Charts </button>
          </>}
        </div>
      </div>

      {showPreview && report && (
        <div id="tally-report-printable">
          {/* Charts */}
          {report.sections.length > 0 && (
            <div className="osas-grid no-print" style={{gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:18,marginBottom:18}}>
              {report.sections.map(sec => (
                <div className="card" key={`chart-${sec.group_by}`}>
                  <div className="panel-title" style={{marginBottom:10}}>
                    {SECTION_LABELS[sec.group_by]||sec.group_by} - chart
                  </div>
                  {sec.rows.length === 0
                    ? <div className="review-empty">No data.</div>
                    : sec.rows.length <= 5
                    ? <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
  <Pie
    data={sec.rows}
    dataKey="count"
    nameKey="group_label"
    cx="40%"
    cy="50%"
    outerRadius={65}
    label={false}
  >
    {sec.rows.map((_, i) => (
      <Cell
        key={i}
        fill={COLORS[i % COLORS.length]}
      />
    ))}
  </Pie>

  <Tooltip
    formatter={(value) => [`${value} Students`, "Total"]}
  />

  <Legend
    layout="vertical"
    align="right"
    verticalAlign="middle"
    iconType="circle"
    wrapperStyle={{
      fontSize: 12,
      lineHeight: "18px"
    }}
  />
</PieChart>
                      </ResponsiveContainer>
                    : <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={sec.rows} margin={{top:5,right:10,left:-20,bottom:30}}>
                          <XAxis dataKey="group_label" tick={{fontSize:9}} angle={-30} textAnchor="end" />
                          <YAxis tick={{fontSize:9}} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="Students" fill="#2f5d4f" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                  }
                </div>
              ))}
            </div>
          )}

          {/* Tables */}
          {report.sections.map(sec => (
            <div className="card" key={sec.group_by} style={{marginBottom:18}}>
              <div className="panel-title">
                {SECTION_LABELS[sec.group_by]||sec.group_by}
                {report.month_label ? ` - ${report.month_label}` : " - All months"}
              </div>
              <table>
                <tbody>
                  <tr><th>{SECTION_LABELS[sec.group_by]}</th><th>Count</th><th>Students</th></tr>
                  {sec.rows.length===0
                    ? <tr><td colSpan={3} style={{color:"#a39c8a"}}>No data for this selection.</td></tr>
                    : sec.rows.map(row=>(
                        <tr key={row.group_label}>
                          <td style={{verticalAlign:"top"}}>{row.group_label}</td>
                          <td style={{verticalAlign:"top"}}>{row.count}</td>
                          <td style={{fontSize:12,color:"#544f43"}}>{row.student_names?.join(", ")||"-"}</td>
                        </tr>
                    ))}
                  <tr><td style={{fontWeight:700}}>Total</td><td style={{fontWeight:700}}>{sec.total}</td><td></td></tr>
                </tbody>
              </table>
            </div>
          ))}

          <div className="no-print" style={{display:"flex",gap:10,marginBottom:18}}>
           <button className="btn primary" onClick={() => window.print()}>
    Print Report
</button>

<button className="btn" onClick={() => handleExport("pdf")}>
    Download PDF
</button>

<button className="btn" onClick={() => handleExport("excel")}>
    Download Excel
</button>

<button className="btn" onClick={() => handleExport("csv")}>
    Download CSV
</button>
          </div>
        </div>
      )}
    </>
  );
}
