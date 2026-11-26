const $=id=>document.getElementById(id);
let worker,ready=false,busy=false,lines=new Map();
function send(s){worker.postMessage(s);}
function fail(s){ready=false;busy=false;$("status").textContent=s;$("analyse").disabled=true;$("stop").disabled=true;}
function render(){ $("results").textContent=[...lines.entries()].sort((a,b)=>a[0]-b[0]).map(([i,l])=>i+". "+l).join("\n");}
try{
 worker=new Worker(ENGINE_PATH);
 worker.onerror=()=>fail("Engine failed to load. Check the build output.");
 worker.onmessage=e=>{
 for(const line of String(e.data).split(/\r?\n/)){
 if(line==="uciok"){send("isready");}
 if(line==="readyok"){ready=true;$("status").textContent="Engine ready · local browser";$("analyse").disabled=false;}
 if(busy&&line.startsWith("info ")){
 const pv=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/),score=line.match(/\bscore (cp|mate) (-?\d+)/),depth=line.match(/\bdepth (\d+)/),rank=line.match(/\bmultipv (\d+)/);
 if(pv&&score&&depth){lines.set(Number(rank?.[1]||1),pv[1]+" · "+(score[1]==="mate"?"Mate "+score[2]:(Number(score[2])/100).toFixed(2))+" · depth "+depth[1]);render();}
 }
 if(line.startsWith("bestmove ")){busy=false;$("status").textContent="Best move: "+line.split(" ")[1];$("analyse").disabled=!ready;$("stop").disabled=true;}
 }
 };
 send("uci");
}catch(e){fail(e.message);}
$("analyse").onclick=()=>{
 if(!ready||busy)return;
 const fen=$("fen").value.trim(),depth=Number($("depth").value),skill=Number($("skill").value);
 const parts=fen.split(" ");
 if(parts.length!==6||!/^(?:[prnbqkPRNBQK1-8]+\/){7}[prnbqkPRNBQK1-8]+$/.test(parts[0])||parts[0].split("/").some(r=>[...r].reduce((n,c)=>n+(/[1-8]/.test(c)?Number(c):1),0)!==8)||!/^[wb]$/.test(parts[1])||! /^(?:-|K?Q?k?q?)$/.test(parts[2])||! /^(?:-|[a-h][36])$/.test(parts[3])||! /^\d+$/.test(parts[4])||! /^[1-9]\d*$/.test(parts[5])||/[\r\n]/.test(fen)||!Number.isInteger(depth)||depth<1||depth>22||!Number.isInteger(skill)||skill<0||skill>20){$("status").textContent="Check FEN and engine settings";return;}
 lines.clear();render();busy=true;$("analyse").disabled=true;$("stop").disabled=false;$("status").textContent="Analysing…";
 send("setoption name Skill Level value "+skill);send("setoption name MultiPV value 3");send("position fen "+fen);send("go depth "+depth+" movetime 10000");
};
$("stop").onclick=()=>{if(busy)send("stop");};

let followed="",pending="",polling=false;
const allowed=url=>{try{const u=new URL(url);return u.origin==="https://www.chess.com"&&/^\/analysis\/?$/.test(u.pathname);}catch{return false;}};
async function poll(){
 if(polling)return;polling=true;
 try{
 const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
 if(!tab||!allowed(tab.url)){ $("site").textContent="Open chess.com/analysis for automatic import";$("follow").checked=false;$("follow").disabled=true;pending="";return;}
 const [r]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
 if(location.origin!=="https://www.chess.com"||!/^\/analysis\/?$/.test(location.pathname))return null;
 const pattern=/^(?:[prnbqkPRNBQK1-8]+\/){7}[prnbqkPRNBQK1-8]+ [wb] (?:-|K?Q?k?q?) (?:-|[a-h][36]) \d+ \d+$/;
 const values=[...document.querySelectorAll("input,textarea")].filter(e=>e.getClientRects().length).map(e=>e.value.trim()).filter(v=>pattern.test(v));
 return [...new Set(values)].length===1?values[0]:null;
 }});
 if(!r?.result){$("site").textContent="Analysis page detected · open Share Game to import FEN";$("follow").disabled=true;pending="";return;}
 $("site").textContent="Chess.com analysis · FEN detected";$("follow").disabled=false;
 if($("follow").checked&&r.result!==followed){pending=r.result;if(!busy&&ready){$("fen").value=pending;followed=pending;pending="";$("analyse").click();}}
 }catch(e){$("site").textContent="Analysis access unavailable · reopen popup on analysis page";$("follow").disabled=true;pending="";}finally{polling=false;}
}
$("follow").onchange=()=>{followed="";pending="";if($("follow").checked)poll();};
$("fen").addEventListener("input",()=>{$("follow").checked=false;pending="";});
$("stop").addEventListener("click",()=>{$("follow").checked=false;pending="";});
chrome.storage.local.get(["depth","skill"]).then(v=>{for(const k of ["depth","skill"])if(Number.isInteger(v[k])&&v[k]>=Number($(k).min)&&v[k]<=Number($(k).max))$(k).value=v[k];});
for(const k of ["depth","skill"])$(k).addEventListener("change",()=>{const n=Number($(k).value);if(Number.isInteger(n)&&n>=Number($(k).min)&&n<=Number($(k).max))chrome.storage.local.set({[k]:n});});
poll();setInterval(poll,1200);

$("panel").onclick=()=>{
 if(!chrome.sidePanel?.open){$("site").textContent="Side panel unavailable in this browser version";return;}
 chrome.sidePanel.open({windowId:chrome.windows.WINDOW_ID_CURRENT}).catch(()=>{$("site").textContent="Could not open side panel. Use the browser side panel menu.";});
};
