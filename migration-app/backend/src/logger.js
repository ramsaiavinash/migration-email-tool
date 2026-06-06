const fs=require("fs"),path=require("path");
const LOG_DIR=path.join(__dirname,"..","logs"),LOG_FILE=path.join(LOG_DIR,"migrapulse.log"),MAX_SIZE=10*1024*1024;
if(!fs.existsSync(LOG_DIR))fs.mkdirSync(LOG_DIR,{recursive:true});
function timestamp(){return new Date().toISOString().replace("T"," ").slice(0,23);}
function rotateLogs(){try{if(fs.existsSync(LOG_FILE)){const size=fs.statSync(LOG_FILE).size;if(size>MAX_SIZE){const archived=LOG_FILE.replace(".log",`_${Date.now()}.log`);fs.renameSync(LOG_FILE,archived);write("SYSTEM","Log rotated");}}}catch{}}
function write(level,message,meta={}){rotateLogs();const metaStr=Object.keys(meta).length?" | "+JSON.stringify(meta):"";const line=`[${timestamp()}] [${level.padEnd(7)}] ${message}${metaStr}\n`;try{fs.appendFileSync(LOG_FILE,line);}catch{}const colors={INFO:"\x1b[36m",WARN:"\x1b[33m",ERROR:"\x1b[31m",SUCCESS:"\x1b[32m",CHAT:"\x1b[35m",SYSTEM:"\x1b[90m"};const c=colors[level]||"\x1b[0m";console.log(`${c}${line.trim()}\x1b[0m`);}
const log={
  info:(msg,meta)=>write("INFO",msg,meta),
  warn:(msg,meta)=>write("WARN",msg,meta),
  error:(msg,meta)=>write("ERROR",msg,meta),
  success:(msg,meta)=>write("SUCCESS",msg,meta),
  chat:(msg,meta)=>write("CHAT",msg,meta),
  system:(msg,meta)=>write("SYSTEM",msg,meta),
  startupLog(port,aiEnabled,codesLoaded){write("SYSTEM","=".repeat(60));write("SYSTEM",`MigraPulse backend started on port ${port}`);write("SYSTEM",`AI enabled: ${aiEnabled} | Error codes loaded: ${codesLoaded}`);write("SYSTEM","=".repeat(60));},
  previewLog(sourceFile,affectedUsers,totalErrors){write("INFO",`ZIP preview — ${sourceFile}`,{affectedUsers,totalErrors});},
  processStart(sourceFile,affectedUsers){write("INFO",`Processing started — ${sourceFile}`,{affectedUsers});},
  emailSent(userEmail,errorCount,paStatus){write("SUCCESS",`Email sent — ${userEmail}`,{errorCount,paStatus});},
  emailFailed(userEmail,errorCount,error){write("ERROR",`Email failed — ${userEmail}`,{errorCount,error});},
  processComplete(sourceFile,successCount,failedCount,durationMs){write("SUCCESS",`Processing complete — ${sourceFile}`,{successCount,failedCount,durationMs:`${durationMs}ms`});},
  chatLog(message,reply,durationMs){write("CHAT",`Q: ${message.slice(0,80)}${message.length>80?"…":""}`,{replyLen:reply?.length||0,durationMs:`${durationMs}ms`});},
  aiGenerated(code){write("INFO",`AI solution generated for: ${code}`);},
  errorCodeLookup(code,found){write("INFO",`Error code lookup: ${code}`,{found});},
  tail(n=100){try{if(!fs.existsSync(LOG_FILE))return[];const content=fs.readFileSync(LOG_FILE,"utf8");return content.trim().split("\n").slice(-n);}catch{return[];}},
  read(filter={}){try{if(!fs.existsSync(LOG_FILE))return[];const lines=fs.readFileSync(LOG_FILE,"utf8").trim().split("\n").filter(Boolean);return lines.filter(line=>{if(filter.level&&!line.includes(`[${filter.level}`))return false;if(filter.search&&!line.toLowerCase().includes(filter.search.toLowerCase()))return false;return true;}).map(line=>{const m=line.match(/^\[(.+?)\] \[(.+?)\] (.+)$/);if(!m)return{raw:line};const[,ts,level,rest]=m;const pipeIdx=rest.indexOf(" | ");const message=pipeIdx>-1?rest.slice(0,pipeIdx):rest;let meta={};try{if(pipeIdx>-1)meta=JSON.parse(rest.slice(pipeIdx+3));}catch{}return{timestamp:ts,level:level.trim(),message,meta,raw:line};});}catch{return[];}},
  getLogFiles(){try{return fs.readdirSync(LOG_DIR).filter(f=>f.endsWith(".log")).map(f=>({name:f,path:path.join(LOG_DIR,f),size:fs.statSync(path.join(LOG_DIR,f)).size,modified:fs.statSync(path.join(LOG_DIR,f)).mtime})).sort((a,b)=>b.modified-a.modified);}catch{return[];}},
  clearLogs(){try{fs.writeFileSync(LOG_FILE,"");write("SYSTEM","Logs cleared by user");}catch{}},
};
module.exports=log;
