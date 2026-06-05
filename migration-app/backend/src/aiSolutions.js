const axios=require("axios");
const aiCache={};
async function generateAISolution(errorCode,failureReason){
  if(aiCache[errorCode]){return aiCache[errorCode];}
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey){return getFallback(errorCode,failureReason);}
  try{
    console.log("  [AI] Generating solution for: "+errorCode);
    const res=await axios.post("https://api.groq.com/openai/v1/chat/completions",{model:"llama-3.3-70b-versatile",max_tokens:400,temperature:0.3,messages:[{role:"system",content:"You are a Microsoft 365 migration specialist. Respond ONLY with valid JSON, no markdown, no explanation."},{role:"user",content:"A file failed to migrate from Google My Drive to OneDrive.\nError code: "+errorCode+"\nFailure reason: "+failureReason+"\n\nRespond with ONLY this JSON:\n{\"title\":\"Short 4-6 word title\",\"explanation\":\"1-2 sentence explanation\",\"solution\":\"1-2 sentence actionable steps\",\"actionRequired\":\"Yes or No with reason\",\"retryByIT\":\"Yes or No\",\"severity\":\"Error or Warning\"}"}]},{headers:{"Content-Type":"application/json","Authorization":"Bearer "+apiKey},timeout:15000});
    const text=res.data?.choices?.[0]?.message?.content||"";
    const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
    const sol={title:parsed.title||"Unknown: "+errorCode,explanation:parsed.explanation||"Unexpected error.",solution:parsed.solution||"Contact IT support.",actionRequired:parsed.actionRequired||"Yes — contact IT",retryByIT:parsed.retryByIT||"IT will investigate",severity:parsed.severity||"Error",aiGenerated:true};
    aiCache[errorCode]=sol;
    console.log("  [AI] Solution cached for "+errorCode);
    return sol;
  }catch(err){console.error("  [AI] Groq error:",err.message);return getFallback(errorCode,failureReason);}
}
function getFallback(c,r){return{title:"Migration error: "+c,explanation:r||"Unexpected error.",solution:"Contact IT support with the file name and error code.",actionRequired:"Yes — contact IT",retryByIT:"IT will investigate",severity:"Error",aiGenerated:false};}
function getAICache(){return aiCache;}
module.exports={generateAISolution,getAICache};
