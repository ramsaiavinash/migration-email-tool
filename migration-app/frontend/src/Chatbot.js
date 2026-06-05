import { useState, useRef, useEffect } from "react";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([{role:"assistant",content:"Hi! I am MigraPulse AI. Ask me anything about your migration errors!"}]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);
  async function send() {
    if(!input.trim()||loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev=>[...prev,{role:"user",content:userMsg}]);
    setLoading(true);
    try {
      const history = messages.slice(-6).map(m=>({role:m.role,content:m.content}));
      const res = await fetch(`${BACKEND_URL}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsg,history})});
      const data = await res.json();
      setMessages(prev=>[...prev,{role:"assistant",content:data.reply||"Sorry, I could not respond."}]);
    } catch(e) {
      setMessages(prev=>[...prev,{role:"assistant",content:"Connection error. Make sure the backend is running."}]);
    }
    setLoading(false);
  }
  const QUICK = ["How many users failed?","What is MVERSIONDOWNLOAD?","What action is needed?","Explain the errors"];
  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={{position:"fixed",bottom:24,right:24,width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#0ea5e9,#7c3aed)",border:"none",cursor:"pointer",boxShadow:"0 4px 16px rgba(14,165,233,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }
      </button>
      {open && (
        <div style={{position:"fixed",bottom:92,right:24,width:360,background:"white",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,0.15)",border:"1px solid #e2e8f0",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#0ea5e9,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#f1f5f9"}}>MigraPulse AI</div>
              <div style={{fontSize:11,color:"#38bdf8"}}>● Powered by Groq — Free</div>
            </div>
            <span style={{marginLeft:"auto",background:"rgba(56,189,248,0.15)",color:"#38bdf8",fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:600}}>✦ AI</span>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10,maxHeight:280}}>
            {messages.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:6}}>
                {m.role==="assistant" && <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#0ea5e9,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div>}
                <div style={{maxWidth:"82%",padding:"8px 12px",borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.role==="user"?"linear-gradient(135deg,#0ea5e9,#0284c7)":"#f1f5f9",color:m.role==="user"?"white":"#1e293b",fontSize:13,lineHeight:1.6}} dangerouslySetInnerHTML={{__html:m.content.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br/>")}}/>
              </div>
            ))}
            {loading && <div style={{display:"flex",gap:6,alignItems:"center"}}><div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#0ea5e9,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg></div><div style={{padding:"8px 12px",background:"#f1f5f9",borderRadius:"12px 12px 12px 2px",fontSize:13,color:"#94a3b8"}}>Thinking...</div></div>}
            <div ref={bottomRef}/>
          </div>
          <div style={{padding:"6px 10px",background:"#f8fafc",borderTop:"1px solid #f1f5f9",display:"flex",gap:6,flexWrap:"wrap"}}>
            {QUICK.map(q=><button key={q} onClick={()=>{setInput(q);}} style={{background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",padding:"3px 8px",borderRadius:6,fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>{q}</button>)}
          </div>
          <div style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0",display:"flex",gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about migration errors..." style={{flex:1,border:"1px solid #e2e8f0",borderRadius:8,padding:"7px 10px",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <button onClick={send} disabled={loading||!input.trim()} style={{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#0ea5e9,#0284c7)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:loading||!input.trim()?0.5:1}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
