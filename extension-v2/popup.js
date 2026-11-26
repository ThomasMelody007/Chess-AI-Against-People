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
 if(parts.length!==6||!/^(?:[prnbqkPRNBQK1-8]+\/){7}[prnbqkPRNBQK1-8]+$/.test(parts[0])||parts[0].split("/").some(r=>[...r].reduce((n,c)=>n+(/[1-8]/.test(c)?Number(c):1),0)!==8)||!/[wb]/.test(parts[1])||! /^(?:-|K?Q?k?q?)$/.test(parts[2])||! /^(?:-|[a-h][36])$/.test(parts[3])||! /^\d+$/.test(parts[4])||! /^[1-9]\d*$/.test(parts[5])||/[\r\n]/.test(fen)||!Number.isInteger(depth)||depth<1||depth>22||!Number.isInteger(skill)||skill<0||skill>20){$("status").textContent="Check FEN and engine settings";return;}
 lines.clear();render();busy=true;$("analyse").disabled=true;$("stop").disabled=false;$("status").textContent="Analysing…";
 send("setoption name Skill Level value "+skill);send("setoption name MultiPV value 3");send("position fen "+fen);send("go depth "+depth+" movetime 10000");
};
$("stop").onclick=()=>{if(busy)send("stop");};
