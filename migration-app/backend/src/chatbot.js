const axios=require("axios");
let ctx=null;
function updateContext(data){ctx={updatedAt:new Date().toISOString(),sourceFile:data.sourceFile,affectedUsers:data.affectedUsers,totalErrors:data.totalErrors||0,users:data.users||[]};}
async function handleChat(msg,history=[]){
  const apiKey=process.env.GROQ_API_KEY;
  let ctxStr="No migration data loaded. Ask admin to process a ZIP first.";
  if(ctx){const us=ctx.users.map(u=>"- "+u.userEmail+": "+u.errorCount+" errors ("+u.errorCodes.join(", ")+")").join("\n");ctxStr="Latest run ("+ctx.updatedAt+"):\nFile: "+ctx.sourceFile+"\nUsers: "+ctx.affectedUsers+"\nErrors: "+ctx.totalErrors+"\n"+us;}
  const sys="You are MigraPulse AI — IT support assistant for Google My Drive to OneDrive migration.\n\nSession data:\n"+ctxStr+"\n\nKnown errors:\n- MEXPORTFILEUNSUPPORTEDMIMETYPE: Google Shortcut — user must manually copy\n- MVERSIONDOWNLOAD: Download failed — IT retries in 48hrs\n- MFOLDERPATHTOLONG: Path too long — user shortens and re-uploads\n- MEXPORTFILERATELIMIT: Rate limited — IT retries\n- MPERMISSION: Permission error — user fixes sharing\n\nKeep answers under 120 words. Use bullets. Be direct.";
  if(!apiKey){return{message:"AI not configured. Add GROQ_API_KEY to .env",error:true};}
  try{
    const messages=[{role:"system",content:sys},...history.slice(-6).map(h=>({role:h.role,content:h.content})),{role:"user",content:msg}];
    const res=await axios.post("https://api.groq.com/openai/v1/chat/completions",{model:"llama-3.3-70b-versatile",max_tokens:300,temperature:0.5,messages},{headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},timeout:20000});
    return{message:res.data?.choices?.[0]?.message?.content||"No response.",error:false};
  }catch(err){console.error("[Chat] Error:",err.message);return{message:"AI error. Check GROQ_API_KEY.",error:true};}
}
module.exports={handleChat,updateContext};
