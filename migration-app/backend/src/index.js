require("dotenv").config();
const express=require("express"),cors=require("cors"),multer=require("multer"),axios=require("axios");
const {parseZip}=require("./zipParser"),{buildUserExcelBase64}=require("./excelBuilder"),{buildEmailBody}=require("./emailBuilder");
const {handleChat,updateContext}=require("./chatbot"),{getSolutionAsync,SOLUTIONS,getMetadata}=require("./errorSolutions");
const log=require("./logger");
const fs=require("fs"),path=require("path");

const app=express(),upload=multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024}});
app.use(cors({origin:"*",methods:["GET","POST","DELETE","OPTIONS"],allowedHeaders:["Content-Type","Authorization"]}));
app.use(express.json());

// ── Request logger middleware ─────────────────────────────────────────────────
app.use((req,res,next)=>{
  const start=Date.now();
  res.on("finish",()=>{
    if(!req.path.includes("/api/logs")&&!req.path.includes("/health"))
      log.info(`${req.method} ${req.path} → ${res.statusCode}`,{duration:`${Date.now()-start}ms`});
  });
  next();
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health",(req,res)=>{
  res.json({status:"ok",timestamp:new Date().toISOString(),aiEnabled:!!process.env.GROQ_API_KEY,errorCodesLoaded:Object.keys(SOLUTIONS).length,version:"2.0"});
});

// ── Logs API ──────────────────────────────────────────────────────────────────
app.get("/api/logs",(req,res)=>{
  const{level,search,limit=200}=req.query;
  const entries=log.read({level,search}).slice(-parseInt(limit));
  res.json({success:true,total:entries.length,entries,files:log.getLogFiles()});
});
app.delete("/api/logs",(req,res)=>{log.clearLogs();res.json({success:true,message:"Logs cleared"});});
app.get("/api/logs/download",(req,res)=>{
  const lines=log.tail(5000);
  res.setHeader("Content-Type","text/plain");
  res.setHeader("Content-Disposition","attachment; filename=migrapulse.log");
  res.send(lines.join("\n"));
});

// ── Error codes API ───────────────────────────────────────────────────────────
app.get("/api/error-codes",(req,res)=>{
  const{search="",severity="",page=1,limit=20}=req.query;
  const pg=Math.max(1,parseInt(page)),lim=Math.min(100,Math.max(1,parseInt(limit)));
  let entries=Object.entries(SOLUTIONS).map(([code,sol])=>({code,title:sol.title,explanation:sol.explanation,solution:sol.solution,actionRequired:sol.actionRequired,retryByIT:sol.retryByIT,severity:sol.severity||"Error",aiGenerated:sol.aiGenerated||false,category:getCategory(code)}));
  if(search.trim()){const q=search.toLowerCase();entries=entries.filter(e=>e.code.toLowerCase().includes(q)||e.title.toLowerCase().includes(q)||e.explanation.toLowerCase().includes(q));}
  if(severity)entries=entries.filter(e=>e.severity.toLowerCase()===severity.toLowerCase());
  entries.sort((a,b)=>a.severity===b.severity?a.code.localeCompare(b.code):a.severity==="Error"?-1:1);
  const total=entries.length,paginated=entries.slice((pg-1)*lim,pg*lim);
  res.json({success:true,total,page:pg,limit:lim,pages:Math.ceil(total/lim),lastUpdated:getMetadata().lastUpdated,source:getMetadata().source,codes:paginated});
});
app.get("/api/error-codes/:code",async(req,res)=>{
  const code=req.params.code.toUpperCase(),solution=await getSolutionAsync(code,"");
  log.errorCodeLookup(code,!!SOLUTIONS[code]);
  res.json({success:true,code,...solution,category:getCategory(code)});
});

// ── Stats API ─────────────────────────────────────────────────────────────────
app.get("/api/stats",(req,res)=>{
  const histFile=path.join(__dirname,"..","data","history.json");
  let history=[];
  try{ if(fs.existsSync(histFile)) history=JSON.parse(fs.readFileSync(histFile,"utf8")); }catch{}
  const stats={
    runs:    history.length,
    users:   history.reduce((a,r)=>a+(r.users||0),0),
    sent:    history.reduce((a,r)=>a+(r.sent||0),0),
    failed:  history.reduce((a,r)=>a+(r.failed||0),0),
    errors:  history.reduce((a,r)=>a+(r.errors||0),0),
    history: history.slice(0,25),
    lastRun: history[0]||null,
    deliveryRate: (() => {
      const s=history.reduce((a,r)=>a+(r.sent||0),0),f=history.reduce((a,r)=>a+(r.failed||0),0);
      return s+f>0?Math.round(s/(s+f)*100):null;
    })(),
  };
  res.json({success:true,...stats});
});

// ── Save run to history file ──────────────────────────────────────────────────
function saveRunToHistory(run){
  const dataDir=path.join(__dirname,"..","data");
  const histFile=path.join(dataDir,"history.json");
  try{
    if(!fs.existsSync(dataDir))fs.mkdirSync(dataDir,{recursive:true});
    let history=[];
    try{ if(fs.existsSync(histFile))history=JSON.parse(fs.readFileSync(histFile,"utf8")); }catch{}
    history.unshift({...run,id:Date.now(),savedAt:new Date().toISOString()});
    fs.writeFileSync(histFile,JSON.stringify(history.slice(0,200),null,2));
    log.info("Run saved to history file",{file:run.file,sent:run.sent,failed:run.failed});
  }catch(e){log.warn("Could not save run to history: "+e.message);}
}

// ── Email preview API ─────────────────────────────────────────────────────────
app.post("/api/preview-email",upload.single("migrationZip"),async(req,res)=>{
  try{
    if(!req.file)return res.status(400).json({error:"No file uploaded"});
    const{userMap,sourceFile,affectedUsers}=await parseZip(req.file.buffer,req.file.originalname);
    const firstUser=Object.keys(userMap)[0];
    if(!firstUser)return res.status(400).json({error:"No users found"});
    const errors=userMap[firstUser];
    for(const err of errors){if(err.ResultCode)await getSolutionAsync(err.ResultCode,err.FailureReason);}
    const summary={
      sourceFile,
      emailTheme: req.body?.emailTheme || "blue",
      orgName: req.body?.orgName || process.env.ORG_NAME || "IT Migration Team",
      projectName: req.body?.projectName || process.env.PROJECT_NAME || "Google My Drive to OneDrive Migration",
      supportEmail: req.body?.supportEmail || process.env.IT_ADMIN_EMAIL || "it-support@yourorg.com",
    };
    const emailHtml=buildEmailBody(firstUser,errors,summary);
    log.info(`Email preview generated for ${firstUser} with theme: ${summary.emailTheme}`);
    return res.json({success:true,userEmail:firstUser,errorCount:errors.length,html:emailHtml,sourceFile,affectedUsers,theme:summary.emailTheme});
  }catch(err){log.error(`Email preview failed: ${err.message}`);return res.status(500).json({success:false,error:err.message});}
});

// ── Preview migration ─────────────────────────────────────────────────────────
app.post("/api/preview-migration",upload.single("migrationZip"),async(req,res)=>{
  try{
    if(!req.file)return res.status(400).json({error:"No file uploaded"});
    const{userMap,sourceFile,affectedUsers,totalErrors}=await parseZip(req.file.buffer,req.file.originalname);
    const preview=Object.entries(userMap).map(([email,errors])=>({userEmail:email,errorCount:errors.length,errorCodes:[...new Set(errors.map(e=>e.ResultCode).filter(Boolean))],preview:errors.slice(0,3).map(e=>({file:e.FullPath?e.FullPath.split("/").pop():"Unknown",code:e.ResultCode,reason:e.FailureReason}))}));
    updateContext({sourceFile,affectedUsers,totalErrors,users:preview,userMap});
    log.previewLog(sourceFile,affectedUsers,totalErrors);
    return res.json({success:true,sourceFile,affectedUsers,totalErrors,users:preview});
  }catch(err){log.error(`Preview failed: ${err.message}`);return res.status(500).json({success:false,error:err.message});}
});

// ── Process migration ─────────────────────────────────────────────────────────
app.post("/api/process-migration",upload.single("migrationZip"),async(req,res)=>{
  const startTime=Date.now();
  try{
    if(!req.file)return res.status(400).json({success:false,error:"No ZIP file uploaded"});
    const powerAutomateUrl=process.env.POWER_AUTOMATE_URL;
    if(!powerAutomateUrl||powerAutomateUrl.includes("REPLACE_AFTER_PA_SETUP"))return res.status(500).json({success:false,error:"Power Automate URL not configured"});
    const emailTheme=req.body?.emailTheme||"blue";
    const orgNameVal=req.body?.orgName||"";
    const projectNameVal=req.body?.projectName||"";
    const supportEmailVal=req.body?.supportEmail||process.env.IT_ADMIN_EMAIL||"";
    const{userMap,summaryMap,sourceFile,affectedUsers}=await parseZip(req.file.buffer,req.file.originalname);
    if(affectedUsers===0)return res.status(400).json({success:false,error:"No user errors found in ZIP"});
    // Handle excluded users
    let excludeUsers=[];
    try{ if(req.body?.excludeUsers) excludeUsers=JSON.parse(req.body.excludeUsers); }catch{}
    if(excludeUsers.length>0){ excludeUsers.forEach(u=>{ delete userMap[u]; }); log.info(`Excluded ${excludeUsers.length} user(s) from send`); }
    log.processStart(sourceFile,Object.keys(userMap).length);
    const results=[];
    for(const[userEmail,errors]of Object.entries(userMap)){
      const summary=summaryMap[userEmail]||{sourceFile};
      summary.sourceFile=sourceFile;
      summary.emailTheme=emailTheme;
      summary.orgName=orgNameVal||process.env.ORG_NAME||"IT Migration Team";
      summary.projectName=projectNameVal||process.env.PROJECT_NAME||"Google My Drive to OneDrive Migration";
      summary.supportEmail=supportEmailVal||process.env.IT_ADMIN_EMAIL||"it-support@yourorg.com";
      for(const err of errors){if(err.ResultCode)await getSolutionAsync(err.ResultCode,err.FailureReason);}
      const csvBase64=buildUserExcelBase64(userEmail,errors,summary),csvName=userEmail.split("@")[0]+"_migration_errors.xls";
      const emailHtml=buildEmailBody(userEmail,errors,summary),subject=`[Migration Update] ${errors.length} item(s) from your Google Drive migration need attention`;
      try{
        const payload={userEmail,subject,emailBody:emailHtml,csvAttachment:csvBase64,csvFileName:csvName,errorCount:errors.length,sourceFile,itAdminEmail:process.env.IT_ADMIN_EMAIL||"it-admin@yourorg.com",timestamp:new Date().toISOString()};
        const paResp=await axios.post(powerAutomateUrl,payload,{headers:{"Content-Type":"application/json"},timeout:30000});
        results.push({userEmail,errorCount:errors.length,csvFileName:csvName,status:"triggered",paStatus:paResp.status});
        log.emailSent(userEmail,errors.length,paResp.status);
      }catch(paError){
        results.push({userEmail,errorCount:errors.length,csvFileName:csvName,status:"failed",error:paError.message});
        log.emailFailed(userEmail,errors.length,paError.message);
      }
      await new Promise(r=>setTimeout(r,300));
    }
    const successCount=results.filter(r=>r.status==="triggered").length;
    const failedCount=results.filter(r=>r.status==="failed").length;
    const duration=Date.now()-startTime;
    log.processComplete(sourceFile,successCount,failedCount,duration);

    // Send Teams notification if webhook is configured
    const teamsWebhook = process.env.TEAMS_WEBHOOK_URL;
    if (teamsWebhook) {
      try {
        const rate = successCount+failedCount>0 ? Math.round(successCount/(successCount+failedCount)*100) : 0;
        await axios.post(teamsWebhook, {
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          summary: "MigraPulse Run Complete",
          themeColor: failedCount===0 ? "059669" : "D97706",
          title: `MigraPulse — Migration Run Complete`,
          sections: [{
            facts: [
              { name:"Source File", value:sourceFile },
              { name:"Users Notified", value:String(affectedUsers) },
              { name:"Emails Sent", value:String(successCount) },
              { name:"Failed", value:String(failedCount) },
              { name:"Delivery Rate", value:`${rate}%` },
              { name:"Duration", value:`${(duration/1000).toFixed(1)}s` },
            ]
          }]
        }, { headers:{"Content-Type":"application/json"}, timeout:5000 });
        log.info("Teams notification sent");
      } catch(e) { log.warn("Teams notification failed: "+e.message); }
    }

    // Save run to persistent history file
    saveRunToHistory({
      file: sourceFile,
      date: new Date().toLocaleString(),
      users: affectedUsers,
      sent: successCount,
      failed: failedCount,
      errors: Object.values(results).reduce((a,r)=>a+(r.errorCount||0),0),
    });

    return res.json({success:true,sourceFile,affectedUsers,successCount,failedCount,results,duration});
  }catch(err){log.error(`Process failed: ${err.message}`);return res.status(500).json({success:false,error:err.message});}
});

// ── Retry failed emails ───────────────────────────────────────────────────────
app.post("/api/retry-email",async(req,res)=>{
  try{
    const{userEmail,errors,sourceFile}=req.body;
    if(!userEmail||!errors)return res.status(400).json({error:"userEmail and errors required"});
    const powerAutomateUrl=process.env.POWER_AUTOMATE_URL;
    if(!powerAutomateUrl)return res.status(500).json({error:"Power Automate URL not configured"});
    const summary={sourceFile:sourceFile||"Retry"};
    for(const err of errors){if(err.ResultCode)await getSolutionAsync(err.ResultCode,err.FailureReason);}
    const csvBase64=buildUserExcelBase64(userEmail,errors,summary),csvName=userEmail.split("@")[0]+"_migration_errors.xls";
    const emailHtml=buildEmailBody(userEmail,errors,summary),subject=`[Migration Update - Retry] ${errors.length} item(s) need attention`;
    const payload={userEmail,subject,emailBody:emailHtml,csvAttachment:csvBase64,csvFileName:csvName,errorCount:errors.length,sourceFile:summary.sourceFile,itAdminEmail:process.env.IT_ADMIN_EMAIL||"it-admin@yourorg.com",timestamp:new Date().toISOString()};
    const paResp=await axios.post(powerAutomateUrl,payload,{headers:{"Content-Type":"application/json"},timeout:30000});
    log.emailSent(userEmail,errors.length,paResp.status);
    return res.json({success:true,userEmail,status:"triggered",paStatus:paResp.status});
  }catch(err){log.error(`Retry failed: ${err.message}`);return res.status(500).json({success:false,error:err.message});}
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post("/api/chat",async(req,res)=>{
  const start=Date.now();
  try{
    const{message,history=[],context={}}=req.body;
    if(!message?.trim())return res.status(400).json({success:false,error:"Message required"});
    const result=await handleChat(message.trim(),history,context);
    log.chatLog(message,result.message,Date.now()-start);
    return res.json({success:true,reply:result.message,error:result.error});
  }catch(err){log.error(`Chat failed: ${err.message}`);return res.status(500).json({success:false,error:err.message});}
});

// ── Suggest solution ──────────────────────────────────────────────────────────
app.post("/api/suggest-solution",async(req,res)=>{
  try{
    const{errorCode,failureReason}=req.body;
    if(!errorCode)return res.status(400).json({error:"errorCode required"});
    const solution=await getSolutionAsync(errorCode,failureReason||"");
    return res.json({success:true,errorCode,solution});
  }catch(err){return res.status(500).json({success:false,error:err.message});}
});

// ── History API ───────────────────────────────────────────────────────────────
app.get("/api/history",(req,res)=>{
  const histFile=path.join(__dirname,"..","data","history.json");
  try{
    if(!fs.existsSync(histFile))return res.json({success:true,history:[],total:0});
    const history=JSON.parse(fs.readFileSync(histFile,"utf8"));
    res.json({success:true,history,total:history.length});
  }catch{res.json({success:true,history:[],total:0});}
});

app.delete("/api/history",(req,res)=>{
  const histFile=path.join(__dirname,"..","data","history.json");
  try{
    if(fs.existsSync(histFile))fs.writeFileSync(histFile,"[]");
    log.info("History cleared by user");
    res.json({success:true,message:"History cleared"});
  }catch(e){res.status(500).json({success:false,error:e.message});}
});

// ── Category helper ───────────────────────────────────────────────────────────
function getCategory(code){
  if(code.startsWith("MAUTH"))return"Authentication";
  if(code.startsWith("MAZURE"))return"Upload / Azure";
  if(code.startsWith("MEXPORT"))return"Export";
  if(code.startsWith("MFOLDER")||code.startsWith("MFILE")||code.startsWith("MITEM"))return"File / Path";
  if(code.startsWith("MPERM")||code==="PFAIL"||code==="PFAILUNSUP"||code==="PUNSUP")return"Permissions";
  if(code.startsWith("MVERSION"))return"Version";
  if(code.startsWith("MDUP")||code==="MDUPLICATE")return"Duplicate";
  if(code.startsWith("MJOB")||code==="MJOBERROR")return"Job Error";
  return"General";
}

const PORT=process.env.PORT||3001;
app.listen(PORT,()=>{
  log.startupLog(PORT,!!process.env.GROQ_API_KEY,Object.keys(SOLUTIONS).length);
  console.log(`\n🚀 MigraPulse Backend v2.0 — port ${PORT}`);
  console.log(`   GET    /health`);
  console.log(`   GET    /api/stats               ← NEW`);
  console.log(`   GET    /api/history              ← NEW`);
  console.log(`   DELETE /api/history              ← NEW`);
  console.log(`   POST   /api/preview-email        ← NEW`);
  console.log(`   POST   /api/retry-email          ← NEW`);
  console.log(`   GET    /api/logs`);
  console.log(`   GET    /api/logs/download`);
  console.log(`   DELETE /api/logs`);
  console.log(`   GET    /api/error-codes`);
  console.log(`   POST   /api/preview-migration`);
  console.log(`   POST   /api/process-migration`);
  console.log(`   POST   /api/chat`);
  console.log(`   ${Object.keys(SOLUTIONS).length} error codes | Groq: ${process.env.GROQ_API_KEY?"✓":"✗"}\n`);
});