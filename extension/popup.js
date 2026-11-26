const $ = id => document.getElementById(id);
const modes = {
 assistant: {heading:"AI Assistant",description:"Open Lichess analysis for permitted practice or review. Enter a practice FEN below to analyse with your paired desktop Stockfish.",url:"https://lichess.org/analysis",label:"Open analysis board"},
 auto: {heading:"Auto Play",description:"Start the dedicated BOT connection in the ChessAI desktop app. This preview does not start or stop the bot from the extension.",url:"https://lichess.org/",label:"Open Lichess"}
};
function select(mode) {
 if (!Object.hasOwn(modes,mode)) mode="assistant";
 const data=modes[mode];
 $("analysis").hidden=mode!=="assistant";
 for(const key of Object.keys(modes)) $(key).setAttribute("aria-pressed",String(key===mode));
 $("heading").textContent=data.heading;
 $("description").textContent=data.description;
 $("launch").href=data.url;
 $("launch").textContent=data.label;
 chrome.storage.local.set({mode});
}
for(const key of Object.keys(modes)) $(key).addEventListener("click",()=>select(key));
chrome.storage.local.get(["mode","port"], data=>{select(data.mode||"assistant");if(data.port) $("port").value=data.port;});
$("open").addEventListener("click",()=>{
 const port=parsePort();
 if(!Number.isInteger(port)||port<1||port>65535){$("status").textContent="Enter the port shown in the desktop application.";return;}
 chrome.storage.local.set({port});
 chrome.tabs.create({url:"http://127.0.0.1:"+port+"/"});
 $("status").textContent="Opening local board. Start it in the desktop app first.";
});
function parsePort(){
 const raw=$("port").value.trim();
 if(/^\d+$/.test(raw)) return Number(raw);
 try{const u=new URL(raw);if(u.protocol==="http:"&&u.hostname==="127.0.0.1"&&u.port)return Number(u.port);}catch{}
 return NaN;
}
$("analyse").addEventListener("click",async()=>{
 const port=parsePort(), key=$("key").value.trim(), seconds=Number($("seconds").value);
 if(!Number.isInteger(port)||port<1||port>65535||!key||!(seconds>=0.1&&seconds<=5)){ $("results").textContent="Check port, pairing key and thinking time.";return;}
 $("analyse").disabled=true;
 $("results").textContent="Analysing…";
 try{
 const response=await fetch("http://127.0.0.1:"+port+"/extension/analyse",{method:"POST",headers:{"Content-Type":"application/json","X-ChessAI-Key":key},body:JSON.stringify({fen:$("fen").value.trim(),seconds}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||"Request failed");
 $("results").textContent=data.lines.map((line,i)=> (i+1)+". "+line.move+"  "+(line.mate!==null?"Mate "+line.mate:(line.score/100).toFixed(2))+"  Depth "+line.depth).join("\n");
 $("status").textContent="Stockfish connected";
 }catch(e){$("results").textContent="Analysis failed: "+e.message;$("status").textContent="Check desktop connection";}
 finally{$("analyse").disabled=false;}
});
