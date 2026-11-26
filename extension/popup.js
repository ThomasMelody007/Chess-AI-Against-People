const $ = id => document.getElementById(id);
const modes = {
 assistant: {heading:"AI Assistant",description:"Open Lichess analysis for permitted practice or review. Enter a practice FEN below to analyse with your paired desktop Stockfish.",url:"https://lichess.org/analysis",label:"Open analysis board"},
 auto: {heading:"Auto Play",description:"Control your dedicated Lichess BOT account.",url:"https://lichess.org/",label:"Open Lichess"}
};
function select(mode) {
 if (!Object.hasOwn(modes,mode)) mode="assistant";
 const data=modes[mode];
 $("analysis").hidden=mode!=="assistant";
 $("botpanel").hidden=mode!=="auto";
 if(mode!=="assistant") stopSync();
 for(const key of Object.keys(modes)) $(key).setAttribute("aria-pressed",String(key===mode));
 $("heading").textContent=data.heading;
 $("description").textContent=data.description;
 $("launch").href=data.url;
 $("launch").textContent=data.label;
 chrome.storage.local.set({mode});
}
for(const key of Object.keys(modes)) $(key).addEventListener("click",()=>select(key));
chrome.storage.local.get(["mode","port","fen","seconds"], data=>{select(data.mode||"assistant");if(data.port) $("port").value=data.port;if(data.fen) $("fen").value=data.fen;if(data.seconds) $("seconds").value=data.seconds;draw();});
chrome.storage.session.get("pairing",data=>{if(data.pairing)$("key").value=data.pairing;else $("connection").open=true;});
$("key").addEventListener("change",()=>chrome.storage.session.set({pairing:$("key").value.trim()}));
$("fen").addEventListener("input",()=>{draw();$("whitebar").style.width="50%";$("results").textContent="";});

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
$("analyse").addEventListener("click",analyse);
async function analyse(){
 if($("analyse").disabled)return;
 const port=parsePort(), key=$("key").value.trim(), seconds=Number($("seconds").value);
 if(!Number.isInteger(port)||port<1||port>65535||!key||!(seconds>=0.1&&seconds<=5)){ $("results").textContent="Check port, pairing key and thinking time.";return;}
 const fen=$("fen").value.trim();
 chrome.storage.session.set({pairing:key});
 chrome.storage.local.set({port,fen,seconds});
 $("analyse").disabled=true;
 $("results").textContent="Analysing…";
 try{
 const response=await fetch("http://127.0.0.1:"+port+"/extension/analyse",{method:"POST",headers:{"Content-Type":"application/json","X-ChessAI-Key":key},body:JSON.stringify({fen,seconds}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||"Request failed");
 if(fen!==$("fen").value.trim())return;
 $("results").textContent=data.lines.map((line,i)=> (i+1)+". "+line.move+"  "+(line.mate!==null?"Mate "+line.mate:(line.score/100).toFixed(2))+"  Depth "+line.depth).join("\n");
 if(fen===$("fen").value.trim()&&data.lines.length){const best=data.lines[0];draw(best.uci);$("whitebar").style.width=(100/(1+Math.exp(-best.score/200)))+"%";$("eval").setAttribute("aria-label","White evaluation "+best.score/100);}
 $("status").textContent="Stockfish connected";
 }catch(e){$("results").textContent="Analysis failed: "+e.message;$("status").textContent="Check desktop connection";$("connection").open=true;}
 finally{$("analyse").disabled=false;}
}

function draw(uci){
 const canvas=$("preview"),ctx=canvas.getContext("2d"),size=35;
 const symbols={K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"};
 for(let r=0;r<8;r++)for(let col=0;col<8;col++){ctx.fillStyle=(r+col)%2?"#769656":"#eeeed2";ctx.fillRect(col*size,r*size,size,size);}
 const ranks=$("fen").value.trim().split(" ")[0].split("/");
 if(ranks.length!==8)return;
 ctx.font="30px Segoe UI Symbol";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#171717";
 ranks.forEach((rank,r)=>{let col=0;for(const p of rank){if(/^[1-8]$/.test(p))col+=Number(p);else{if(symbols[p]&&col<8)ctx.fillText(symbols[p],col*size+size/2,r*size+size/2);col++;}}});
 if(!uci||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))return;
 const point=s=>[(s.charCodeAt(0)-97+.5)*size,(8.5-Number(s[1]))*size];
 const [x,y]=point(uci.slice(0,2)),[a,b]=point(uci.slice(2,4)),angle=Math.atan2(b-y,a-x);
 ctx.strokeStyle="#e59b27";ctx.fillStyle="#e59b27";ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.stroke();ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(a-12*Math.cos(angle-.5),b-12*Math.sin(angle-.5));ctx.lineTo(a-12*Math.cos(angle+.5),b-12*Math.sin(angle+.5));ctx.closePath();ctx.fill();
}
draw();

let following=false, generation=0, lastFen=null;
function stopSync(){
 following=false;generation++;
 $("sync").setAttribute("aria-pressed","false");
 $("sync").textContent="Follow local practice board";
 $("syncstatus").textContent="";
}
$("sync").addEventListener("click",()=>{
 if(following){stopSync();return;}
 if(!$("key").value.trim()){$("connection").open=true;$("syncstatus").textContent="Enter desktop pairing key first.";return;}
 following=true;lastFen=null;generation++;
 $("sync").setAttribute("aria-pressed","true");
 $("sync").textContent="Stop following";
 follow(generation);
});
async function follow(id){
 if(!following||id!==generation)return;
 try{
 const port=parsePort();
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error("Invalid local port");
 const response=await fetch("http://127.0.0.1:"+port+"/state",{cache:"no-store",signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error("Local board unavailable");
 const state=await response.json();
 if(!following||id!==generation)return;
 if(typeof state.fen!=="string")throw new Error("Invalid local board state");
 $("syncstatus").textContent="Following local practice board";
 if(state.fen!==lastFen&&!$("analyse").disabled){
 lastFen=state.fen;$("fen").value=state.fen;draw();$("whitebar").style.width="50%";
 if(state.result){$("results").textContent="Game over: "+state.result;}
 else await analyse();
 }
 }catch(e){if(id===generation){$("syncstatus").textContent=e.message;lastFen=null;}}
 if(following&&id===generation)setTimeout(()=>follow(id),1200);
}
$("fen").addEventListener("input",stopSync);

let botBusy=false;
async function botRequest(action,body={}){
 const port=parsePort(),key=$("key").value.trim();
 if(!Number.isInteger(port)||port<1||port>65535||!key)throw new Error("Enter desktop port and pairing key");
 const response=await fetch("http://127.0.0.1:"+port+"/extension/bot/"+action,{method:"POST",headers:{"Content-Type":"application/json","X-ChessAI-Key":key},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||"Request failed");
 return data;
}
async function botStatus(){
 if(botBusy||$("botpanel").hidden)return;
 try{
 const data=await botRequest("status");
 $("botstatus").textContent=data.status;
 $("botopponent").textContent=data.opponent||"";
 const valid=typeof data.gid==="string"&&/^[a-zA-Z0-9]+$/.test(data.gid);
 $("botwatch").hidden=!valid;
 if(valid)$("botwatch").href="https://lichess.org/"+data.gid;
 }catch(e){$("botstatus").textContent=e.message;$("botwatch").hidden=true;}
}
async function botCommand(action,body){
 if(botBusy)return;
 botBusy=true;$("botstart").disabled=true;$("botstop").disabled=true;
 try{await botRequest(action,body);$("botstatus").textContent="Command queued…";}
 catch(e){$("botstatus").textContent=e.message;$("connection").open=true;}
 finally{botBusy=false;$("botstart").disabled=false;$("botstop").disabled=false;}
}
$("botstart").addEventListener("click",()=>{const skill=Number($("botskill").value);if(!Number.isInteger(skill)||skill<0||skill>20){$("botstatus").textContent="Choose strength 0–20";return;}botCommand("start",{skill});});
$("botstop").addEventListener("click",()=>{if(confirm("Stop BOT? An active game may time out."))botCommand("stop",{confirm:true});});
setInterval(botStatus,2000);
