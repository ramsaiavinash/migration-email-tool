import Chatbot from './Chatbot';
import { useState, useRef, useEffect } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
const STATUS = { IDLE: "idle", PREVIEWING: "previewing", PROCESSING: "processing", DONE: "done", ERROR: "error" };

const MOCK_STATS = {
  totalRuns: 0, totalUsers: 0, totalEmailsSent: 0, totalFailed: 0,
  totalErrors: 0, filesMigrated: 0,
  errorCodeBreakdown: {},
  recentRuns: [],
};

export default function App() {
  const [file, setFile]         = useState(null);
  const [status, setStatus]     = useState(STATUS.IDLE);
  const [preview, setPreview]   = useState(null);
  const [results, setResults]   = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [page, setPage]         = useState("dashboard");
  const [stats, setStats]       = useState(MOCK_STATS);
  const inputRef = useRef();

  useEffect(() => {
    if (status === STATUS.PROCESSING) {
      setProgress(0);
      const t = setInterval(() => setProgress(p => Math.min(p + 2, 90)), 150);
      return () => clearInterval(t);
    }
    if (status === STATUS.DONE) setProgress(100);
  }, [status]);

  function handleFile(f) {
    if (!f) return;
    if (!f.name.endsWith(".zip")) { setErrorMsg("Please upload a .zip file from Migration Manager."); return; }
    setFile(f); setStatus(STATUS.IDLE); setPreview(null); setResults(null); setErrorMsg("");
  }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }

  async function handlePreview() {
    if (!file) return;
    setStatus(STATUS.PREVIEWING); setErrorMsg("");
    try {
      const fd = new FormData(); fd.append("migrationZip", file);
      const res = await fetch(`${BACKEND_URL}/api/preview-migration`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Preview failed");
      setPreview(data); setStatus(STATUS.IDLE);
    } catch (err) { setErrorMsg(err.message); setStatus(STATUS.ERROR); }
  }

  async function handleProcess() {
    if (!file) return;
    setStatus(STATUS.PROCESSING); setErrorMsg("");
    try {
      const fd = new FormData(); fd.append("migrationZip", file);
      const res = await fetch(`${BACKEND_URL}/api/process-migration`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Processing failed");
      setResults(data); setStatus(STATUS.DONE);
      setStats(prev => {
        const breakdown = { ...prev.errorCodeBreakdown };
        (preview?.users || []).forEach(u => {
          u.errorCodes.forEach(code => { breakdown[code] = (breakdown[code] || 0) + 1; });
        });
        return {
          totalRuns: prev.totalRuns + 1,
          totalUsers: prev.totalUsers + data.affectedUsers,
          totalEmailsSent: prev.totalEmailsSent + data.successCount,
          totalFailed: prev.totalFailed + data.failedCount,
          totalErrors: prev.totalErrors + (preview?.totalErrors || 0),
          filesMigrated: prev.filesMigrated + (preview?.users?.reduce((a, u) => a, 0) || 0),
          errorCodeBreakdown: breakdown,
          recentRuns: [{ id: Date.now(), date: new Date().toLocaleString(), file: file.name, users: data.affectedUsers, sent: data.successCount, failed: data.failedCount, errors: preview?.totalErrors || 0 }, ...prev.recentRuns].slice(0, 10),
        };
      });
    } catch (err) { setErrorMsg(err.message); setStatus(STATUS.ERROR); }
  }

  function reset() { setFile(null); setStatus(STATUS.IDLE); setPreview(null); setResults(null); setErrorMsg(""); setProgress(0); }
  const isLoading = status === STATUS.PREVIEWING || status === STATUS.PROCESSING;

  const navItems = [
    { id: "dashboard", label: "Dashboard",   icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id: "process",   label: "Process ZIP", icon: "M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id: "history",   label: "History",     icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id: "settings",  label: "Settings",    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <div style={s.root}>
      <style>{css}</style>
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logo}>
            <div style={s.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <Chatbot/>
    </div>
            <div>
              <div style={s.logoName}>MigraPulse  <Chatbot/>
    </div>
              <div style={s.logoSub}>CHSPSC LLC  <Chatbot/>
    </div>
              <Chatbot/>
    </div>
            <Chatbot/>
    </div>
          <nav style={s.nav}>
            {navItems.map(item => (
              <div key={item.id} style={{ ...s.navItem, ...(page===item.id?s.navItemActive:{}) }} onClick={() => { setPage(item.id); if(item.id==="process") reset(); }} className="nav-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                <span>{item.label}</span>
                {item.id==="history" && stats.recentRuns.length > 0 && <span style={s.navBadge}>{stats.recentRuns.length}</span>}
                <Chatbot/>
    </div>
            ))}
          </nav>
          <Chatbot/>
    </div>
        <div style={s.sidebarBottom}>
          <div style={s.sidebarUser}>
            <div style={s.avatar}>IT  <Chatbot/>
    </div>
            <div>
              <div style={{ fontSize:13,fontWeight:600,color:"#f1f5f9" }}>IT Admin  <Chatbot/>
    </div>
              <div style={{ fontSize:11,color:"#94a3b8" }}>Migration Team  <Chatbot/>
    </div>
              <Chatbot/>
    </div>
            <Chatbot/>
    </div>
          <Chatbot/>
    </div>
      </aside>

      <main style={s.main}>

        {/* ── DASHBOARD ── */}
        {page === "dashboard" && (
          <div className="fade-in">
            <header style={s.topbar}>
              <div>
                <h1 style={s.pageTitle}>Dashboard</h1>
                <p style={s.pageSubtitle}>Automated User Migration Reporting Notification Tool</p>
                <Chatbot/>
    </div>
              <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                <div style={s.statusBadge}><span style={s.statusDot}></span>Power Automate connected  <Chatbot/>
    </div>
                <button style={{ ...s.btn,...s.btnPrimary,padding:"8px 16px",fontSize:13 }} onClick={() => { setPage("process"); reset(); }} className="btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  Process ZIP
                </button>
                <Chatbot/>
    </div>
            </header>

            {/* KPI cards */}
            <div style={s.kpiGrid}>
              {[
                { label:"Total runs",        value: stats.totalRuns,       icon:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", color:"#0ea5e9", bg:"#f0f9ff", border:"#bae6fd" },
                { label:"Users notified",    value: stats.totalUsers,      icon:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color:"#8b5cf6", bg:"#f5f3ff", border:"#ddd6fe" },
                { label:"Emails sent",       value: stats.totalEmailsSent, icon:"M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color:"#059669", bg:"#f0fdf4", border:"#bbf7d0" },
                { label:"Failed emails",     value: stats.totalFailed,     icon:"M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: stats.totalFailed>0?"#dc2626":"#64748b", bg: stats.totalFailed>0?"#fef2f2":"#f8fafc", border: stats.totalFailed>0?"#fecaca":"#e2e8f0" },
                { label:"Total errors found",value: stats.totalErrors,     icon:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color:"#f59e0b", bg:"#fffbeb", border:"#fde68a" },
                { label:"Delivery rate",     value: stats.totalEmailsSent+stats.totalFailed > 0 ? Math.round(stats.totalEmailsSent/(stats.totalEmailsSent+stats.totalFailed)*100)+"%" : "—", icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", color:"#059669", bg:"#f0fdf4", border:"#bbf7d0" },
              ].map((kpi,i) => (
                <div key={i} style={{ ...s.kpiCard, background:kpi.bg, border:`1px solid ${kpi.border}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:28,fontWeight:700,color:kpi.color,lineHeight:1 }}>{kpi.value}  <Chatbot/>
    </div>
                      <div style={{ fontSize:12,color:"#64748b",marginTop:6,fontWeight:500 }}>{kpi.label}  <Chatbot/>
    </div>
                      <Chatbot/>
    </div>
                    <div style={{ width:38,height:38,borderRadius:10,background:"white",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.08)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={kpi.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={kpi.icon}/></svg>
                      <Chatbot/>
    </div>
                    <Chatbot/>
    </div>
                  <Chatbot/>
    </div>
              ))}
              <Chatbot/>
    </div>

            <div style={s.dashRow}>
              {/* Error code breakdown chart */}
              <div style={{ ...s.card, flex:1 }}>
                <div style={s.cardHeader}>
                  <div style={{ ...s.cardIcon, background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                    <Chatbot/>
    </div>
                  <div>
                    <h2 style={s.cardTitle}>Error code breakdown</h2>
                    <p style={s.cardSub}>Distribution of migration errors by type</p>
                    <Chatbot/>
    </div>
                  <Chatbot/>
    </div>
                <div style={{ padding:"16px 24px 20px" }}>
                  {Object.keys(stats.errorCodeBreakdown).length === 0 ? (
                    <EmptyChart label="Process a migration ZIP to see error distribution"/>
                  ) : (
                    <DonutChart data={stats.errorCodeBreakdown}/>
                  )}
                  <Chatbot/>
    </div>
                <Chatbot/>
    </div>

              {/* Email delivery chart */}
              <div style={{ ...s.card, flex:1 }}>
                <div style={s.cardHeader}>
                  <div style={{ ...s.cardIcon, background:"linear-gradient(135deg,#059669,#047857)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    <Chatbot/>
    </div>
                  <div>
                    <h2 style={s.cardTitle}>Email delivery</h2>
                    <p style={s.cardSub}>Sent vs failed per run</p>
                    <Chatbot/>
    </div>
                  <Chatbot/>
    </div>
                <div style={{ padding:"16px 24px 20px" }}>
                  {stats.recentRuns.length === 0 ? (
                    <EmptyChart label="No runs yet — process a ZIP to see delivery stats"/>
                  ) : (
                    <BarChart runs={stats.recentRuns}/>
                  )}
                  <Chatbot/>
    </div>
                <Chatbot/>
    </div>
              <Chatbot/>
    </div>

            {/* Recent runs */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={{ ...s.cardIcon, background:"linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <Chatbot/>
    </div>
                <div>
                  <h2 style={s.cardTitle}>Recent runs</h2>
                  <p style={s.cardSub}>Last {stats.recentRuns.length} migration reports processed</p>
                  <Chatbot/>
    </div>
                <Chatbot/>
    </div>
              {stats.recentRuns.length === 0 ? (
                <div style={{ padding:"32px 24px",textAlign:"center" }}>
                  <div style={{ fontSize:36,marginBottom:10 }}>📭  <Chatbot/>
    </div>
                  <p style={{ fontSize:14,fontWeight:600,color:"#0f172a",marginBottom:4 }}>No runs yet</p>
                  <p style={{ fontSize:13,color:"#64748b",marginBottom:16 }}>Process your first migration ZIP to see results here.</p>
                  <button style={{ ...s.btn,...s.btnPrimary,margin:"0 auto" }} onClick={() => { setPage("process"); reset(); }} className="btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    Process your first ZIP
                  </button>
                  <Chatbot/>
    </div>
              ) : (
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead><tr>{["Date & Time","Source file","Users","Errors","Sent","Failed","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {stats.recentRuns.map((run,i)=>(
                        <tr key={run.id} style={{ background:i%2===0?"#fff":"#f8fafc" }}>
                          <td style={{ ...s.td,fontSize:12,color:"#64748b",whiteSpace:"nowrap" }}>{run.date}</td>
                          <td style={{ ...s.td,fontWeight:500,fontSize:13 }}>{run.file}</td>
                          <td style={{ ...s.td,textAlign:"center" }}><span style={s.numBadge}>{run.users}</span></td>
                          <td style={{ ...s.td,textAlign:"center" }}><span style={{ ...s.numBadge,background:"#fef3c7",color:"#92400e" }}>{run.errors}</span></td>
                          <td style={{ ...s.td,textAlign:"center" }}><span style={{ ...s.numBadge,background:"#f0fdf4",color:"#166534" }}>{run.sent}</span></td>
                          <td style={{ ...s.td,textAlign:"center" }}><span style={{ ...s.numBadge,background:run.failed>0?"#fef2f2":"#f8fafc",color:run.failed>0?"#dc2626":"#64748b" }}>{run.failed}</span></td>
                          <td style={s.td}><span style={{ ...s.statusPill,...(run.failed===0?s.statusSent:{background:"#fef3c7",color:"#92400e"}) }}>{run.failed===0?"✓ Complete":"⚠ Partial"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Chatbot/>
    </div>
              )}
              <Chatbot/>
    </div>
            <Chatbot/>
    </div>
        )}

        {/* ── PROCESS ZIP ── */}
        {page === "process" && (
          <div className="fade-in">
            <header style={s.topbar}>
              <div>
                <h1 style={s.pageTitle}>Process migration ZIP</h1>
                <p style={s.pageSubtitle}>Upload → Preview → Send automated error emails</p>
                <Chatbot/>
    </div>
              <div style={s.statusBadge}><span style={s.statusDot}></span>Power Automate connected  <Chatbot/>
    </div>
            </header>

            {!results && (
              <div style={s.stepTracker}>
                {[{n:1,label:"Upload ZIP",done:!!file},{n:2,label:"Preview errors",done:!!preview},{n:3,label:"Send emails",done:status===STATUS.DONE}].map((step,i)=>(
                  <div key={i} style={s.stepItem}>
                    <div style={{ ...s.stepCircle,...(step.done?s.stepDone:(i===0&&!file)||(i===1&&file&&!preview)||(i===2&&preview)?s.stepActive:{}) }}>
                      {step.done?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:step.n}
                      <Chatbot/>
    </div>
                    <span style={s.stepLabel}>{step.label}</span>
                    {i<2&&<div style={s.stepLine}/>}
                    <Chatbot/>
    </div>
                ))}
                <Chatbot/>
    </div>
            )}

            <div style={s.contentGrid}>
              {!results && (
                <div style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.cardIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                      <Chatbot/>
    </div>
                    <div>
                      <h2 style={s.cardTitle}>Upload migration report</h2>
                      <p style={s.cardSub}>Drop the ZIP file exported from Microsoft 365 Admin Center</p>
                      <Chatbot/>
    </div>
                    <Chatbot/>
    </div>
                  <div style={{ ...s.dropzone,...(dragOver?s.dropzoneHover:{}),...(file?s.dropzoneFilled:{}) }}
                    onClick={()=>!file&&inputRef.current.click()}
                    onDragOver={e=>{e.preventDefault();setDragOver(true);}}
                    onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} className="dropzone">
                    <input ref={inputRef} type="file" accept=".zip" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])}/>
                    {file?(
                      <div style={s.fileRow}>
                        <div style={s.fileIconBox}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>  <Chatbot/>
    </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14,fontWeight:600,color:"#0f172a" }}>{file.name}  <Chatbot/>
    </div>
                          <div style={{ fontSize:12,color:"#64748b",marginTop:2 }}>{(file.size/1024).toFixed(1)} KB · Ready to process  <Chatbot/>
    </div>
                          <Chatbot/>
    </div>
                        <button style={s.removeBtn} onClick={e=>{e.stopPropagation();reset();}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                        <Chatbot/>
    </div>
                    ):(
                      <div style={{ textAlign:"center" }}>
                        <div style={s.uploadIconWrap}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>  <Chatbot/>
    </div>
                        <p style={{ margin:"0 0 6px",fontSize:15,fontWeight:600,color:"#0f172a" }}>Drop your migration ZIP here</p>
                        <p style={{ margin:0,fontSize:13,color:"#64748b" }}>or <span style={{ color:"#0ea5e9",cursor:"pointer" }}>click to browse</span> · accepts Migration_summary_report.zip</p>
                        <Chatbot/>
    </div>
                    )}
                    <Chatbot/>
    </div>
                  {errorMsg&&<div style={s.errorBox}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errorMsg}</div>}
                  {file&&(
                    <div style={s.btnRow}>
                      <button style={{ ...s.btn,...s.btnGhost }} onClick={handlePreview} disabled={isLoading} className="btn">
                        {status===STATUS.PREVIEWING?<Spinner/>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                        {status===STATUS.PREVIEWING?"Parsing…":"Preview errors"}
                      </button>
                      <button style={{ ...s.btn,...s.btnPrimary,...(!preview?s.btnDisabled:{}) }} onClick={handleProcess} disabled={!preview||isLoading} className="btn">
                        {status===STATUS.PROCESSING?<Spinner white/>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                        {status===STATUS.PROCESSING?"Sending emails…":"Send all emails"}
                      </button>
                      <Chatbot/>
    </div>
                  )}
                  {status===STATUS.PROCESSING&&(
                    <div style={s.progressWrap}>
                      <div style={s.progressBar}><div style={{ ...s.progressFill,width:`${progress}%` }}/>  <Chatbot/>
    </div>
                      <span style={s.progressLabel}>{progress}%</span>
                      <Chatbot/>
    </div>
                  )}
                  <Chatbot/>
    </div>
              )}

              {preview&&!results&&(
                <div style={s.card} className="fade-in">
                  <div style={s.cardHeader}>
                    <div style={{ ...s.cardIcon,background:"linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      <Chatbot/>
    </div>
                    <div>
                      <h2 style={s.cardTitle}>Error preview — {preview.affectedUsers} user(s) found</h2>
                      <p style={s.cardSub}>{preview.totalErrors} total errors · {preview.sourceFile}</p>
                      <Chatbot/>
    </div>
                    <Chatbot/>
    </div>
                  <div style={s.statRow}>
                    <StatCard label="Users affected" value={preview.affectedUsers} color="#6d28d9" bg="#f5f3ff"/>
                    <StatCard label="Total errors"   value={preview.totalErrors}   color="#dc2626" bg="#fef2f2"/>
                    <StatCard label="Emails to send" value={preview.affectedUsers} color="#059669" bg="#f0fdf4"/>
                    <Chatbot/>
    </div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead><tr>{["User email","Errors","Error codes","Files (sample)"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {preview.users.map((u,i)=>(
                          <tr key={i} style={{ background:i%2===0?"#fff":"#f8fafc" }}>
                            <td style={s.td}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={s.emailAvatar}>{u.userEmail[0].toUpperCase()}</div><span style={{ fontSize:13,color:"#0f172a" }}>{u.userEmail}</span></div></td>
                            <td style={{ ...s.td,textAlign:"center" }}><span style={s.errorBadge}>{u.errorCount}</span></td>
                            <td style={s.td}>{u.errorCodes.map(c=><span key={c} style={s.codePill}>{c.replace("MEXPORTFILEUNSUPPORTEDMIMETYPE","SHORTCUT").replace("MVERSIONDOWNLOAD","VERSION_DL")}</span>)}</td>
                            <td style={{ ...s.td,fontSize:12,color:"#64748b" }}>{u.preview.map(p=>p.file).join(", ")}{u.errorCount>3?` +${u.errorCount-3} more`:""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Chatbot/>
    </div>
                  <div style={s.previewNote}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Each user will receive a professional email with a fully colored Excel report attached.
                    <Chatbot/>
    </div>
                  <Chatbot/>
    </div>
              )}

              {results&&(
                <div style={s.card} className="fade-in">
                  <div style={s.resultHeader}>
                    <div style={s.resultCheck}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>  <Chatbot/>
    </div>
                    <div>
                      <h2 style={{ margin:0,fontSize:20,fontWeight:700,color:"#0f172a" }}>All done!</h2>
                      <p style={{ margin:"2px 0 0",fontSize:13,color:"#64748b" }}>{results.successCount} email(s) sent · {results.failedCount} failed · {results.sourceFile}</p>
                      <Chatbot/>
    </div>
                    <Chatbot/>
    </div>
                  <div style={s.statRow}>
                    <StatCard label="Emails sent"    value={results.successCount}  color="#059669" bg="#f0fdf4"/>
                    <StatCard label="Failed"         value={results.failedCount}   color={results.failedCount>0?"#dc2626":"#64748b"} bg={results.failedCount>0?"#fef2f2":"#f8fafc"}/>
                    <StatCard label="Users notified" value={results.affectedUsers} color="#0ea5e9" bg="#f0f9ff"/>
                    <Chatbot/>
    </div>
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead><tr>{["User email","Errors","Excel report","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {results.results.map((r,i)=>(
                          <tr key={i} style={{ background:i%2===0?"#fff":"#f8fafc" }}>
                            <td style={s.td}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={s.emailAvatar}>{r.userEmail[0].toUpperCase()}</div><span style={{ fontSize:13,color:"#0f172a" }}>{r.userEmail}</span></div></td>
                            <td style={{ ...s.td,textAlign:"center" }}><span style={s.errorBadge}>{r.errorCount}</span></td>
                            <td style={{ ...s.td,fontSize:12,color:"#64748b" }}>{r.csvFileName}</td>
                            <td style={s.td}><span style={{ ...s.statusPill,...(r.status==="triggered"?s.statusSent:s.statusFailed) }}>{r.status==="triggered"?"✓ Sent":"✗ Failed"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Chatbot/>
    </div>
                  <div style={s.btnRow}>
                    <button style={{ ...s.btn,...s.btnGhost }} onClick={reset} className="btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                      Process another ZIP
                    </button>
                    <button style={{ ...s.btn,...s.btnPrimary }} onClick={()=>setPage("dashboard")} className="btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                      View dashboard
                    </button>
                    <Chatbot/>
    </div>
                  <Chatbot/>
    </div>
              )}
              <Chatbot/>
    </div>
            <Chatbot/>
    </div>
        )}

        {/* ── HISTORY ── */}
        {page === "history" && (
          <div className="fade-in">
            <header style={s.topbar}>
              <div>
                <h1 style={s.pageTitle}>History</h1>
                <p style={s.pageSubtitle}>{stats.recentRuns.length} migration run(s) this session</p>
                <Chatbot/>
    </div>
            </header>
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={{ ...s.cardIcon,background:"linear-gradient(135deg,#8b5cf6,#6d28d9)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <Chatbot/>
    </div>
                <div>
                  <h2 style={s.cardTitle}>All migration runs</h2>
                  <p style={s.cardSub}>{stats.recentRuns.length} total this session</p>
                  <Chatbot/>
    </div>
                <Chatbot/>
    </div>
              {stats.recentRuns.length===0?(
                <div style={{ padding:"48px 24px",textAlign:"center" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>📭  <Chatbot/>
    </div>
                  <p style={{ fontSize:15,fontWeight:600,color:"#0f172a",marginBottom:6 }}>No runs yet</p>
                  <p style={{ fontSize:13,color:"#64748b",marginBottom:20 }}>Process a migration ZIP to see history here.</p>
                  <button style={{ ...s.btn,...s.btnPrimary,margin:"0 auto" }} onClick={()=>{setPage("process");reset();}} className="btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    Process a ZIP
                  </button>
                  <Chatbot/>
    </div>
              ):(
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead><tr>{["#","Date & Time","Source file","Users","Errors","Sent","Failed","Delivery rate","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {stats.recentRuns.map((run,i)=>(
                        <tr key={run.id} style={{ background:i%2===0?"#fff":"#f8fafc" }}>
                          <td style={{ ...s.td,color:"#94a3b8",fontSize:12 }}>#{i+1}</td>
                          <td style={{ ...s.td,fontSize:12,color:"#64748b",whiteSpace:"nowrap" }}>{run.date}</td>
                          <td style={{ ...s.td,fontWeight:500,fontSize:13 }}>{run.file}</td>
                          <td style={{ ...s.td,textAlign:"center" }}><span style={s.numBadge}>{run.users}</span></td>
                          <td style={{ ...s.td,textAlign:"center" }}><span style={{ ...s.numBadge,background:"#fef3c7",color:"#92400e" }}>{run.errors}</span></td>
                          <td style={{ ...s.td,textAlign:"center" }}><span style={{ ...s.numBadge,background:"#f0fdf4",color:"#166534" }}>{run.sent}</span></td>
                          <td style={{ ...s.td,textAlign:"center" }}><span style={{ ...s.numBadge,background:run.failed>0?"#fef2f2":"#f8fafc",color:run.failed>0?"#dc2626":"#64748b" }}>{run.failed}</span></td>
                          <td style={{ ...s.td,textAlign:"center" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <div style={{ flex:1,height:6,background:"#e2e8f0",borderRadius:3,overflow:"hidden" }}>
                                <div style={{ height:"100%",background:"#22c55e",width:`${run.sent+run.failed>0?Math.round(run.sent/(run.sent+run.failed)*100):0}%`,borderRadius:3 }}/>
                                <Chatbot/>
    </div>
                              <span style={{ fontSize:11,fontWeight:600,color:"#059669",minWidth:28 }}>{run.sent+run.failed>0?Math.round(run.sent/(run.sent+run.failed)*100):0}%</span>
                              <Chatbot/>
    </div>
                          </td>
                          <td style={s.td}><span style={{ ...s.statusPill,...(run.failed===0?s.statusSent:{background:"#fef3c7",color:"#92400e"}) }}>{run.failed===0?"✓ Complete":"⚠ Partial"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Chatbot/>
    </div>
              )}
              <Chatbot/>
    </div>
            <Chatbot/>
    </div>
        )}

        {/* ── SETTINGS ── */}
        {page === "settings" && (
          <div className="fade-in">
            <header style={s.topbar}>
              <div>
                <h1 style={s.pageTitle}>Settings</h1>
                <p style={s.pageSubtitle}>Configure your migration notification tool</p>
                <Chatbot/>
    </div>
            </header>
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <div style={{ ...s.cardIcon,background:"linear-gradient(135deg,#f59e0b,#d97706)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    <Chatbot/>
    </div>
                  <div><h2 style={s.cardTitle}>Power Automate configuration</h2><p style={s.cardSub}>Backend .env file settings</p>  <Chatbot/>
    </div>
                  <Chatbot/>
    </div>
                <div style={{ padding:"16px 24px 20px" }}>
                  {[
                    { label:"Power Automate URL",key:"POWER_AUTOMATE_URL",value:"https://defaultde08c40...sig=Usg...",desc:"HTTP trigger URL from your Power Automate flow" },
                    { label:"IT Admin Email",key:"IT_ADMIN_EMAIL",value:"RamaSaiAvinash.Kanigolla@Cognizant.com",desc:"CC'd on every migration email" },
                    { label:"Backend URL",key:"REACT_APP_BACKEND_URL",value:BACKEND_URL,desc:"Node.js Express backend" },
                  ].map(item=>(
                    <div key={item.key} style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12,fontWeight:600,color:"#374151",marginBottom:4 }}>{item.label}  <Chatbot/>
    </div>
                      <div style={{ fontSize:12,fontFamily:"monospace",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 12px",color:"#0f172a" }}>{item.value}  <Chatbot/>
    </div>
                      <div style={{ fontSize:11,color:"#94a3b8",marginTop:3 }}>{item.desc}  <Chatbot/>
    </div>
                      <Chatbot/>
    </div>
                  ))}
                  <div style={{ background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#92400e" }}>
                    ⚠ To update these values, edit the <code>.env</code> file in your Codespaces backend and restart the server.
                    <Chatbot/>
    </div>
                  <Chatbot/>
    </div>
                <Chatbot/>
    </div>
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <div style={{ ...s.cardIcon,background:"linear-gradient(135deg,#059669,#047857)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <Chatbot/>
    </div>
                  <div><h2 style={s.cardTitle}>System status</h2><p style={s.cardSub}>Current connection health</p>  <Chatbot/>
    </div>
                  <Chatbot/>
    </div>
                <div style={{ padding:"16px 24px 20px" }}>
                  {[
                    { label:"Backend API",detail:`Running at ${BACKEND_URL}` },
                    { label:"Power Automate",detail:"HTTP trigger connected" },
                    { label:"Outlook connector",detail:"Email delivery via M365" },
                    { label:"Excel reports",detail:"HTML-based colored reports" },
                  ].map(item=>(
                    <div key={item.label} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f1f5f9" }}>
                      <div>
                        <div style={{ fontSize:13,fontWeight:500,color:"#0f172a" }}>{item.label}  <Chatbot/>
    </div>
                        <div style={{ fontSize:11,color:"#94a3b8" }}>{item.detail}  <Chatbot/>
    </div>
                        <Chatbot/>
    </div>
                      <span style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:500,color:"#166534",background:"#f0fdf4",padding:"4px 10px",borderRadius:20,border:"1px solid #bbf7d0" }}>
                        <span style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block" }}></span>Online
                      </span>
                      <Chatbot/>
    </div>
                  ))}
                  <Chatbot/>
    </div>
                <Chatbot/>
    </div>
              <Chatbot/>
    </div>
            <Chatbot/>
    </div>
        )}
      </main>
      <Chatbot/>
    </div>
  );
}

function DonutChart({ data }) {
  const COLORS = ["#0ea5e9","#8b5cf6","#f59e0b","#ef4444","#10b981","#f97316"];
  const labels = { MEXPORTFILEUNSUPPORTEDMIMETYPE:"Shortcuts", MVERSIONDOWNLOAD:"Version DL", MFOLDERPATHTOLONG:"Path Too Long", MEXPORTFILERATELIMIT:"Rate Limit", MPERMISSION:"Permission" };
  const entries = Object.entries(data);
  const total = entries.reduce((a,[,v])=>a+v,0);
  let angle = 0;
  const slices = entries.map(([code,count],i)=>{
    const pct = count/total; const start = angle; angle += pct*360;
    return { code, count, pct, start, color: COLORS[i%COLORS.length] };
  });
  function polarToXY(deg,r){ const rad=(deg-90)*Math.PI/180; return { x:100+r*Math.cos(rad), y:100+r*Math.sin(rad) }; }
  function arc(slice){
    const s=polarToXY(slice.start,70); const e=polarToXY(slice.start+slice.pct*360-0.5,70);
    const large=slice.pct>0.5?1:0;
    return `M 100 100 L ${s.x} ${s.y} A 70 70 0 ${large} 1 ${e.x} ${e.y} Z`;
  }
  return (
    <div style={{ display:"flex",gap:24,alignItems:"center" }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {slices.map((sl,i)=><path key={i} d={arc(sl)} fill={sl.color} opacity="0.9"/>)}
        <circle cx="100" cy="100" r="45" fill="white"/>
        <text x="100" y="96" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">{total}</text>
        <text x="100" y="112" textAnchor="middle" fontSize="10" fill="#64748b">total errors</text>
      </svg>
      <div style={{ flex:1 }}>
        {slices.map((sl,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:10,height:10,borderRadius:"50%",background:sl.color,flexShrink:0 }}/>
              <span style={{ fontSize:12,color:"#374151",fontWeight:500 }}>{labels[sl.code]||sl.code.slice(0,12)}</span>
              <Chatbot/>
    </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:80,height:6,background:"#f1f5f9",borderRadius:3,overflow:"hidden" }}>
                <div style={{ height:"100%",background:sl.color,width:`${sl.pct*100}%`,borderRadius:3 }}/>
                <Chatbot/>
    </div>
              <span style={{ fontSize:12,fontWeight:700,color:"#0f172a",minWidth:16,textAlign:"right" }}>{sl.count}</span>
              <span style={{ fontSize:11,color:"#94a3b8",minWidth:32 }}>{Math.round(sl.pct*100)}%</span>
              <Chatbot/>
    </div>
            <Chatbot/>
    </div>
        ))}
        <Chatbot/>
    </div>
      <Chatbot/>
    </div>
  );
}

function BarChart({ runs }) {
  const maxVal = Math.max(...runs.map(r=>r.sent+r.failed),1);
  return (
    <div>
      <div style={{ display:"flex",gap:4,alignItems:"flex-end",height:140,marginBottom:8 }}>
        {runs.slice(0,8).reverse().map((run,i)=>(
          <div key={run.id} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
            <div style={{ width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:120,gap:1 }}>
              <div style={{ width:"100%",background:"#22c55e",borderRadius:"3px 3px 0 0",height:`${(run.sent/maxVal)*100}%`,minHeight:run.sent>0?4:0,transition:"height 0.5s ease" }} title={`Sent: ${run.sent}`}/>
              {run.failed>0&&<div style={{ width:"100%",background:"#ef4444",height:`${(run.failed/maxVal)*100}%`,minHeight:4 }} title={`Failed: ${run.failed}`}/>}
              <Chatbot/>
    </div>
            <div style={{ fontSize:9,color:"#94a3b8",textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%" }}>#{runs.length-i}  <Chatbot/>
    </div>
            <Chatbot/>
    </div>
        ))}
        <Chatbot/>
    </div>
      <div style={{ display:"flex",gap:16,justifyContent:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#64748b" }}><div style={{ width:10,height:10,borderRadius:2,background:"#22c55e" }}/> Sent  <Chatbot/>
    </div>
        <div style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#64748b" }}><div style={{ width:10,height:10,borderRadius:2,background:"#ef4444" }}/> Failed  <Chatbot/>
    </div>
        <Chatbot/>
    </div>
      <Chatbot/>
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div style={{ textAlign:"center",padding:"32px 0" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin:"0 auto 10px",display:"block" }}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      <p style={{ fontSize:13,color:"#94a3b8" }}>{label}</p>
      <Chatbot/>
    </div>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{ background:bg,borderRadius:10,padding:"14px 18px",flex:1,minWidth:0 }}>
      <div style={{ fontSize:26,fontWeight:700,color,lineHeight:1 }}>{value}  <Chatbot/>
    </div>
      <div style={{ fontSize:12,color:"#64748b",marginTop:4 }}>{label}  <Chatbot/>
    </div>
      <Chatbot/>
    </div>
  );
}

function Spinner({ white }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={white?"white":"#0ea5e9"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:"spin 0.8s linear infinite" }}>
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f1f5f9;font-family:'DM Sans',sans-serif}
  .nav-item{cursor:pointer;transition:background 0.15s}
  .nav-item:hover{background:rgba(255,255,255,0.08)!important}
  .dropzone:hover{border-color:#0ea5e9!important;background:#f0f9ff!important}
  .btn:hover:not(:disabled){opacity:0.9;transform:translateY(-1px)}
  .btn:active:not(:disabled){transform:translateY(0)}
  .btn{transition:all 0.15s ease}
  .fade-in{animation:fadeIn 0.3s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  ::-webkit-scrollbar{width:6px;height:6px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
`;

const s = {
  root:{display:"flex",minHeight:"100vh",background:"#f1f5f9",fontFamily:"'DM Sans',sans-serif"},
  sidebar:{width:240,background:"linear-gradient(180deg,#0f172a 0%,#1e293b 100%)",display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:100},
  sidebarTop:{flex:1,padding:"0 0 24px"},
  logo:{display:"flex",alignItems:"center",gap:12,padding:"24px 20px 32px"},
  logoIcon:{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#0ea5e9,#0284c7)",display:"flex",alignItems:"center",justifyContent:"center"},
  logoName:{fontSize:16,fontWeight:700,color:"#f1f5f9",letterSpacing:"-0.3px"},
  logoSub:{fontSize:11,color:"#64748b",marginTop:1},
  nav:{padding:"0 12px"},
  navItem:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,color:"#94a3b8",fontSize:14,fontWeight:500,marginBottom:2},
  navItemActive:{background:"rgba(14,165,233,0.15)",color:"#38bdf8"},
  navBadge:{marginLeft:"auto",background:"#0ea5e9",color:"white",fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:10},
  sidebarBottom:{padding:"16px 12px",borderTop:"1px solid rgba(255,255,255,0.06)"},
  sidebarUser:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8},
  avatar:{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#0ea5e9,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white"},
  main:{flex:1,marginLeft:240,padding:"0 32px 40px",maxWidth:"calc(100vw - 240px)"},
  topbar:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"28px 0 24px"},
  pageTitle:{fontSize:24,fontWeight:700,color:"#0f172a",letterSpacing:"-0.5px"},
  pageSubtitle:{fontSize:13,color:"#64748b",marginTop:3},
  statusBadge:{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:20,fontSize:12,fontWeight:500,color:"#166534"},
  statusDot:{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block",boxShadow:"0 0 0 2px rgba(34,197,94,0.25)"},
  kpiGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20},
  kpiCard:{borderRadius:14,padding:"18px 20px"},
  dashRow:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20},
  stepTracker:{display:"flex",alignItems:"center",marginBottom:28,background:"white",borderRadius:12,padding:"16px 24px",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:"1px solid #e2e8f0"},
  stepItem:{display:"flex",alignItems:"center",flex:1},
  stepCircle:{width:30,height:30,borderRadius:"50%",background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"#94a3b8",flexShrink:0},
  stepActive:{background:"#0ea5e9",color:"white"},
  stepDone:{background:"#22c55e",color:"white"},
  stepLabel:{fontSize:13,fontWeight:500,color:"#475569",marginLeft:10,whiteSpace:"nowrap"},
  stepLine:{flex:1,height:1,background:"#e2e8f0",margin:"0 16px"},
  contentGrid:{display:"flex",flexDirection:"column",gap:20},
  card:{background:"white",borderRadius:16,border:"1px solid #e2e8f0",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden"},
  cardHeader:{display:"flex",alignItems:"center",gap:14,padding:"20px 24px",borderBottom:"1px solid #f1f5f9"},
  cardIcon:{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#0ea5e9,#0284c7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  cardTitle:{fontSize:16,fontWeight:600,color:"#0f172a",margin:0},
  cardSub:{fontSize:12,color:"#64748b",margin:"2px 0 0"},
  dropzone:{margin:"20px 24px",border:"1.5px dashed #cbd5e1",borderRadius:12,padding:"32px 24px",cursor:"pointer",transition:"all 0.2s",background:"#fafafa"},
  dropzoneHover:{borderColor:"#0ea5e9",background:"#f0f9ff"},
  dropzoneFilled:{borderColor:"#0ea5e9",borderStyle:"solid",background:"#f0f9ff",cursor:"default"},
  uploadIconWrap:{width:56,height:56,borderRadius:14,background:"#e0f2fe",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"},
  fileRow:{display:"flex",alignItems:"center",gap:14},
  fileIconBox:{width:44,height:44,borderRadius:10,background:"#e0f2fe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  removeBtn:{width:32,height:32,borderRadius:8,border:"1px solid #e2e8f0",background:"white",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#94a3b8",marginLeft:"auto"},
  errorBox:{display:"flex",alignItems:"center",gap:8,margin:"0 24px 16px",padding:"10px 14px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,fontSize:13,color:"#dc2626"},
  btnRow:{display:"flex",gap:10,padding:"16px 24px 20px"},
  btn:{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",border:"none"},
  btnPrimary:{background:"linear-gradient(135deg,#0ea5e9,#0284c7)",color:"white",boxShadow:"0 2px 8px rgba(14,165,233,0.35)"},
  btnGhost:{background:"white",color:"#374151",border:"1px solid #e2e8f0"},
  btnDisabled:{opacity:0.45,cursor:"not-allowed",pointerEvents:"none"},
  progressWrap:{display:"flex",alignItems:"center",gap:12,padding:"0 24px 20px"},
  progressBar:{flex:1,height:6,background:"#e2e8f0",borderRadius:3,overflow:"hidden"},
  progressFill:{height:"100%",background:"linear-gradient(90deg,#0ea5e9,#7c3aed)",borderRadius:3,transition:"width 0.3s ease"},
  progressLabel:{fontSize:12,fontWeight:600,color:"#0ea5e9",minWidth:32},
  statRow:{display:"flex",gap:12,padding:"16px 24px"},
  tableWrap:{overflowX:"auto",padding:"0 24px 8px"},
  table:{width:"100%",borderCollapse:"collapse",fontSize:13},
  th:{padding:"10px 14px",textAlign:"left",background:"#f8fafc",fontWeight:600,fontSize:12,color:"#374151",borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap"},
  td:{padding:"12px 14px",color:"#374151",borderBottom:"1px solid #f1f5f9",verticalAlign:"middle"},
  emailAvatar:{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#0ea5e9,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"white",flexShrink:0},
  errorBadge:{display:"inline-block",padding:"3px 10px",borderRadius:20,background:"#fef2f2",color:"#dc2626",fontWeight:700,fontSize:13},
  codePill:{display:"inline-block",padding:"2px 8px",borderRadius:4,background:"#fef3c7",color:"#92400e",fontSize:11,fontWeight:500,marginRight:4,marginBottom:2},
  numBadge:{display:"inline-block",padding:"3px 10px",borderRadius:20,background:"#f1f5f9",color:"#374151",fontWeight:600,fontSize:13},
  statusPill:{display:"inline-block",padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:600},
  statusSent:{background:"#f0fdf4",color:"#166534"},
  statusFailed:{background:"#fef2f2",color:"#991b1b"},
  previewNote:{display:"flex",alignItems:"center",gap:8,padding:"12px 24px 16px",fontSize:13,color:"#0369a1",background:"#f0f9ff",borderTop:"1px solid #e0f2fe"},
  resultHeader:{display:"flex",alignItems:"center",gap:16,padding:"24px 24px 16px"},
  resultCheck:{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 12px rgba(34,197,94,0.3)"},
};
