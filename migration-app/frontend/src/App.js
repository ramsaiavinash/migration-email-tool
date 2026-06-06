import { useState, useRef, useEffect, useCallback } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
const ST = { IDLE:"idle", PREV:"prev", PROC:"proc", DONE:"done", ERR:"err" };

const persist = { get:(k,fb)=>{ try{const v=localStorage.getItem(k); return v?JSON.parse(v):fb;}catch{return fb;}}, set:(k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v));}catch{}} };
const emptyStats = () => ({ runs:0, users:0, sent:0, failed:0, errors:0, codes:{}, history:[] });

/* ── DESIGN TOKENS ─────────────────────────────────────────────────────── */
const BASE_SEMANTIC = {
  green:"#059669", greenBg:"#ECFDF5", greenBdr:"#A7F3D0",
  amber:"#D97706", amberBg:"#FFFBEB", amberBdr:"#FDE68A",
  red:"#DC2626", redBg:"#FEF2F2", redBdr:"#FECACA",
  blue:"#2563EB", blueBg:"#EFF6FF", blueBdr:"#BFDBFE",
  shadow:"0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)",
  shadowMd:"0 4px 16px rgba(0,0,0,0.08),0 2px 6px rgba(0,0,0,0.04)",
  shadowLg:"0 10px 32px rgba(0,0,0,0.1),0 4px 12px rgba(0,0,0,0.05)",
};
const BASE_SEMANTIC_DK = {
  green:"#34D399", greenBg:"#022C22", greenBdr:"#065F46",
  amber:"#FBBF24", amberBg:"#1C1200", amberBdr:"#78350F",
  red:"#F87171", redBg:"#1C0A0A", redBdr:"#7F1D1D",
  blue:"#60A5FA", blueBg:"#0C1A2E", blueBdr:"#1E3A5F",
  shadow:"0 1px 3px rgba(0,0,0,0.4),0 1px 2px rgba(0,0,0,0.3)",
  shadowMd:"0 4px 16px rgba(0,0,0,0.4),0 2px 6px rgba(0,0,0,0.3)",
  shadowLg:"0 10px 32px rgba(0,0,0,0.5),0 4px 12px rgba(0,0,0,0.3)",
};

const THEMES = {
  indigo: {
    name:"Indigo", emoji:"🟣",
    light:{ ...BASE_SEMANTIC, pageBg:"#F2F5F9", canvas:"#FFFFFF", canvasAlt:"#F8FAFC", canvasHover:"#EEF2F7", border:"#E3E8EF", borderStrong:"#C9D3DF", text:"#111827", textSub:"#4B5563", textMuted:"#9CA3AF", sidebar:"#111827", sidebarBorder:"rgba(255,255,255,0.07)", accent:"#6366F1", accentDark:"#4F46E5", accentBg:"#EEF2FF" },
    dark:{ ...BASE_SEMANTIC_DK, pageBg:"#0A0E17", canvas:"#111827", canvasAlt:"#0D1220", canvasHover:"#1A2235", border:"#1E2A3B", borderStrong:"#2D3E52", text:"#F1F5F9", textSub:"#94A3B8", textMuted:"#4B5E6E", sidebar:"#070B12", sidebarBorder:"rgba(255,255,255,0.06)", accent:"#818CF8", accentDark:"#6366F1", accentBg:"#1E1B4B" },
  },
  ocean: {
    name:"Ocean Blue", emoji:"🔵",
    light:{ ...BASE_SEMANTIC, pageBg:"#F0F6FF", canvas:"#FFFFFF", canvasAlt:"#F5F9FF", canvasHover:"#E8F0FE", border:"#D4E2F4", borderStrong:"#A8C4E8", text:"#0D2137", textSub:"#2D5282", textMuted:"#7BA5C9", sidebar:"#0D2137", sidebarBorder:"rgba(255,255,255,0.08)", accent:"#1D6BCE", accentDark:"#1558A8", accentBg:"#DBEAFE" },
    dark:{ ...BASE_SEMANTIC_DK, pageBg:"#050D1A", canvas:"#0A1628", canvasAlt:"#071020", canvasHover:"#0F1E35", border:"#132640", borderStrong:"#1E3A5F", text:"#E2EEFF", textSub:"#7BAFD4", textMuted:"#3A5F7A", sidebar:"#030810", sidebarBorder:"rgba(255,255,255,0.06)", accent:"#60A5FA", accentDark:"#3B82F6", accentBg:"#0C1A2E" },
  },
  emerald: {
    name:"Emerald", emoji:"🟢",
    light:{ ...BASE_SEMANTIC, pageBg:"#F0FBF4", canvas:"#FFFFFF", canvasAlt:"#F4FDF6", canvasHover:"#E6F7EC", border:"#C6E8D1", borderStrong:"#8ED4A8", text:"#0D2118", textSub:"#2D6046", textMuted:"#6BA882", sidebar:"#0D2118", sidebarBorder:"rgba(255,255,255,0.08)", accent:"#059669", accentDark:"#047857", accentBg:"#D1FAE5" },
    dark:{ ...BASE_SEMANTIC_DK, pageBg:"#020E08", canvas:"#071A10", canvasAlt:"#051408", canvasHover:"#0B2014", border:"#0F3020", borderStrong:"#165C30", text:"#DCFCE7", textSub:"#6EE7A0", textMuted:"#2D6A45", sidebar:"#020A06", sidebarBorder:"rgba(255,255,255,0.06)", accent:"#34D399", accentDark:"#10B981", accentBg:"#022C22" },
  },
  slate: {
    name:"Slate Pro", emoji:"⬜",
    light:{ ...BASE_SEMANTIC, pageBg:"#F4F6F9", canvas:"#FFFFFF", canvasAlt:"#F8F9FB", canvasHover:"#ECEEF2", border:"#DDE1E9", borderStrong:"#B8BFCC", text:"#0F1624", textSub:"#3D4A5C", textMuted:"#8896A8", sidebar:"#1A2332", sidebarBorder:"rgba(255,255,255,0.07)", accent:"#3B5BDB", accentDark:"#2F4AC4", accentBg:"#EDF2FF" },
    dark:{ ...BASE_SEMANTIC_DK, pageBg:"#080C12", canvas:"#0F1520", canvasAlt:"#0C1019", canvasHover:"#141B28", border:"#1C2636", borderStrong:"#2A3A52", text:"#E8EDF5", textSub:"#8896A8", textMuted:"#3D4A5C", sidebar:"#060A10", sidebarBorder:"rgba(255,255,255,0.06)", accent:"#748FFC", accentDark:"#5C7CFA", accentBg:"#1A2050" },
  },
  rose: {
    name:"Rose", emoji:"🌸",
    light:{ ...BASE_SEMANTIC, pageBg:"#FFF5F6", canvas:"#FFFFFF", canvasAlt:"#FFF8F9", canvasHover:"#FFE8EC", border:"#F5CDD3", borderStrong:"#EDAAB4", text:"#1A0B0F", textSub:"#6B2D3E", textMuted:"#C47A8A", sidebar:"#1A0B0F", sidebarBorder:"rgba(255,255,255,0.08)", accent:"#E11D48", accentDark:"#BE123C", accentBg:"#FFE4E6" },
    dark:{ ...BASE_SEMANTIC_DK, pageBg:"#100508", canvas:"#1A080D", canvasAlt:"#130608", canvasHover:"#220B12", border:"#2E0F16", borderStrong:"#5A1828", text:"#FFE4E6", textSub:"#FDA4AF", textMuted:"#5A1828", sidebar:"#0A0305", sidebarBorder:"rgba(255,255,255,0.06)", accent:"#FB7185", accentDark:"#F43F5E", accentBg:"#4C0519" },
  },
  amber: {
    name:"Amber", emoji:"🟡",
    light:{ ...BASE_SEMANTIC, pageBg:"#FEFBF0", canvas:"#FFFFFF", canvasAlt:"#FFFDF5", canvasHover:"#FEF6D8", border:"#F0DFA0", borderStrong:"#E8C840", text:"#1A1200", textSub:"#5C4400", textMuted:"#B89A30", sidebar:"#1A1200", sidebarBorder:"rgba(255,255,255,0.08)", accent:"#D97706", accentDark:"#B45309", accentBg:"#FEF3C7" },
    dark:{ ...BASE_SEMANTIC_DK, pageBg:"#0D0A00", canvas:"#1A1400", canvasAlt:"#140F00", canvasHover:"#241D00", border:"#2E2400", borderStrong:"#5C4400", text:"#FEF9E7", textSub:"#FCD34D", textMuted:"#5C4400", sidebar:"#080600", sidebarBorder:"rgba(255,255,255,0.06)", accent:"#FBBF24", accentDark:"#F59E0B", accentBg:"#2C1C00" },
  },
};

const LT = THEMES.indigo.light;
const DK = THEMES.indigo.dark;

export default function App() {
  const [themeKey, setThemeKey] = useState(() => persist.get("mp_theme_key", "indigo"));
  const [dark, setDark]         = useState(() => persist.get("mp_dk", false));
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [page, setPage]       = useState("dashboard");
  const [file, setFile]       = useState(null);
  const [status, setStatus]   = useState(ST.IDLE);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [errMsg, setErrMsg]   = useState("");
  const [drag, setDrag]       = useState(false);
  const [prog, setProg]       = useState(0);
  const [progTxt, setProgTxt] = useState("");
  const [stats, setStats]     = useState(() => persist.get("mp_stats", emptyStats()));
  const [expanded, setExpanded] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [orgName, setOrgName]         = useState(() => persist.get("mp_org_name", ""));
  const [orgEmail, setOrgEmail]       = useState(() => persist.get("mp_org_email", ""));
  const [orgProject, setOrgProject]   = useState(() => persist.get("mp_org_project", ""));
  const [backendUrl, setBackendUrl]   = useState(() => persist.get("mp_backend_url", BACKEND));
  const [paUrl, setPaUrl]             = useState(() => persist.get("mp_pa_url", ""));
  const [settingsTab, setSettingsTab] = useState("org");
  const [saveMsg, setSaveMsg]         = useState("");

  const BACKEND_LIVE = backendUrl || BACKEND;

  function saveConfig(key, val, setter) {
    setter(val);
    persist.set(key, val);
    setSaveMsg("Saved ✓");
    setTimeout(() => setSaveMsg(""), 2000);
  }
  const fileRef = useRef();
  const theme = THEMES[themeKey] || THEMES.indigo;
  const C = { ...(dark ? theme.dark : theme.light) };
  // Keep semantic colors consistent
  if (!dark) { C.green=C.green||"#059669"; C.greenBg=C.greenBg||"#ECFDF5"; C.greenBdr=C.greenBdr||"#A7F3D0"; }

  useEffect(() => {
    document.body.style.background = C.pageBg;
    persist.set("mp_dk", dark);
    persist.set("mp_theme_key", themeKey);
  }, [dark, C.pageBg]);

  useEffect(() => {
    if (status !== ST.PROC) return;
    setProg(0);
    const steps = ["Parsing ZIP archive…","Grouping errors by user…","Building Excel reports…","Triggering Power Automate…","Sending via Outlook…"];
    let si = 0; setProgTxt(steps[0]);
    const t = setInterval(() => {
      setProg(p => {
        const n = Math.min(p + 1.1, 91);
        const ni = Math.min(Math.floor(n / 19), steps.length - 1);
        if (ni !== si) { si = ni; setProgTxt(steps[ni]); }
        return n;
      });
    }, 130);
    return () => clearInterval(t);
  }, [status]);

  const onFile = f => {
    if (!f) return;
    if (!f.name.endsWith(".zip")) { setErrMsg("Please upload a .zip file from M365 Migration Manager."); return; }
    setFile(f); setStatus(ST.IDLE); setPreview(null); setResults(null); setErrMsg("");
  };
  const doPreview = async () => {
    if (!file) return;
    setStatus(ST.PREV); setErrMsg("");
    try {
      const fd = new FormData(); fd.append("migrationZip", file);
      const r = await fetch(`${BACKEND_LIVE}/api/preview-migration`, { method:"POST", body:fd });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "Preview failed");
      setPreview(d); setStatus(ST.IDLE);
    } catch(e) { setErrMsg(e.message); setStatus(ST.ERR); }
  };
  const doProcess = async () => {
    if (!file) return;
    setStatus(ST.PROC); setErrMsg("");
    try {
      const fd = new FormData(); fd.append("migrationZip", file);
      const r = await fetch(`${BACKEND_LIVE}/api/process-migration`, { method:"POST", body:fd });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "Processing failed");
      setResults(d); setStatus(ST.DONE);
      setStats(prev => {
        const codes = { ...prev.codes };
        (preview?.users||[]).forEach(u => u.errorCodes.forEach(c => { codes[c] = (codes[c]||0) + 1; }));
        const next = { runs:prev.runs+1, users:prev.users+d.affectedUsers, sent:prev.sent+d.successCount, failed:prev.failed+d.failedCount, errors:prev.errors+(preview?.totalErrors||0), codes, history:[{ id:Date.now(), date:new Date().toLocaleString(), file:file.name, users:d.affectedUsers, sent:d.successCount, failed:d.failedCount, errors:preview?.totalErrors||0 }, ...prev.history].slice(0,25) };
        persist.set("mp_stats", next); return next;
      });
    } catch(e) { setErrMsg(e.message); setStatus(ST.ERR); }
  };
  const reset = () => { setFile(null); setStatus(ST.IDLE); setPreview(null); setResults(null); setErrMsg(""); setProg(0); setExpanded(null); };
  const busy = status === ST.PREV || status === ST.PROC;
  const rate = stats.sent + stats.failed > 0 ? Math.round(stats.sent/(stats.sent+stats.failed)*100) : null;
  const sw = sideCollapsed ? 64 : 224;

  const NAV = [
    { id:"dashboard", label:"Dashboard",   icon:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { id:"process",   label:"Process ZIP", icon:"M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id:"history",   label:"History",     icon:"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { id:"errorcodes", label:"Error Codes",  icon:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { id:"logs",       label:"Activity Logs", icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { id:"settings",   label:"Settings",    icon:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.pageBg, fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif", color:C.text }}>
      <style>{makeCSS(C, dark, sw)}</style>

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside style={{ width:sw, background:C.sidebar, display:"flex", flexDirection:"column", position:"fixed", inset:"0 auto 0 0", zIndex:200, transition:"width 0.25s cubic-bezier(.4,0,.2,1)", overflow:"hidden" }}>
        {/* Logo */}
        <div style={{ padding:sideCollapsed?"18px 0":"20px 16px 18px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${C.sidebarBorder}`, justifyContent:sideCollapsed?"center":"flex-start", minHeight:68 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 12px rgba(99,102,241,0.4)" }}>
            <SVG d="M22 12 18 12 15 21 9 3 6 12 2 12" stroke="#fff" w={18} h={18} sw={2.5}/>
          </div>
          {!sideCollapsed && (
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#F8FAFC", letterSpacing:"-0.4px", whiteSpace:"nowrap" }}>MigraPulse</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.32)", letterSpacing:"0.08em", fontWeight:500, marginTop:1 }}>{orgName||"MigraPulse"}</div>
            </div>
          )}
          {!sideCollapsed && (
            <button onClick={()=>setSideCollapsed(true)} style={{ marginLeft:"auto", width:24, height:24, borderRadius:6, background:"rgba(255,255,255,0.06)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.35)", transition:"all .15s", flexShrink:0 }} className="sbc">
              <SVG d="M15 19l-7-7 7-7" stroke="currentColor" w={13} h={13}/>
            </button>
          )}
          {sideCollapsed && (
            <button onClick={()=>setSideCollapsed(false)} style={{ position:"absolute", top:22, right:-1, width:22, height:22, borderRadius:"50%", background:C.accent, border:`2px solid ${C.sidebar}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }} className="sec">
              <SVG d="M9 5l7 7-7 7" stroke="#fff" w={11} h={11}/>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:sideCollapsed?"12px 8px":"14px 10px 10px", overflowY:"auto" }}>
          {!sideCollapsed && <p style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.25)", padding:"0 8px 10px", letterSpacing:"0.12em" }}>MAIN MENU</p>}
          {NAV.map(item => (
            <div key={item.id} className={`ni${page===item.id?" na":""}`} onClick={()=>{ setPage(item.id); if(item.id==="process") reset(); }} title={sideCollapsed?item.label:""} style={{ justifyContent:sideCollapsed?"center":"flex-start", padding:sideCollapsed?"10px":"9px 10px" }}>
              <SVG d={item.icon} stroke="currentColor" w={17} h={17} style={{ flexShrink:0 }}/>
              {!sideCollapsed && <span style={{ whiteSpace:"nowrap", overflow:"hidden" }}>{item.label}</span>}
              {!sideCollapsed && item.id==="history" && stats.history.length>0 && <span className="nb">{stats.history.length}</span>}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!sideCollapsed && (
          <div style={{ padding:"12px 10px", borderTop:`1px solid ${C.sidebarBorder}` }}>
            {/* Theme + Dark toggle */}
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 8px 6px" }}>
              <span style={{ fontSize:13 }}>{dark?"🌙":"☀️"}</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)", flex:1 }}>{dark?"Night":"Day"}</span>
              <button className="tog" onClick={()=>setDark(v=>!v)}>
                <span className={`tok${dark?" on":""}`}/>
              </button>
            </div>
            <button onClick={()=>setShowThemePicker(v=>!v)} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 8px 9px", background:"none", border:"none", cursor:"pointer", width:"100%", borderRadius:6, transition:"background .15s" }} className="tbtn">
              <span style={{ fontSize:13 }}>{theme.emoji}</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)", flex:1, textAlign:"left" }}>{theme.name}</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>▾</span>
            </button>
            {showThemePicker && (
              <div style={{ background:"#1a2234", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:8, marginBottom:6 }}>
                <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", padding:"0 4px 6px" }}>CHOOSE THEME</div>
                {Object.entries(THEMES).map(([key, th]) => (
                  <button key={key} onClick={()=>{ setThemeKey(key); persist.set("mp_theme_key",key); setShowThemePicker(false); }} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"7px 8px", borderRadius:6, border:"none", cursor:"pointer", background:themeKey===key?"rgba(255,255,255,0.1)":"transparent", marginBottom:1, transition:"background .12s" }} className="topt">
                    <span style={{ fontSize:13 }}>{th.emoji}</span>
                    <span style={{ fontSize:12, color:themeKey===key?"#fff":"rgba(255,255,255,0.55)", fontWeight:themeKey===key?700:400 }}>{th.name}</span>
                    {themeKey===key && <span style={{ marginLeft:"auto", fontSize:10, color:"#818CF8" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
            {/* Status */}
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px 8px" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#34D399", flexShrink:0, boxShadow:"0 0 0 3px rgba(52,211,153,0.2)" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", flex:1 }}>Power Automate</span>
              <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.1em", color:"#34D399" }}>LIVE</span>
            </div>
            {/* User */}
            <div style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 8px 2px" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff", flexShrink:0 }}>{orgName?orgName[0].toUpperCase():"IT"}</div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#F1F5F9" }}>{orgName||"IT Admin"}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{orgProject||"Migration Team"}</div>
              </div>
            </div>
          </div>
        )}
        {sideCollapsed && (
          <div style={{ padding:"12px 8px", borderTop:`1px solid ${C.sidebarBorder}`, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <button className="tog" onClick={()=>setDark(v=>!v)} title="Toggle theme"><span className={`tok${dark?" on":""}`}/></button>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff" }}>{orgName?orgName[0].toUpperCase():"IT"}</div>
          </div>
        )}
      </aside>

      {/* ══ MAIN ═════════════════════════════════════════════════════════════ */}
      <main style={{ flex:1, marginLeft:sw, transition:"margin-left 0.25s cubic-bezier(.4,0,.2,1)", minHeight:"100vh" }}>

        {/* DASHBOARD */}
        {page==="dashboard" && (
          <div className="pg">
            <PageHeader C={C} title="Dashboard" sub={orgName ? `${orgName} — Migration Error Notifications` : "Microsoft 365 Migration Manager — Automated Error Notification"}>
              <Btn primary C={C} onClick={()=>{setPage("process");reset();}}>
                <SVG d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" w={14} h={14} stroke="#fff"/> Upload ZIP
              </Btn>
            </PageHeader>

            {/* KPI grid */}
            <div className="kgrid">
              {[
                { label:"Total Runs",     val:stats.runs,   col:C.accent,  bg:C.accentBg, icon:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
                { label:"Users Notified", val:stats.users,  col:"#8B5CF6", bg:dark?"#1E1B4B":"#F5F3FF", icon:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                { label:"Emails Sent",    val:stats.sent,   col:C.green,   bg:C.greenBg,  icon:"M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                { label:"Failed",         val:stats.failed, col:stats.failed>0?C.red:C.textMuted, bg:stats.failed>0?C.redBg:C.canvasAlt, icon:"M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label:"Total Errors",   val:stats.errors, col:C.amber,   bg:C.amberBg,  icon:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
                { label:"Delivery Rate",  val:rate!==null?rate+"%":"—", col:rate===100?C.green:rate>90?C.accent:C.amber, bg:rate===100?C.greenBg:rate>90?C.accentBg:C.amberBg, icon:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", live:rate!==null },
              ].map((k,i) => (
                <div key={i} className="kcard" style={{ "--delay":`${i*0.05}s`, background:C.canvas, border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                    <div style={{ width:40, height:40, borderRadius:11, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <SVG d={k.icon} stroke={k.col} w={18} h={18}/>
                    </div>
                    {k.live && <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.1em", color:C.green, background:C.greenBg, padding:"3px 8px", borderRadius:20, border:`1px solid ${C.greenBdr}` }}>LIVE</span>}
                  </div>
                  <div style={{ fontSize:32, fontWeight:800, color:k.col, lineHeight:1, marginBottom:6, letterSpacing:"-1.5px" }}>{k.val}</div>
                  <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase" }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div style={{ display:"grid", gridTemplateColumns:"1.2fr 0.8fr", gap:16, marginBottom:16 }}>
              <SectionCard C={C} accent="#F59E0B" title="Error Code Breakdown" sub="Distribution by type">
                {Object.keys(stats.codes).length===0 ? <EmptyChart C={C}/> : <DonutChart data={stats.codes} C={C}/>}
              </SectionCard>
              <SectionCard C={C} accent={C.green} title="Email Delivery" sub="Sent vs failed per run">
                {stats.history.length===0 ? <EmptyChart C={C} label="No runs yet"/> : <BarChart runs={stats.history} C={C}/>}
              </SectionCard>
            </div>

            {/* History table */}
            <SectionCard C={C} accent="#8B5CF6" title="Recent Runs" sub={`${stats.history.length} run(s) this session`} action={
                <div style={{ display:"flex", gap:6 }}>
                  {stats.history.length>0 && <>
                    <button onClick={()=>{const d=JSON.stringify(stats,null,2);const b=new Blob([d],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`migrapulse_history_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(u);}} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:7,border:`1px solid ${C.border}`,background:C.canvasAlt,color:C.textMuted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>⬇ Export</button>
                    <GhostBtn C={C} onClick={()=>{const n=emptyStats();setStats(n);persist.set("mp_stats",n);}}>Clear</GhostBtn>
                  </>}
                </div>
              }>
              {stats.history.length===0 ? (
                <EmptyState C={C} label="No runs yet">
                  <Btn primary C={C} style={{ marginTop:16 }} onClick={()=>{setPage("process");reset();}}>Process your first ZIP</Btn>
                </EmptyState>
              ) : <DataTable rows={stats.history} C={C} dark={dark} numbered cols={["#","Date","Source File","Users","Errors","Sent","Failed","Delivery","Status"]}/>}
            </SectionCard>
          </div>
        )}

        {/* PROCESS ZIP */}
        {page==="process" && (
          <div className="pg">
            <PageHeader C={C} title="Process Migration ZIP" sub="Upload your Migration Manager ZIP → Preview errors → Send personalized notifications">
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:20, background:C.greenBg, border:`1px solid ${C.greenBdr}`, fontSize:12, fontWeight:600, color:C.green }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:C.green, boxShadow:`0 0 0 2px ${C.greenBg}` }}/>
                Power Automate Live
              </div>
            </PageHeader>

            {/* Step indicator */}
            {!results && (
              <div style={{ display:"flex", alignItems:"center", background:C.canvas, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 24px", marginBottom:20, boxShadow:C.shadow }}>
                {[{n:1,l:"Upload ZIP",ok:!!file},{n:2,l:"Preview Errors",ok:!!preview},{n:3,l:"Send Emails",ok:status===ST.DONE}].map((s,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", flex:i<2?1:"auto" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                      <div style={{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0, transition:"all .2s",
                        background: s.ok ? C.green : (i===0&&!file)||(i===1&&file&&!preview)||(i===2&&preview) ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : C.canvasAlt,
                        color: s.ok||(i===0&&!file)||(i===1&&file&&!preview)||(i===2&&preview) ? "#fff" : C.textMuted,
                        boxShadow: s.ok ? `0 0 0 4px ${C.greenBg}` : (i===0&&!file)||(i===1&&file&&!preview)||(i===2&&preview) ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
                        border: "none" }}>
                        {s.ok ? <SVG d="M20 6 9 17 4 12" stroke="#fff" w={13} h={13} sw={2.5}/> : s.n}
                      </div>
                      <span style={{ fontSize:13, fontWeight:600, color: s.ok ? C.green : (i===0&&!file)||(i===1&&file&&!preview)||(i===2&&preview) ? C.accent : C.textMuted }}>{s.l}</span>
                    </div>
                    {i<2 && <div style={{ flex:1, height:2, background:preview&&i===0?`linear-gradient(90deg,${C.green},${C.greenBdr})`:C.border, margin:"0 16px", borderRadius:2, transition:"background 0.3s" }}/>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {!results && (
                <SectionCard C={C} accent={C.accent} title="Upload Migration Report" sub="Supports Summary ZIP and Detailed ZIP exported from Microsoft 365 Migration Manager">
                  <div
                    className={`dz${drag?" dh":""}${file?" df":""}`}
                    style={{ borderColor:C.borderStrong, background:C.canvasAlt }}
                    onClick={()=>!file&&fileRef.current.click()}
                    onDragOver={e=>{e.preventDefault();setDrag(true);}}
                    onDragLeave={()=>setDrag(false)}
                    onDrop={e=>{e.preventDefault();setDrag(false);onFile(e.dataTransfer.files[0]);}}>
                    <input ref={fileRef} type="file" accept=".zip" style={{ display:"none" }} onChange={e=>onFile(e.target.files[0])}/>
                    {file ? (
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <div style={{ width:46, height:46, borderRadius:12, background:C.accentBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`1px solid ${C.border}` }}>
                          <SVG d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z M13 2 13 9 20 9" stroke={C.accent} w={22} h={22}/>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{file.name}</div>
                          <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>{(file.size/1024).toFixed(1)} KB · Ready to process</div>
                        </div>
                        <button style={{ width:30, height:30, borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.textMuted, transition:"all .15s" }} onClick={e=>{e.stopPropagation();reset();}} className="ibtn">
                          <SVG d="M18 6 6 18 M6 6 18 18" stroke="currentColor" w={13} h={13}/>
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ width:56, height:56, borderRadius:16, background:C.accentBg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", border:`1px solid ${C.border}` }}>
                          <SVG d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={C.accent} w={26} h={26} sw={1.5}/>
                        </div>
                        <p style={{ margin:"0 0 6px", fontSize:15, fontWeight:700, color:C.text }}>Drop your migration ZIP here</p>
                        <p style={{ margin:0, fontSize:13, color:C.textMuted }}>or <span style={{ color:C.accent, fontWeight:600, cursor:"pointer" }}>browse files</span> · accepts any Migration Manager ZIP export</p>
                      </div>
                    )}
                  </div>
                  {errMsg && (
                    <div style={{ display:"flex", alignItems:"center", gap:9, marginTop:12, padding:"11px 16px", background:C.redBg, border:`1px solid ${C.redBdr}`, borderRadius:10, fontSize:13, color:C.red, fontWeight:500 }}>
                      <SVG d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={C.red} w={15} h={15}/>{errMsg}
                    </div>
                  )}
                  {file && (
                    <div style={{ display:"flex", gap:10, marginTop:18 }}>
                      <Btn C={C} onClick={doPreview} disabled={busy}>
                        {status===ST.PREV?<Spinner C={C}/>:<SVG d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 106 0 3 3 0 00-6 0" stroke="currentColor" w={15} h={15}/>}
                        {status===ST.PREV?"Parsing…":"Preview Errors"}
                      </Btn>
                      <Btn primary C={C} onClick={doProcess} disabled={!preview||busy} style={{ opacity:!preview||busy?0.45:1 }}>
                        {status===ST.PROC?<Spinner C={C} white/>:<SVG d="M22 2 11 13 M22 2 15 22 11 13 2 9 22 2" stroke="#fff" w={15} h={15}/>}
                        {status===ST.PROC?progTxt:"Send All Emails"}
                      </Btn>
                    </div>
                  )}
                  {status===ST.PROC && (
                    <div style={{ marginTop:18 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                        <span style={{ fontSize:12, color:C.textMuted, fontWeight:500 }}>{progTxt}</span>
                        <span style={{ fontSize:12, fontWeight:800, color:C.accent }}>{Math.round(prog)}%</span>
                      </div>
                      <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", background:`linear-gradient(90deg,${C.accent},#8B5CF6)`, width:`${prog}%`, borderRadius:3, transition:"width 0.3s ease" }}/>
                      </div>
                    </div>
                  )}
                </SectionCard>
              )}

              {preview && !results && (
                <SectionCard C={C} accent="#8B5CF6" title={`${preview.affectedUsers} User(s) Affected — ${preview.totalErrors.toLocaleString()} Errors`} sub={preview.sourceFile}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
                    {[["Users Affected",preview.affectedUsers,"#8B5CF6"],["Total Errors",preview.totalErrors.toLocaleString(),C.red],["Emails to Send",preview.affectedUsers,C.green]].map(([l,v,col])=>(
                      <div key={l} style={{ background:C.canvasAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px" }}>
                        <div style={{ fontSize:26, fontWeight:800, color:col, letterSpacing:"-1px" }}>{v}</div>
                        <div style={{ fontSize:11, color:C.textMuted, marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX:"auto", margin:"0 -20px" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <thead><tr>{["User","Errors","Error Codes","Sample Files",""].map(h=><TH key={h} C={C}>{h}</TH>)}</tr></thead>
                      <tbody>
                        {preview.users.map((u,i)=>(
                          <>
                            <tr key={i} className="tr" style={{ background:expanded===i?C.canvasHover:"" }}>
                              <TD C={C}><div style={{ display:"flex", alignItems:"center", gap:9 }}><Ava email={u.userEmail} C={C}/><span style={{ fontWeight:600, color:C.text }}>{u.userEmail}</span></div></TD>
                              <TD C={C} center><Pill col={C.red} bg={C.redBg}>{u.errorCount}</Pill></TD>
                              <TD C={C}>{u.errorCodes.slice(0,3).map(cd=><CodeTag key={cd} C={C}>{cd.replace("MEXPORTFILEUNSUPPORTEDMIMETYPE","SHORTCUT").replace("MVERSIONDOWNLOAD","VER_DL")}</CodeTag>)}{u.errorCodes.length>3&&<CodeTag C={C}>+{u.errorCodes.length-3}</CodeTag>}</TD>
                              <TD C={C}><span style={{ fontSize:12, color:C.textMuted }}>{u.preview.map(p=>p.file).slice(0,2).join(", ")}{u.preview.length>2?` +${u.preview.length-2}`:""}</span></TD>
                              <TD C={C}><GhostBtn C={C} onClick={()=>setExpanded(expanded===i?null:i)}>{expanded===i?"▲ Hide":"▼ Details"}</GhostBtn></TD>
                            </tr>
                            {expanded===i && (
                              <tr key={`ex${i}`}><td colSpan={5} style={{ padding:"14px 20px 18px", background:C.canvasAlt, borderBottom:`1px solid ${C.border}` }}>
                                <Label C={C}>All error codes</Label>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:14 }}>{u.errorCodes.map(cd=><CodeTag key={cd} C={C}>{cd}</CodeTag>)}</div>
                                <Label C={C}>Sample files</Label>
                                {u.preview.map((p,j)=><div key={j} style={{ display:"flex", gap:10, fontSize:12, padding:"5px 0", borderBottom:`1px solid ${C.border}`, color:C.text, alignItems:"center" }}><CodeTag C={C}>{p.code}</CodeTag><span style={{ color:C.textSub }}>{p.file}</span></div>)}
                              </td></tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:9, padding:"12px 20px", background:C.blueBg, borderTop:`1px solid ${C.blueBdr}`, margin:"0 -20px -20px", fontSize:13, color:C.blue, fontWeight:500 }}>
                    <SVG d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={C.blue} w={15} h={15}/>
                    Each user receives a personalized Outlook email with a fully colored Excel error report attached.
                  </div>
                </SectionCard>
              )}

              {results && (
                <div className="cd" style={{ background:C.canvas, border:`1px solid ${C.border}`, boxShadow:C.shadow }}>
                  <div style={{ display:"flex", alignItems:"center", gap:16, padding:"20px 22px 18px", background:C.greenBg, borderBottom:`1px solid ${C.greenBdr}` }}>
                    <div style={{ width:48, height:48, borderRadius:14, background:C.green, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 4px 16px ${C.greenBg}` }}>
                      <SVG d="M20 6 9 17 4 12" stroke="#fff" w={22} h={22} sw={2.5}/>
                    </div>
                    <div>
                      <div style={{ fontSize:17, fontWeight:800, color:dark?"#34D399":"#065F46", letterSpacing:"-0.3px" }}>Notifications sent successfully</div>
                      <div style={{ fontSize:13, color:C.green, opacity:0.8, marginTop:3 }}>{results.successCount} sent · {results.failedCount} failed · {results.sourceFile}</div>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, padding:"16px 22px", borderBottom:`1px solid ${C.border}` }}>
                    {[["Emails Sent",results.successCount,C.green,C.greenBg],["Failed",results.failedCount,results.failedCount>0?C.red:C.textMuted,results.failedCount>0?C.redBg:C.canvasAlt],["Users Notified",results.affectedUsers,C.accent,C.accentBg]].map(([l,v,col,bg])=>(
                      <div key={l} style={{ background:bg, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px" }}>
                        <div style={{ fontSize:26, fontWeight:800, color:col, letterSpacing:"-1px" }}>{v}</div>
                        <div style={{ fontSize:11, color:C.textMuted, marginTop:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <thead><tr>{["User","Errors","Excel Report","Status","Time"].map(h=><TH key={h} C={C}>{h}</TH>)}</tr></thead>
                      <tbody>
                        {results.results.map((r,i)=>(
                          <tr key={i} className="tr">
                            <TD C={C}><div style={{ display:"flex", alignItems:"center", gap:9 }}><Ava email={r.userEmail} C={C}/><span style={{ fontWeight:600, color:C.text }}>{r.userEmail}</span></div></TD>
                            <TD C={C} center><Pill col={C.red} bg={C.redBg}>{r.errorCount}</Pill></TD>
                            <TD C={C}><span style={{ fontSize:12, color:C.textMuted, fontFamily:"'Cascadia Code',monospace" }}>{r.csvFileName}</span></TD>
                            <TD C={C}><StatusTag ok={r.status==="triggered"} C={C}>{r.status==="triggered"?"Sent":"Failed"}</StatusTag></TD>
                            <TD C={C}><span style={{ fontSize:12, color:C.textMuted }}>{new Date().toLocaleTimeString()}</span></TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display:"flex", gap:10, padding:"16px 22px" }}>
                    <Btn C={C} onClick={reset}><SVG d="M23 4 23 10 17 10 M20.49 15a9 9 0 11-2.12-9.36L23 10" stroke="currentColor" w={14} h={14}/> Process Another</Btn>
                    <Btn primary C={C} onClick={()=>setPage("dashboard")}>View Dashboard</Btn>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY */}
        {page==="history" && (
          <div className="pg">
            <PageHeader C={C} title="Run History" sub={`${stats.history.length} migration run(s) — saved in browser`}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                {stats.history.length>0 && (
                  <button onClick={()=>{const d=JSON.stringify(stats,null,2);const b=new Blob([d],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`migrapulse_history_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(u);}}
                    style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:8,border:`1px solid ${C.greenBdr}`,background:C.greenBg,color:C.green,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                    <SVG d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke={C.green} w={15} h={15}/> Export JSON
                  </button>
                )}
                <label style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6366F1,#8B5CF6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(99,102,241,0.4)" }}>
                  <SVG d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" stroke="#fff" w={15} h={15}/> Import History
                  <input type="file" accept=".json" style={{ display:"none" }} onChange={e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{try{const data=JSON.parse(ev.target.result);if(data.history&&Array.isArray(data.history)){setStats(data);persist.set("mp_stats",data);alert(`✓ Imported ${data.history.length} run(s) successfully!`);}else{alert("Invalid file — please use a MigraPulse export file");}}catch{alert("Could not read file");}};reader.readAsText(file);e.target.value="";}}/>
                </label>
                {stats.history.length>0 && (
                  <button onClick={()=>{if(window.confirm("Clear all history?")){{const n=emptyStats();setStats(n);persist.set("mp_stats",n);}}}}
                    style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:8,border:`1px solid ${C.redBdr}`,background:C.redBg,color:C.red,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                    Clear All
                  </button>
                )}
              </div>
            </PageHeader>
            <SectionCard C={C} accent="#8B5CF6" title="All Runs" sub="Complete audit trail — persisted across sessions">
              {stats.history.length===0 ? (
                <EmptyState C={C} label="No runs recorded">
                  <Btn primary C={C} style={{ marginTop:16 }} onClick={()=>{setPage("process");reset();}}>Process a ZIP</Btn>
                </EmptyState>
              ) : <DataTable rows={stats.history} C={C} dark={dark} numbered cols={["#","Date","Source File","Users","Errors","Sent","Failed","Delivery","Status"]}/>}
            </SectionCard>
          </div>
        )}

        {/* ERROR CODES */}
        {page==="errorcodes" && <ErrorCodesPage C={C} dark={dark} backendUrl={BACKEND_LIVE}/>}

        {/* LOGS */}
        {page==="logs" && <LogsPage C={C} dark={dark} backendUrl={BACKEND_LIVE}/>}

        {/* SETTINGS */}
        {page==="settings" && (
          <div className="pg">
            <PageHeader C={C} title="Settings" sub="Configure MigraPulse for your organization">
              {saveMsg && <span style={{ fontSize:13, fontWeight:700, color:C.green, background:C.greenBg, padding:"6px 14px", borderRadius:8, border:`1px solid ${C.greenBdr}` }}>{saveMsg}</span>}
            </PageHeader>

            {/* Tabs */}
            <div style={{ display:"flex", gap:2, marginBottom:20, background:C.canvasAlt, padding:4, borderRadius:10, border:`1px solid ${C.border}`, width:"fit-content" }}>
              {[
                ["org",     "🏢  Organization"],
                ["connect", "🔗  Connections"],
                ["notify",  "📧  Notifications"],
                ["appear",  "🎨  Appearance"],
                ["guide",   "📖  Setup Guide"],
                ["status",  "✅  System Status"],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setSettingsTab(id)} style={{ padding:"8px 16px", borderRadius:7, border:"none", background:settingsTab===id?C.canvas:"transparent", color:settingsTab===id?C.text:C.textMuted, fontWeight:settingsTab===id?700:500, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all .15s", boxShadow:settingsTab===id?C.shadow:"none" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── ORGANIZATION TAB ── */}
            {settingsTab==="org" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <SectionCard C={C} accent={C.accent} title="Organization Profile" sub="Your organization details shown in reports, emails, and the sidebar">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                    {[
                      ["Organization Name",  "mp_org_name",    orgName,    setOrgName,    "e.g. Contoso Ltd, City of Springfield", "Shown in email subjects and sidebar"],
                      ["Project Name",       "mp_org_project", orgProject, setOrgProject, "e.g. Google Drive → OneDrive 2025",     "Shown in sidebar and history"],
                    ].map(([lbl,key,val,setter,ph,desc]) => (
                      <div key={key}>
                        <Label C={C}>{lbl}</Label>
                        <input value={val} onChange={e => saveConfig(key, e.target.value, setter)} placeholder={ph} className="ci"
                          style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"inherit", background:C.canvasAlt, color:C.text, marginTop:6 }}/>
                        <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard C={C} accent="#8B5CF6" title="About MigraPulse" sub="Open automation tool for Microsoft 365 Migration Manager">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                    {[
                      ["Tool", "MigraPulse v1.0", C.accent],
                      ["Backend", "Node.js + Express", C.green],
                      ["Frontend", "React + GitHub Pages", "#8B5CF6"],
                      ["Email delivery", "Power Automate + Outlook", C.blue],
                      ["AI assistant", "Groq llama-3.3-70b (free)", "#F59E0B"],
                      ["Error codes", "81 official Microsoft codes", C.green],
                    ].map(([l,v,col]) => (
                      <div key={l} style={{ background:C.canvasAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 14px" }}>
                        <div style={{ fontSize:11, color:C.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>{l}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:col }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ── CONNECTIONS TAB ── */}
            {settingsTab==="connect" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <SectionCard C={C} accent={C.amber} title="Backend API" sub="MigraPulse Node.js server URL — where ZIP processing happens">
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <div>
                      <Label C={C}>Backend URL</Label>
                      <div style={{ display:"flex", gap:8, marginTop:6 }}>
                        <input value={backendUrl} onChange={e => saveConfig("mp_backend_url", e.target.value, setBackendUrl)}
                          placeholder="http://localhost:3001" className="ci"
                          style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"inherit", background:C.canvasAlt, color:C.text, fontFamily:"'Cascadia Code',monospace" }}/>
                        <button className="bp" onClick={async () => {
                          try {
                            const r = await fetch(`${backendUrl||BACKEND}/health`);
                            const d = await r.json();
                            setSaveMsg(d.status==="ok" ? `✓ Connected — ${d.errorCodesLoaded||""} codes loaded` : "✗ Not OK");
                            setTimeout(() => setSaveMsg(""), 4000);
                          } catch { setSaveMsg("✗ Cannot reach backend"); setTimeout(() => setSaveMsg(""), 4000); }
                        }}>Test</button>
                      </div>
                      <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>Change this if your backend runs on a different host or port. Default: http://localhost:3001</div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                      {[
                        ["Local dev",   "http://localhost:3001"],
                        ["Codespaces",  "https://your-space-3001.app.github.dev"],
                        ["Azure",       "https://your-app.azurewebsites.net"],
                        ["Render",      "https://your-app.onrender.com"],
                        ["Railway",     "https://your-app.railway.app"],
                        ["Custom",      "https://api.yourorg.com"],
                      ].map(([lbl,url]) => (
                        <button key={lbl} onClick={() => saveConfig("mp_backend_url", url, setBackendUrl)}
                          style={{ padding:"8px 12px", borderRadius:7, border:`1px solid ${backendUrl===url?C.accent:C.border}`, background:backendUrl===url?C.accentBg:C.canvasAlt, color:backendUrl===url?C.accent:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:backendUrl===url?700:400, transition:"all .15s", textAlign:"left" }}>
                          <div style={{ fontWeight:600 }}>{lbl}</div>
                          <div style={{ fontSize:10, marginTop:2, opacity:0.7, fontFamily:"'Cascadia Code',monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{url}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard C={C} accent={C.blue} title="Power Automate" sub="HTTP trigger URL that receives migration data and sends emails">
                  <div>
                    <Label C={C}>Power Automate HTTP Trigger URL</Label>
                    <textarea value={paUrl} onChange={e => saveConfig("mp_pa_url", e.target.value, setPaUrl)}
                      placeholder="https://prod-xx.eastus.logic.azure.com/workflows/your-flow-trigger-url…" rows={3}
                      style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:12, outline:"none", fontFamily:"'Cascadia Code',monospace", background:C.canvasAlt, color:C.text, resize:"vertical", marginTop:6 }} className="ci"/>
                    <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>
                      Get this from Power Automate → Your flow → Edit → HTTP trigger → Show trigger URL.
                      <strong style={{ color:C.amber, marginLeft:4 }}>⚠ Also set POWER_AUTOMATE_URL in backend .env — the backend uses this to trigger the flow.</strong>
                    </div>
                  </div>
                  <div style={{ marginTop:14, padding:"12px 16px", background:C.blueBg, border:`1px solid ${C.blueBdr}`, borderRadius:8, fontSize:12, color:C.blue }}>
                    <div style={{ fontWeight:700, marginBottom:6 }}>How Power Automate flow should be configured:</div>
                    {["Trigger: When an HTTP request is received (Method: POST)","Action: Parse JSON (schema with userEmail, subject, emailBody, csvAttachment, csvFileName)","Action: Send an email (V2) — To: userEmail, Subject: subject, Body: emailBody, Attach: csvAttachment","Action (optional): Post to Teams channel with run summary"].map((s,i) => (
                      <div key={i} style={{ display:"flex", gap:8, marginBottom:4 }}>
                        <span style={{ fontWeight:800, color:C.accent }}>{i+1}.</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {settingsTab==="notify" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <SectionCard C={C} accent={C.green} title="Email Configuration" sub="How notification emails are sent to affected users">
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div>
                      <Label C={C}>IT Admin Email (CC on all emails)</Label>
                      <input value={orgEmail} onChange={e => saveConfig("mp_org_email", e.target.value, setOrgEmail)}
                        placeholder="itadmin@yourorg.com" className="ci"
                        style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"inherit", background:C.canvasAlt, color:C.text, marginTop:6 }}/>
                      <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>This address is CC'd on every migration notification email for audit purposes. Also set IT_ADMIN_EMAIL in backend .env.</div>
                    </div>
                    <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
                      <Label C={C}>Email format</Label>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
                        {[
                          ["📧 HTML email body", "Professional HTML template with error table, solutions, and action steps", true],
                          ["📎 Excel attachment", "Colored per-user Excel report with all errors, explanations, and status", true],
                          ["👤 Personalized per user", "Each user only sees their own errors — not others", true],
                          ["🔁 Power Automate delivery", "Sent via your org's Outlook — no external mail server needed", true],
                        ].map(([title, desc, enabled]) => (
                          <div key={title} style={{ display:"flex", gap:10, padding:"11px 14px", background:C.canvasAlt, border:`1px solid ${C.border}`, borderRadius:8 }}>
                            <span style={{ fontSize:14 }}>{title.split(" ")[0]}</span>
                            <div>
                              <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{title.slice(3)}</div>
                              <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{desc}</div>
                            </div>
                            <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color:C.green, flexShrink:0 }}>✓ On</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding:"12px 16px", background:C.amberBg, border:`1px solid ${C.amberBdr}`, borderRadius:8, fontSize:12, color:C.amber }}>
                      <strong>Note:</strong> The IT_ADMIN_EMAIL in backend .env is what actually gets used when sending emails. The value above is stored locally for reference.
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ── APPEARANCE TAB ── */}
            {settingsTab==="appear" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <SectionCard C={C} accent={C.accent} title="Theme" sub="Choose your preferred color theme — applies instantly">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                    {Object.entries(THEMES).map(([key, th]) => {
                      const tc = dark ? th.dark : th.light;
                      const active = themeKey === key;
                      return (
                        <button key={key} onClick={() => { setThemeKey(key); persist.set("mp_theme_key", key); }}
                          style={{ padding:"14px 16px", borderRadius:10, border:`2px solid ${active?tc.accent:C.border}`, background:active?tc.accentBg:C.canvasAlt, cursor:"pointer", fontFamily:"inherit", transition:"all .15s", textAlign:"left" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                            <span style={{ fontSize:20 }}>{th.emoji}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:active?tc.accent:C.text }}>{th.name}</span>
                            {active && <span style={{ marginLeft:"auto", fontSize:12, color:tc.accent }}>✓</span>}
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            {[tc.accent,"#8B5CF6",tc.green,tc.amber,tc.red].map((col,i) => (
                              <div key={i} style={{ width:16, height:16, borderRadius:4, background:col }}/>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>

                <SectionCard C={C} accent="#8B5CF6" title="Display Mode" sub="Switch between day and night mode">
                  <div style={{ display:"flex", gap:12 }}>
                    {[["☀️","Day mode",false],["🌙","Night mode",true]].map(([emoji,label,isDark]) => (
                      <button key={label} onClick={() => setDark(isDark)}
                        style={{ flex:1, padding:"16px", borderRadius:10, border:`2px solid ${dark===isDark?C.accent:C.border}`, background:dark===isDark?C.accentBg:C.canvasAlt, cursor:"pointer", fontFamily:"inherit", transition:"all .15s", textAlign:"center" }}>
                        <div style={{ fontSize:28, marginBottom:6 }}>{emoji}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:dark===isDark?C.accent:C.text }}>{label}</div>
                        {dark===isDark && <div style={{ fontSize:11, color:C.accent, marginTop:3 }}>Currently active</div>}
                      </button>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard C={C} accent={C.red} title="Reset" sub="Clear all locally stored data and settings">
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    {[
                      ["Clear run history", () => { const n=emptyStats(); setStats(n); persist.set("mp_stats",n); setSaveMsg("History cleared ✓"); setTimeout(()=>setSaveMsg(""),2000); }],
                      ["Reset organization profile", () => { setOrgName(""); setOrgEmail(""); setOrgProject(""); persist.set("mp_org_name",""); persist.set("mp_org_email",""); persist.set("mp_org_project",""); setSaveMsg("Profile reset ✓"); setTimeout(()=>setSaveMsg(""),2000); }],
                      ["Reset to default theme", () => { setThemeKey("indigo"); setDark(false); persist.set("mp_theme_key","indigo"); persist.set("mp_dk",false); setSaveMsg("Theme reset ✓"); setTimeout(()=>setSaveMsg(""),2000); }],
                      ["Reset backend URL", () => { setBackendUrl(BACKEND); persist.set("mp_backend_url",BACKEND); setSaveMsg("URL reset ✓"); setTimeout(()=>setSaveMsg(""),2000); }],
                    ].map(([lbl, fn]) => (
                      <button key={lbl} onClick={() => { if(window.confirm(`${lbl}?`)) fn(); }}
                        style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${C.redBdr}`, background:C.redBg, color:C.red, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ── SETUP GUIDE TAB ── */}
            {settingsTab==="guide" && (
              <SectionCard C={C} accent={C.blue} title="Setup Guide" sub="How any organization can deploy and use MigraPulse">
                <div>
                  {[
                    { step:"1", title:"Get a Groq API key (free)", desc:"Go to console.groq.com, sign up for free, and create an API key. MigraPulse uses Groq's llama-3.3-70b model — 14,400 requests/day at zero cost.", code:"GROQ_API_KEY=gsk_your_key_here" },
                    { step:"2", title:"Deploy the backend", desc:"Clone the repo, install dependencies, and start the Node.js backend on any server. Codespaces, Azure App Service, Render, or Railway all work.", code:"npm install && npm start  |  # Runs on port 3001" },
                    { step:"3", title:"Create a Power Automate flow", desc:"In Power Automate, create a new flow with HTTP trigger and Send Email (V2) action. Use the dynamic fields from the JSON payload.", code:"Trigger: HTTP  |  Action: Send Email (V2)  |  To: userEmail  |  Body: emailBody  |  Attach: csvAttachment" },
                    { step:"4", title:"Configure .env variables", desc:"In your backend folder, create or edit the .env file with your organization settings.", code:"POWER_AUTOMATE_URL=https://your-flow-url  |  IT_ADMIN_EMAIL=admin@yourorg.com  |  GROQ_API_KEY=gsk_your_key  |  PORT=3001" },
                    { step:"5", title:"Set your backend URL here", desc:"In Settings → Connections, enter your backend URL. Use localhost:3001 for local dev or your public URL if deployed.", code:"Settings → Connections tab → Backend URL field" },
                    { step:"6", title:"Export ZIP from Migration Manager", desc:"In M365 Admin Center go to Migration, select your project, then Reports and Download ZIP. Both Summary and Detailed ZIPs are supported.", code:"M365 Admin Center → Migration → Your Project → Reports → Download ZIP" },
                    { step:"7", title:"Upload, preview, and send", desc:"Upload the ZIP to MigraPulse, click Preview Errors to see affected users, then click Send All Emails. Every user gets a personalized report.", code:"Upload ZIP → Preview Errors → Send All Emails  ✓ Done in under 5 minutes" },
                  ].map((s, i) => (
                    <div key={i} style={{ display:"flex", gap:16, padding:"14px 0", borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},#8B5CF6)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#fff", flexShrink:0, marginTop:2 }}>{s.step}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{s.title}</div>
                        <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.65, marginBottom:8 }}>{s.desc}</div>
                        <code style={{ display:"block", fontFamily:"'Cascadia Code',monospace", fontSize:11, background:C.canvasAlt, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 12px", color:C.accent, whiteSpace:"pre-wrap" }}>{s.code}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── SYSTEM STATUS TAB ── */}
            {settingsTab==="status" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <SectionCard C={C} accent={C.green} title="System Status" sub="Live status of all MigraPulse services">
                  <div>
                    {[
                      ["Backend API",         `Node.js · ${BACKEND_LIVE}`],
                      ["Power Automate",      "HTTP trigger · Outlook delivery"],
                      ["AI Assistant",        "Groq llama-3.3-70b · Free · 14,400 req/day"],
                      ["Excel Reports",       "HTML-based colored reports per user"],
                      ["ZIP Parser",          "Summary + Detailed ZIP auto-detection"],
                      ["Error Knowledge Base","81 official Microsoft error codes built in"],
                      ["Theme Engine",        `${THEMES[themeKey]?.name || "Indigo"} theme · ${dark?"Night":"Day"} mode`],
                      ["Local Storage",       `Run history: ${stats.history.length} runs · Theme: ${themeKey} · Org: ${orgName||"Not set"}`],
                    ].map(([l, d]) => (
                      <div key={l} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 0", borderBottom:`1px solid ${C.border}` }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{l}</div>
                          <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{d}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, color:C.green, background:C.greenBg, padding:"4px 12px", borderRadius:20, border:`1px solid ${C.greenBdr}`, flexShrink:0 }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", background:C.green }}/>Active
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:16, display:"flex", gap:10 }}>
                    <button className="bp" onClick={async () => {
                      try {
                        const r = await fetch(`${BACKEND_LIVE}/health`);
                        const d = await r.json();
                        setSaveMsg(`Backend OK — ${d.errorCodesLoaded} codes · AI: ${d.aiEnabled?"✓":"✗"}`);
                      } catch { setSaveMsg("✗ Backend unreachable — check URL in Connections tab"); }
                      setTimeout(() => setSaveMsg(""), 5000);
                    }}>
                      <SVG d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="#fff" w={14} h={14}/>
                      Test Backend Connection
                    </button>
                  </div>
                </SectionCard>
              </div>
            )}

          </div>
        )}

      </main>

      {/* CHAT */}
      <AIChat open={chatOpen} setOpen={setChatOpen} C={C} dark={dark} backendUrl={BACKEND_LIVE}/>
    </div>
  );
}


/* ── ERROR CODES PAGE ───────────────────────────────────────────────────── */
function ErrorCodesPage({ C, dark, backendUrl }) {
  const [codes, setCodes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [meta, setMeta]         = useState(null);
  const [expanded, setExpanded] = useState(null);
  const LIMIT = 15;

  const fetchCodes = useCallback(async (p = 1) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page:p, limit:LIMIT, ...(search&&{search}), ...(severity&&{severity}) });
      const r = await fetch(`${backendUrl||BACKEND}/api/error-codes?${params}`);
      const d = await r.json();
      if (!d.success) throw new Error("Failed to load");
      let filtered = d.codes;
      if (category) filtered = filtered.filter(c => c.category === category);
      setCodes(filtered);
      setTotal(d.total); setPages(d.pages); setPage(p);
      setMeta({ lastUpdated: d.lastUpdated, source: d.source, total: d.total });
    } catch(e) { setError(e.message); }
    setLoading(false);
  }, [search, severity, category]);

  useEffect(() => { fetchCodes(1); }, [fetchCodes]);

  const SEVERITY_COLORS = {
    Error:   { col: C.red,   bg: C.redBg,   bdr: C.redBdr },
    Warning: { col: C.amber, bg: C.amberBg, bdr: C.amberBdr },
    Info:    { col: C.blue,  bg: C.blueBg,  bdr: C.blueBdr },
  };

  const categories = ["Authentication","Upload / Azure","Export","File / Path","Permissions","Version","Duplicate","Job Error","General"];

  return (
    <div className="pg">
      <PageHeader C={C} title="Error Code Reference" sub={meta ? `${meta.total} Microsoft Migration Manager error codes · Last updated ${meta.lastUpdated}` : "Loading error codes from backend…"}>
        <button onClick={()=>fetchCodes(page)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, background:C.canvasAlt, border:`1px solid ${C.border}`, color:C.textMuted, cursor:"pointer", fontSize:12, fontWeight:600 }}>
          <SVG d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" w={13} h={13}/> Refresh
        </button>
      </PageHeader>

      {/* Info bar */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 16px", background:C.accentBg, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:16, fontSize:13, color:C.accent, fontWeight:500 }}>
        <SVG d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={C.accent} w={16} h={16}/>
        <span>Error codes are loaded <strong>live from the backend</strong> — any updates to <code style={{ fontFamily:"'Cascadia Code',monospace", background:`${C.accent}18`, padding:"1px 5px", borderRadius:4, fontSize:12 }}>errorSolutions.js</code> appear here automatically without any frontend changes.</span>
        {meta?.source && <a href={meta.source} target="_blank" rel="noreferrer" style={{ marginLeft:"auto", fontSize:11, color:C.accent, whiteSpace:"nowrap", textDecoration:"none", fontWeight:600 }}>MS Docs ↗</a>}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200, position:"relative" }}>
          <SVG d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke={C.textMuted} w={15} h={15} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);}} onKeyDown={e=>e.key==="Enter"&&fetchCodes(1)} placeholder="Search error codes, titles, solutions…" className="ci" style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px 9px 34px", fontSize:13, outline:"none", fontFamily:"inherit", background:C.canvas, color:C.text }}/>
        </div>
        <select value={severity} onChange={e=>{setSeverity(e.target.value); setPage(1);}} style={{ padding:"9px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.canvas, color:C.text, fontSize:13, cursor:"pointer", outline:"none" }}>
          <option value="">All severities</option>
          <option value="Error">🔴 Error</option>
          <option value="Warning">🟡 Warning</option>
        </select>
        <select value={category} onChange={e=>{setCategory(e.target.value); setPage(1);}} style={{ padding:"9px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.canvas, color:C.text, fontSize:13, cursor:"pointer", outline:"none" }}>
          <option value="">All categories</option>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {(search||severity||category) && <button onClick={()=>{setSearch("");setSeverity("");setCategory("");}} style={{ padding:"9px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:C.textMuted, fontSize:13, cursor:"pointer" }}>Clear filters</button>}
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {[["Total codes", meta?.total||0, C.accent],["Errors",codes.filter(c=>c.severity==="Error").length,C.red],["Warnings",codes.filter(c=>c.severity==="Warning").length,C.amber],["AI-generated",codes.filter(c=>c.aiGenerated).length,"#8B5CF6"]].map(([l,v,col])=>(
          <div key={l} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:C.canvas, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }}>
            <span style={{ fontSize:18, fontWeight:800, color:col }}>{v}</span>
            <span style={{ color:C.textMuted, fontWeight:500 }}>{l}</span>
          </div>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.textMuted }}>
          Showing {codes.length} of {total} results
        </div>
      </div>

      {/* Table */}
      <div className="cd" style={{ background:C.canvas, border:`1px solid ${C.border}` }}>
        {loading ? (
          <div style={{ padding:"48px", textAlign:"center" }}>
            <Spinner C={C} white={false}/><p style={{ color:C.textMuted, marginTop:12, fontSize:13 }}>Loading error codes from backend…</p>
          </div>
        ) : error ? (
          <div style={{ padding:"32px 20px", textAlign:"center" }}>
            <div style={{ fontSize:13, color:C.red, marginBottom:12 }}>⚠ {error}</div>
            <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>Make sure the backend is running on port 3001</div>
            <button className="bp" onClick={()=>fetchCodes(1)}>Retry</button>
          </div>
        ) : codes.length === 0 ? (
          <EmptyState C={C} label={`No error codes found${search?` for "${search}"`:""}`}/>
        ) : (
          <>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>
                    {["Error Code","Title","Category","Severity","Action Required",""].map(h => <TH key={h} C={C}>{h}</TH>)}
                  </tr>
                </thead>
                <tbody>
                  {codes.map((ec, i) => {
                    const sev = SEVERITY_COLORS[ec.severity] || SEVERITY_COLORS.Error;
                    const isOpen = expanded === i;
                    return (
                      <>
                        <tr key={i} className="tr" style={{ background: isOpen ? C.canvasHover : "" }}>
                          <TD C={C}>
                            <code style={{ fontFamily:"'Cascadia Code',Consolas,monospace", fontSize:11, fontWeight:700, color:C.accent, background:C.accentBg, padding:"3px 8px", borderRadius:5, whiteSpace:"nowrap" }}>{ec.code}</code>
                          </TD>
                          <TD C={C}><span style={{ fontWeight:600, color:C.text }}>{ec.title}</span></TD>
                          <TD C={C}><span style={{ fontSize:11, color:C.textMuted, background:C.canvasAlt, padding:"2px 8px", borderRadius:5, border:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{ec.category}</span></TD>
                          <TD C={C}><span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, background:sev.bg, color:sev.col, fontSize:11, fontWeight:700, border:`1px solid ${sev.bdr}` }}><span style={{ width:5, height:5, borderRadius:"50%", background:sev.col }}/>{ec.severity}</span></TD>
                          <TD C={C}><span style={{ fontSize:12, color:ec.actionRequired.startsWith("Yes")?C.amber:C.green, fontWeight:600 }}>{ec.actionRequired.startsWith("Yes")?"⚠ User action":"✓ IT handles"}</span></TD>
                          <TD C={C}><GhostBtn C={C} onClick={()=>setExpanded(isOpen?null:i)}>{isOpen?"▲ Hide":"▼ Details"}</GhostBtn></TD>
                        </tr>
                        {isOpen && (
                          <tr key={`exp${i}`}>
                            <td colSpan={6} style={{ padding:"0", background:C.canvasHover, borderBottom:`1px solid ${C.border}` }}>
                              <div style={{ padding:"16px 20px 18px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
                                <div>
                                  <Label C={C}>Explanation</Label>
                                  <p style={{ fontSize:13, color:C.textSub, lineHeight:1.6, margin:0 }}>{ec.explanation}</p>
                                </div>
                                <div>
                                  <Label C={C}>Recommended Solution</Label>
                                  <p style={{ fontSize:13, color:C.textSub, lineHeight:1.6, margin:0 }}>{ec.solution}</p>
                                </div>
                                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                  <div>
                                    <Label C={C}>Action Required</Label>
                                    <p style={{ fontSize:13, color:C.textSub, margin:0 }}>{ec.actionRequired}</p>
                                  </div>
                                  <div>
                                    <Label C={C}>IT Retry</Label>
                                    <p style={{ fontSize:13, color:C.textSub, margin:0 }}>{ec.retryByIT}</p>
                                  </div>
                                  {ec.aiGenerated && <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, color:"#8B5CF6", background:"rgba(139,92,246,0.1)", padding:"3px 9px", borderRadius:5, border:"1px solid rgba(139,92,246,0.2)", width:"fit-content" }}>✦ AI-generated solution</span>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderTop:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, color:C.textMuted }}>Page {page} of {pages} · {total} total codes</span>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>fetchCodes(page-1)} disabled={page<=1} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.canvas, color:page<=1?C.textMuted:C.text, cursor:page<=1?"not-allowed":"pointer", fontSize:12, fontWeight:500 }}>← Prev</button>
                  {Array.from({length:Math.min(5,pages)},(_,i)=>{ const p=Math.max(1,Math.min(pages-4,page-2))+i; return(
                    <button key={p} onClick={()=>fetchCodes(p)} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${p===page?C.accent:C.border}`, background:p===page?C.accent:C.canvas, color:p===page?"#fff":C.text, cursor:"pointer", fontSize:12, fontWeight:p===page?700:500 }}>{p}</button>
                  ); })}
                  <button onClick={()=>fetchCodes(page+1)} disabled={page>=pages} style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${C.border}`, background:C.canvas, color:page>=pages?C.textMuted:C.text, cursor:page>=pages?"not-allowed":"pointer", fontSize:12, fontWeight:500 }}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


/* ── LOGS PAGE ──────────────────────────────────────────────────────────── */
function LogsPage({ C, dark, backendUrl }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [level, setLevel]     = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [total, setTotal]     = useState(0);
  const intervalRef           = useRef(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit:500, ...(search&&{search}), ...(level&&{level}) });
      const r = await fetch(`${backendUrl||BACKEND}/api/logs?${params}`);
      const d = await r.json();
      if (d.success) { setLogs(d.entries.reverse()); setTotal(d.total); }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [search, level, backendUrl]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) { intervalRef.current = setInterval(fetchLogs, 3000); }
    else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchLogs]);

  const LEVEL_COLORS = {
    SUCCESS: { col:C.green,  bg:C.greenBg,  bdr:C.greenBdr  },
    ERROR:   { col:C.red,    bg:C.redBg,    bdr:C.redBdr    },
    WARN:    { col:C.amber,  bg:C.amberBg,  bdr:C.amberBdr  },
    INFO:    { col:C.blue,   bg:C.blueBg,   bdr:C.blueBdr   },
    CHAT:    { col:"#8B5CF6",bg:C.accentBg, bdr:C.border     },
    SYSTEM:  { col:C.textMuted,bg:C.canvasAlt,bdr:C.border   },
  };

  const clearLogs = async () => {
    if (!window.confirm("Clear all logs?")) return;
    await fetch(`${backendUrl||BACKEND}/api/logs`, { method:"DELETE" });
    fetchLogs();
  };

  const downloadLogs = () => {
    window.open(`${backendUrl||BACKEND}/api/logs/download`, "_blank");
  };

  const counts = logs.reduce((a, l) => { a[l.level] = (a[l.level]||0)+1; return a; }, {});

  return (
    <div className="pg">
      <PageHeader C={C} title="Activity Logs" sub={`${total} log entries — all backend activity recorded`}>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setAutoRefresh(v=>!v)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, border:`1px solid ${autoRefresh?C.green:C.border}`, background:autoRefresh?C.greenBg:C.canvasAlt, color:autoRefresh?C.green:C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <span style={{ width:7,height:7,borderRadius:"50%",background:autoRefresh?C.green:C.textMuted,animation:autoRefresh?"pulse 1.5s infinite":"none" }}/>
            {autoRefresh?"Live":"Auto-refresh"}
          </button>
          <button onClick={fetchLogs} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.canvasAlt, color:C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <SVG d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" w={13} h={13}/> Refresh
          </button>
          <button onClick={downloadLogs} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, border:`1px solid ${C.border}`, background:C.canvasAlt, color:C.textMuted, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            <SVG d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke="currentColor" w={13} h={13}/> Download
          </button>
          <button onClick={clearLogs} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${C.redBdr}`, background:C.redBg, color:C.red, fontSize:12, fontWeight:600, cursor:"pointer" }}>Clear</button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        {Object.entries(LEVEL_COLORS).map(([lv, col]) => (
          <button key={lv} onClick={()=>setLevel(level===lv?"":lv)}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 14px", borderRadius:8, border:`1px solid ${level===lv?col.col:C.border}`, background:level===lv?col.bg:C.canvas, cursor:"pointer", transition:"all .15s" }}>
            <span style={{ width:8,height:8,borderRadius:2,background:col.col }}/>
            <span style={{ fontSize:12, fontWeight:600, color:level===lv?col.col:C.textMuted }}>{lv}</span>
            <span style={{ fontSize:12, fontWeight:800, color:level===lv?col.col:C.text }}>{counts[lv]||0}</span>
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.textMuted }}>
          Showing {logs.length} entries
        </div>
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:16 }}>
        <SVG d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke={C.textMuted} w={15} h={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchLogs()} placeholder="Search logs — press Enter to filter…" className="ci"
          style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px 9px 36px", fontSize:13, outline:"none", fontFamily:"inherit", background:C.canvas, color:C.text }}/>
      </div>

      {/* Log table */}
      <div className="cd" style={{ background:C.canvas, border:`1px solid ${C.border}` }}>
        {loading ? (
          <div style={{ padding:"48px", textAlign:"center", color:C.textMuted }}>Loading logs…</div>
        ) : logs.length===0 ? (
          <EmptyState C={C} label="No log entries found — start the backend to generate logs"/>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'Cascadia Code',Consolas,monospace" }}>
              <thead><tr>
                {["Timestamp","Level","Message","Details"].map(h => (
                  <th key={h} style={{ padding:"10px 16px", textAlign:"left", background:C.canvasAlt, color:C.textMuted, fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {logs.map((entry, i) => {
                  const col = LEVEL_COLORS[entry.level] || LEVEL_COLORS.INFO;
                  const hasMeta = entry.meta && Object.keys(entry.meta).length > 0;
                  return (
                    <tr key={i} className="tr">
                      <td style={{ padding:"8px 16px", color:C.textMuted, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap", fontSize:11 }}>{entry.timestamp}</td>
                      <td style={{ padding:"8px 16px", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:4, background:col.bg, color:col.col, fontSize:10, fontWeight:800, border:`1px solid ${col.bdr}`, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:"0.05em" }}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:col.col }}/>
                          {entry.level}
                        </span>
                      </td>
                      <td style={{ padding:"8px 16px", color:C.text, borderBottom:`1px solid ${C.border}`, maxWidth:400 }}>{entry.message}</td>
                      <td style={{ padding:"8px 16px", color:C.textMuted, borderBottom:`1px solid ${C.border}`, fontSize:11 }}>
                        {hasMeta && Object.entries(entry.meta).map(([k,v])=>(
                          <span key={k} style={{ display:"inline-block", marginRight:8, background:C.canvasAlt, padding:"1px 6px", borderRadius:4, border:`1px solid ${C.border}` }}>
                            <span style={{ color:C.accent }}>{k}</span>: {String(v)}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── AI CHAT ─────────────────────────────────────────────────────────────── */
function AIChat({ open, setOpen, C, dark, backendUrl }) {
  const [msgs, setMsgs]   = useState([{ role:"assistant", content:"Hello! I'm **MigraPulse AI**, your migration assistant powered by Groq.\n\nI can help with:\n• Analyzing your migration errors\n• Explaining Microsoft error codes\n• Recommending actions per user\n• Answering general migration questions\n\nUpload and preview a ZIP to get started with your data!" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy]   = useState(false);
  const endRef = useRef();
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const msg = input.trim(); setInput("");
    setMsgs(p => [...p, { role:"user", content:msg }]);
    setBusy(true);
    try {
      const hist = msgs.slice(-8).map(m => ({ role:m.role, content:m.content }));
      const r = await fetch(`${backendUrl||BACKEND}/api/chat`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ message:msg, history:hist }) });
      const d = await r.json();
      setMsgs(p => [...p, { role:"assistant", content:d.reply || "Sorry, I couldn't respond." }]);
    } catch {
      setMsgs(p => [...p, { role:"assistant", content:"Connection error — ensure the backend is running on port 3001." }]);
    }
    setBusy(false);
  };
  const Q = ["Summary of this run","Explain the top errors","What actions are needed?","Which users need help?"];
  const fmt = t => {
    if (!t) return "";
    let html = t
      // Escape HTML first
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic *text*
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      // Inline code `code`
      .replace(/`([^`]+)`/g, "<code style=\"background:rgba(99,102,241,0.12);padding:1px 5px;border-radius:4px;font-family:'Cascadia Code',monospace;font-size:11px;\">$1</code>")
      // Bullet points — handle *, -, • at start of line
      .replace(/^[\*\-•\+]\s+(.+)$/gm, "<li>$1</li>")
      // Numbered lists
      .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
      // Wrap consecutive <li> in <ul>
      .replace(/(<li>.*<\/li>)/gs, m => "<ul style=\"margin:8px 0 8px 4px;padding-left:16px;display:flex;flex-direction:column;gap:4px;\">" + m + "</ul>")
      // Headers ### ## #
      .replace(/^#{3}\s+(.+)$/gm, "<div style=\"font-size:12px;font-weight:700;color:inherit;margin:10px 0 5px;text-transform:uppercase;letter-spacing:0.06em;opacity:0.7;\">$1</div>")
      .replace(/^#{1,2}\s+(.+)$/gm, "<div style=\"font-size:14px;font-weight:700;margin:10px 0 6px;\">$1</div>")
      // Horizontal rules
      .replace(/^---$/gm, "<hr style=\"border:none;border-top:1px solid rgba(255,255,255,0.1);margin:8px 0;\"/>")
      // Line breaks — double newline = paragraph break
      .replace(/\n\n/g, "<br/><br/>")
      // Single newline
      .replace(/\n/g, "<br/>");
    return html;
  };

  return (
    <>
      <button onClick={()=>setOpen(v=>!v)} className="fab" style={{ position:"fixed", bottom:24, right:24, width:54, height:54, borderRadius:"50%", background:"linear-gradient(135deg,#6366F1,#8B5CF6)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, boxShadow:"0 4px 20px rgba(99,102,241,0.5)" }}>
        {open?<SVG d="M18 6 6 18 M6 6 18 18" stroke="#fff" w={18} h={18} sw={2.5}/>:<SVG d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" w={19} h={19}/>}
        {!open&&<span style={{ position:"absolute", top:-2, right:-2, background:"#EF4444", color:"#fff", fontSize:9, fontWeight:900, padding:"2px 5px", borderRadius:8, border:`2px solid ${C.pageBg}` }}>AI</span>}
      </button>

      {open && (
        <div className="cpanel" style={{ position:"fixed", bottom:90, right:24, width:376, background:C.canvas, borderRadius:16, border:`1px solid ${C.border}`, zIndex:300, display:"flex", flexDirection:"column", overflow:"hidden", maxHeight:560, boxShadow:C.shadowLg }}>
          <div style={{ background:"linear-gradient(135deg,#1E1B4B,#312E81)", padding:"15px 17px", display:"flex", alignItems:"center", gap:11 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <SVG d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" stroke="#fff" w={17} h={17}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#F8FAFC", letterSpacing:"-0.2px" }}>MigraPulse AI</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#34D399" }}/>Groq llama-3.3-70b · Free tier
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:7, cursor:"pointer", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.6)" }} className="ibtn">
              <SVG d="M18 6 6 18 M6 6 18 18" stroke="currentColor" w={13} h={13}/>
            </button>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 10px", display:"flex", flexDirection:"column", gap:10, background:C.canvasAlt }}>
            {msgs.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", gap:8, alignItems:"flex-end" }}>
                {m.role==="assistant" && <div style={{ width:27, height:27, borderRadius:8, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><SVG d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" stroke="#fff" w={11} h={11}/></div>}
                <div style={{ maxWidth:"85%", padding:"10px 14px", borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px", background:m.role==="user"?"linear-gradient(135deg,#6366F1,#8B5CF6)":C.canvas, color:m.role==="user"?"#fff":C.text, fontSize:13, lineHeight:1.65, border:m.role==="assistant"?`1px solid ${C.border}`:"none", boxShadow:m.role==="user"?"0 2px 8px rgba(99,102,241,0.3)":C.shadow, wordBreak:"break-word" }} dangerouslySetInnerHTML={{ __html:fmt(m.content) }}/>
              </div>
            ))}
            {busy && (
              <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                <div style={{ width:27, height:27, borderRadius:8, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><SVG d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" stroke="#fff" w={11} h={11}/></div>
                <div style={{ padding:"10px 14px", background:C.canvas, borderRadius:"12px 12px 12px 2px", border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", gap:4 }}>{[0,1,2].map(i=><span key={i} style={{ width:6, height:6, borderRadius:"50%", background:C.textMuted, display:"inline-block", animation:`dot 1.2s ${i*0.2}s infinite` }}/>)}</div>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          <div style={{ padding:"8px 12px", background:C.canvas, borderTop:`1px solid ${C.border}`, display:"flex", gap:5, flexWrap:"wrap" }}>
            {Q.map(q=><button key={q} onClick={()=>setInput(q)} className="qb" style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, padding:"4px 9px", borderRadius:6, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{q}</button>)}
          </div>
          <div style={{ padding:"10px 12px", background:C.canvas, borderTop:`1px solid ${C.border}`, display:"flex", gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask about migration errors…" className="ci" style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"inherit", background:C.canvasAlt, color:C.text }}/>
            <button onClick={send} disabled={busy||!input.trim()} style={{ width:38, height:38, borderRadius:8, background:busy||!input.trim()?C.borderStrong:"linear-gradient(135deg,#6366F1,#8B5CF6)", border:"none", cursor:busy||!input.trim()?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:busy||!input.trim()?"none":"0 2px 8px rgba(99,102,241,0.4)" }}>
              <SVG d="M22 2 11 13 M22 2 15 22 11 13 2 9 22 2" stroke="#fff" w={14} h={14}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── LAYOUT COMPONENTS ──────────────────────────────────────────────────── */
const PageHeader = ({ C, title, sub, children }) => (
  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, color:C.text, margin:0, letterSpacing:"-0.7px" }}>{title}</h1>
      <p style={{ fontSize:13, color:C.textMuted, margin:"5px 0 0", fontWeight:400 }}>{sub}</p>
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:4 }}>{children}</div>
  </div>
);

const SectionCard = ({ C, accent, title, sub, children, action }) => (
  <div className="cd" style={{ background:C.canvas, border:`1px solid ${C.border}`, boxShadow:C.shadow }}>
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:4, height:36, borderRadius:2, background:accent, flexShrink:0 }}/>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{title}</div>
        <div style={{ fontSize:12, color:C.textMuted, marginTop:1 }}>{sub}</div>
      </div>
      {action}
    </div>
    <div style={{ padding:"16px 20px" }}>{children}</div>
  </div>
);

const DataTable = ({ rows, C, dark, numbered, cols }) => (
  <div style={{ overflowX:"auto", margin:"0 -20px" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
      <thead><tr>{cols.map(h=><TH key={h} C={C}>{h}</TH>)}</tr></thead>
      <tbody>
        {rows.map((r,i)=>(
          <tr key={r.id} className="tr">
            {numbered&&<TD C={C}><span style={{ color:C.textMuted, fontWeight:700, fontSize:12 }}>#{rows.length-i}</span></TD>}
            <TD C={C}><span style={{ color:C.textMuted, fontSize:12 }}>{r.date}</span></TD>
            <TD C={C}><span style={{ fontWeight:600, color:C.text }}>{r.file.length>32?r.file.slice(0,32)+"…":r.file}</span></TD>
            <TD C={C} center><Pill>{r.users}</Pill></TD>
            <TD C={C} center><Pill col={C.amber} bg={dark?"#1C1200":"#FFFBEB"}>{r.errors}</Pill></TD>
            <TD C={C} center><Pill col={C.green} bg={dark?"#022C22":"#ECFDF5"}>{r.sent}</Pill></TD>
            <TD C={C} center><Pill col={r.failed>0?C.red:C.textMuted} bg={r.failed>0?dark?"#1C0A0A":"#FEF2F2":dark?"#111827":"#F9FAFB"}>{r.failed}</Pill></TD>
            <TD C={C}><div style={{ display:"flex", alignItems:"center", gap:8, minWidth:110 }}><div style={{ flex:1, height:5, background:C.border, borderRadius:3, overflow:"hidden" }}><div style={{ height:"100%", background:C.green, width:`${r.sent+r.failed>0?Math.round(r.sent/(r.sent+r.failed)*100):0}%`, borderRadius:3, transition:"width .5s" }}/></div><span style={{ fontSize:11, fontWeight:800, color:C.green, minWidth:28 }}>{r.sent+r.failed>0?Math.round(r.sent/(r.sent+r.failed)*100):0}%</span></div></TD>
            <TD C={C}><StatusTag ok={r.failed===0} C={C}>{r.failed===0?"Complete":"Partial"}</StatusTag></TD>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ── CHART COMPONENTS ───────────────────────────────────────────────────── */
function DonutChart({ data, C }) {
  const COLS=["#6366F1","#8B5CF6","#F59E0B","#EF4444","#10B981","#EC4899","#06B6D4","#F97316"];
  const SHORT={ MEXPORTFILEUNSUPPORTEDMIMETYPE:"Shortcuts", MVERSIONDOWNLOAD:"Version DL", MFOLDERPATHTOLONG:"Path Long", MEXPORTFILERATELIMIT:"Rate Limit", MPERMISSION:"Permission", MJOBERROR:"Job Error", MABUSIVEFILE:"Abusive" };
  const ent=Object.entries(data); const tot=ent.reduce((a,[,v])=>a+v,0);
  let a=0;
  const sl=ent.map(([k,v],i)=>{ const p=v/tot,s=a; a+=p*360; return{k,v,p,s,c:COLS[i%COLS.length]}; });
  const pt=(deg,r)=>{ const rad=(deg-90)*Math.PI/180; return{x:100+r*Math.cos(rad),y:100+r*Math.sin(rad)}; };
  const arc=s=>{ const a1=pt(s.s,68),a2=pt(s.s+s.p*360-.5,68); return`M100 100L${a1.x} ${a1.y}A68 68 0 ${s.p>.5?1:0} 1 ${a2.x} ${a2.y}Z`; };
  return (
    <div style={{ display:"flex", gap:24, alignItems:"center" }}>
      <svg width="180" height="180" viewBox="0 0 200 200" style={{ flexShrink:0 }}>
        {sl.map((s,i)=><path key={i} d={arc(s)} fill={s.c}/>)}
        <circle cx="100" cy="100" r="48" fill={C.canvas}/>
        <text x="100" y="95" textAnchor="middle" fontSize="22" fontWeight="800" fill={C.text}>{tot.toLocaleString()}</text>
        <text x="100" y="112" textAnchor="middle" fontSize="10" fill={C.textMuted}>total errors</text>
      </svg>
      <div style={{ flex:1 }}>
        {sl.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:9, height:9, borderRadius:3, background:s.c, flexShrink:0 }}/>
              <span style={{ fontSize:12, color:C.text, fontWeight:500 }}>{SHORT[s.k]||s.k.slice(0,11)}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:60, height:4, background:C.border, borderRadius:2, overflow:"hidden" }}><div style={{ height:"100%", background:s.c, width:`${s.p*100}%` }}/></div>
              <span style={{ fontSize:12, fontWeight:800, color:C.text, minWidth:18, textAlign:"right" }}>{s.v}</span>
              <span style={{ fontSize:11, color:C.textMuted, minWidth:30 }}>{Math.round(s.p*100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ runs, C }) {
  const mx=Math.max(...runs.map(r=>r.sent+r.failed),1);
  return (
    <div>
      <div style={{ display:"flex", gap:5, alignItems:"flex-end", height:110, marginBottom:10 }}>
        {runs.slice(0,8).reverse().map((r,i)=>{
          const t=r.sent+r.failed, tH=Math.round((t/mx)*96);
          const sH=t>0?Math.round((r.sent/t)*tH):0, fH=tH-sH;
          return (
            <div key={r.id} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
              <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:96 }}>
                {fH>0&&<div style={{ width:"100%", background:C.red, height:Math.max(fH,3), borderRadius:fH>0&&sH===0?"3px 3px 0 0":"0" }}/>}
                {sH>0&&<div style={{ width:"100%", background:C.green, height:Math.max(sH,3), borderRadius:"3px 3px 0 0" }}/>}
              </div>
              <div style={{ fontSize:9, color:C.textMuted, marginTop:2 }}>#{runs.length-i}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:14, justifyContent:"center" }}>
        {[[C.green,"Sent"],[C.red,"Failed"]].map(([col,lbl])=>(
          <div key={lbl} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.textMuted }}><div style={{ width:8, height:8, borderRadius:2, background:col }}/>{lbl}</div>
        ))}
      </div>
    </div>
  );
}

/* ── PRIMITIVE COMPONENTS ───────────────────────────────────────────────── */
const SVG = ({ d, stroke, w=18, h=18, sw=2, style:st }) => (
  <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke={stroke||"currentColor"} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, ...st }}>
    {d.split(" M").map((seg,i)=><path key={i} d={(i>0?"M":"")+seg}/>)}
  </svg>
);
const Btn = ({ children, primary, C, onClick, disabled, style:st }) => (
  <button className={primary?"bp":"bs"} style={{ ...(primary?{}:{ border:`1px solid ${C.border}`, background:C.canvas, color:C.text }), ...st }} onClick={onClick} disabled={disabled}>{children}</button>
);
const GhostBtn = ({ children, C, onClick }) => (
  <button className="bg" style={{ color:C.textMuted, border:`1px solid ${C.border}` }} onClick={onClick}>{children}</button>
);
const TH = ({ children, C }) => <th style={{ padding:"10px 16px", textAlign:"left", background:C.canvasAlt, color:C.textMuted, fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{children}</th>;
const TD = ({ children, C, center }) => <td style={{ padding:"12px 16px", color:C.text, borderBottom:`1px solid ${C.border}`, verticalAlign:"middle", textAlign:center?"center":"left" }}>{children}</td>;
const Pill = ({ children, col, bg }) => <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, background:bg||"transparent", color:col||"inherit", fontWeight:800, fontSize:12, border:bg?"none":"1px solid rgba(0,0,0,0.06)" }}>{children}</span>;
const CodeTag = ({ children, C }) => <span style={{ display:"inline-block", padding:"2px 7px", borderRadius:5, background:C.canvasAlt, color:C.textSub, fontWeight:500, fontSize:11, marginRight:3, marginBottom:2, fontFamily:"'Cascadia Code',monospace", border:`1px solid ${C.border}` }}>{children}</span>;
const StatusTag = ({ children, ok, C }) => <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:ok?C.greenBg:C.redBg, color:ok?C.green:C.red, fontSize:12, fontWeight:700, border:`1px solid ${ok?C.greenBdr:C.redBdr}` }}><span style={{ width:5, height:5, borderRadius:"50%", background:ok?C.green:C.red }}/>{children}</span>;
const Ava = ({ email, C }) => <div style={{ width:29, height:29, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},#8B5CF6)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff", flexShrink:0 }}>{email[0].toUpperCase()}</div>;
const Spinner = ({ C, white }) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={white?"#fff":C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation:"spin .8s linear infinite", flexShrink:0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>;
const Label = ({ children, C }) => <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{children}</div>;
const EmptyChart = ({ C, label="Process a ZIP to see data" }) => (
  <div style={{ textAlign:"center", padding:"28px 0" }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.border} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin:"0 auto 8px", display:"block" }}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg><p style={{ fontSize:13, color:C.textMuted, margin:0 }}>{label}</p></div>
);
const EmptyState = ({ children, C, label }) => (
  <div style={{ textAlign:"center", padding:"48px 20px" }}><EmptyChart C={C} label={label}/>{children}</div>
);

/* ── CSS ─────────────────────────────────────────────────────────────────── */
function makeCSS(C, dark, sw) { return `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:${C.pageBg};-webkit-font-smoothing:antialiased}
  .pg{padding:28px 32px 64px;animation:pgIn .25s ease}
  @keyframes pgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes dot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
  /* Sidebar */
  .ni{display:flex;align-items:center;gap:10px;border-radius:8px;color:rgba(255,255,255,0.5);font-size:13px;font-weight:500;width:100%;background:none;border:none;cursor:pointer;transition:all .15s;margin-bottom:3px;letter-spacing:.01em;font-family:inherit}
  .ni:hover{background:${LT.sidebarHover};color:rgba(255,255,255,0.88)}
  .na{background:rgba(99,102,241,0.18)!important;color:#C7D2FE!important;font-weight:700}
  .na svg{opacity:1!important}
  .ni svg{opacity:.5;transition:opacity .15s}
  .ni:hover svg{opacity:.82}
  .nb{margin-left:auto;background:rgba(99,102,241,0.3);color:#C7D2FE;font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px}
  .sbc:hover{background:rgba(255,255,255,0.12)!important;color:rgba(255,255,255,.6)!important}
  /* Cards */
  .cd{border-radius:12px;overflow:hidden}
  /* KPI */
  .kgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px}
  .kcard{border-radius:12px;padding:18px;transition:all .2s;cursor:default;animation:pgIn .3s ease both;animation-delay:var(--delay)}
  .kcard:hover{transform:translateY(-3px);box-shadow:${dark?"0 8px 24px rgba(0,0,0,.5)":"0 8px 24px rgba(0,0,0,.08)"}}
  /* Buttons */
  .bp{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;letter-spacing:.01em;box-shadow:0 2px 8px rgba(99,102,241,.3)}
  .bp:hover{opacity:.9;box-shadow:0 4px 16px rgba(99,102,241,.4);transform:translateY(-1px)}
  .bp:active{transform:scale(.98)}
  .bp:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
  .bs{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
  .bs:hover:not(:disabled){opacity:.8}
  .bs:disabled{opacity:.4;cursor:not-allowed}
  .bg{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;background:transparent;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;transition:all .15s;font-weight:500}
  .bg:hover{background:${C.canvasHover}}
  .ibtn:hover{background:${C.canvasHover}!important;color:${C.text}!important}
  /* Dropzone */
  .dz{border:2px dashed ${C.borderStrong};border-radius:12px;padding:32px 24px;cursor:pointer;transition:all .18s}
  .dz:hover,.dh{border-color:${C.accent}!important;background:${dark?"rgba(99,102,241,.07)":"rgba(99,102,241,.03)"}!important}
  .df{border-color:${C.accent}!important;border-style:solid!important;background:${dark?"rgba(99,102,241,.07)":"rgba(99,102,241,.03)"}!important;cursor:default}
  /* Table */
  .tr:hover td{background:${dark?"rgba(255,255,255,.02)":"rgba(0,0,0,.012)"}!important}
  /* Toggle */
  .tog{width:38px;height:22px;border-radius:11px;border:none;background:${dark?"linear-gradient(135deg,#6366F1,#8B5CF6)":"#CBD5E1"};cursor:pointer;padding:2px;display:flex;align-items:center;transition:background .25s}
  .tok{width:18px;height:18px;border-radius:50%;background:#fff;display:block;transition:transform .25s cubic-bezier(.34,1.56,.64,1);box-shadow:0 1px 4px rgba(0,0,0,.25)}
  .tok.on{transform:translateX(16px)}
  /* Chat FAB */
  .fab:hover{transform:scale(1.08)!important;box-shadow:0 6px 24px rgba(99,102,241,.6)!important}
  .fab:active{transform:scale(.96)!important}
  .cpanel{animation:cIn .2s cubic-bezier(.34,1.56,.64,1)}
  @keyframes cIn{from{opacity:0;transform:translateY(12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
  .qb:hover{background:${C.canvasHover}!important;color:${C.text}!important;border-color:${C.borderStrong}!important}
  .ci:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px ${dark?"rgba(99,102,241,.3)":"rgba(99,102,241,.15)"}!important;outline:none}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
  ::-webkit-scrollbar-thumb:hover{background:${C.borderStrong}}
  .tbtn:hover{background:rgba(255,255,255,0.06)!important}
  .topt:hover{background:rgba(255,255,255,0.08)!important}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
`; }