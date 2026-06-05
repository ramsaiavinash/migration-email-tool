require("dotenv").config();
const express=require("express");
const cors=require("cors");
const multer=require("multer");
const axios=require("axios");
const {parseZip}=require("./zipParser");
const {buildUserExcelBase64}=require("./excelBuilder");
const {buildEmailBody}=require("./emailBuilder");
const {handleChat,updateContext}=require("./chatbot");
const {getSolutionAsync}=require("./errorSolutions");
const app=express();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024}});
app.use(cors({origin:"*",methods:["GET","POST","OPTIONS"],allowedHeaders:["Content-Type","Authorization"]}));
app.use(express.json());
app.get("/health",(req,res)=>{res.json({status:"ok",timestamp:new Date().toISOString(),aiEnabled:!!process.env.GROQ_API_KEY});});
app.post("/api/preview-migration",upload.single("migrationZip"),async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:"No file uploaded"});
    const {userMap,sourceFile,affectedUsers,totalErrors}=await parseZip(req.file.buffer,req.file.originalname);
    const preview=Object.entries(userMap).map(([email,errors])=>({userEmail:email,errorCount:errors.length,errorCodes:[...new Set(errors.map(e=>e.ResultCode).filter(Boolean))],preview:errors.slice(0,3).map(e=>({file:e.FullPath?e.FullPath.split("/").pop():"Unknown",code:e.ResultCode,reason:e.FailureReason}))}));
    updateContext({sourceFile,affectedUsers,totalErrors,users:preview});
    return res.json({success:true,sourceFile,affectedUsers,totalErrors,users:preview});
  }catch(err){return res.status(500).json({success:false,error:err.message});}
});
app.post("/api/process-migration",upload.single("migrationZip"),async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({success:false,error:"No ZIP file uploaded"});
    if(!req.file.originalname.endsWith(".zip")) return res.status(400).json({success:false,error:"File must be a .zip"});
    const powerAutomateUrl=process.env.POWER_AUTOMATE_URL;
    if(!powerAutomateUrl||powerAutomateUrl.includes("REPLACE_AFTER_PA_SETUP")) return res.status(500).json({success:false,error:"Power Automate URL not configured"});
    console.log("Processing: "+req.file.originalname);
    const {userMap,summaryMap,sourceFile,affectedUsers}=await parseZip(req.file.buffer,req.file.originalname);
    if(affectedUsers===0) return res.status(400).json({success:false,error:"No user errors found in ZIP"});
    const results=[];
    for(const [userEmail,errors] of Object.entries(userMap)){
      const summary=summaryMap[userEmail]||{sourceFile};
      summary.sourceFile=sourceFile;
      console.log("  -> "+userEmail+" ("+errors.length+" errors)");
      for(const err of errors){if(err.ResultCode) await getSolutionAsync(err.ResultCode,err.FailureReason);}
      const csvBase64=buildUserExcelBase64(userEmail,errors,summary);
      const csvName=userEmail.split("@")[0]+"_migration_errors.xls";
      const emailHtml=buildEmailBody(userEmail,errors,summary);
      const subject="[Migration Update] "+errors.length+" item(s) from your Google Drive migration need attention";
      try{
        const payload={userEmail,subject,emailBody:emailHtml,csvAttachment:csvBase64,csvFileName:csvName,errorCount:errors.length,sourceFile,itAdminEmail:process.env.IT_ADMIN_EMAIL||"it-admin@yourorg.com",timestamp:new Date().toISOString()};
        const paResp=await axios.post(powerAutomateUrl,payload,{headers:{"Content-Type":"application/json"},timeout:30000});
        results.push({userEmail,errorCount:errors.length,csvFileName:csvName,status:"triggered",paStatus:paResp.status});
        console.log("  ✓ Triggered for "+userEmail);
      }catch(paError){
        console.error("  ✗ PA failed:",paError.message);
        results.push({userEmail,errorCount:errors.length,csvFileName:csvName,status:"failed",error:paError.message});
      }
      await new Promise(r=>setTimeout(r,300));
    }
    const successCount=results.filter(r=>r.status==="triggered").length;
    const failedCount=results.filter(r=>r.status==="failed").length;
    return res.json({success:true,sourceFile,affectedUsers,successCount,failedCount,results});
  }catch(err){console.error("Error:",err);return res.status(500).json({success:false,error:err.message});}
});
app.post("/api/chat",async(req,res)=>{
  try{
    const {message,history=[]}=req.body;
    if(!message||!message.trim()) return res.status(400).json({success:false,error:"Message required"});
    console.log("[Chat] "+message.substring(0,60));
    const result=await handleChat(message.trim(),history);
    return res.json({success:true,reply:result.message,error:result.error});
  }catch(err){return res.status(500).json({success:false,error:err.message});}
});
app.post("/api/suggest-solution",async(req,res)=>{
  try{
    const {errorCode,failureReason}=req.body;
    if(!errorCode) return res.status(400).json({error:"errorCode required"});
    const solution=await getSolutionAsync(errorCode,failureReason||"");
    return res.json({success:true,errorCode,solution});
  }catch(err){return res.status(500).json({success:false,error:err.message});}
});
const PORT=process.env.PORT||3001;
app.listen(PORT,()=>{
  console.log("\n🚀 MigraPulse Backend running on port "+PORT);
  console.log("   Health:  http://localhost:"+PORT+"/health");
  console.log("   Preview: POST /api/preview-migration");
  console.log("   Process: POST /api/process-migration");
  console.log("   Chat:    POST /api/chat");
  console.log("   AI:      "+(process.env.GROQ_API_KEY?"✓ Enabled (Groq)":"✗ Disabled — add GROQ_API_KEY to .env")+"\n");
});
