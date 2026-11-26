import { Chess } from './chess.mjs';
const $=id=>document.getElementById(id);
let game=new Chess(),selected=null,flipped=false,worker,ready=false,search=null,pending=false,lines=new Map();
let best=null,whiteScore=null, candidates=new Map(), liveGame=null, cursor=0, reviewWorker=null, reviewToken=0, reviewRows=[];

function overlay(){
 const svg=$('arrows');svg.replaceChildren();
 if(!best||!$('arrowsOn').checked)return;
 const moves=$('arrowCount').value==='3'?[...candidates.entries()].sort((a,b)=>b[0]-a[0]):[[1,best]];
 for(const [rank,move] of moves){const color=rank===1?'#19a85b':rank===2?'#e8b84b':'#56a5e8';
 const point=s=>{let x=s.charCodeAt(0)-97,y=8-Number(s[1]);return flipped?[7.5-x,7.5-y]:[x+.5,y+.5];};
 const [x,y]=point(move.slice(0,2)),[a,b]=point(move.slice(2,4)),d=Math.hypot(a-x,b-y);if(!d)continue;
 const ux=(a-x)/d,uy=(b-y)/d,ns='http://www.w3.org/2000/svg';
 const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:x,y1:y,x2:a-ux*.28,y2:b-uy*.28,stroke:color,'stroke-width':.15,'stroke-linecap':'round',opacity:.85}))line.setAttribute(k,v);svg.append(line);
 const head=document.createElementNS(ns,'polygon');head.setAttribute('points',a+','+b+' '+(a-ux*.48-uy*.22)+','+(b-uy*.48+ux*.22)+' '+(a-ux*.48+uy*.22)+','+(b-uy*.48-ux*.22));head.setAttribute('fill',color);svg.append(head);}

}
function evaluation(score){whiteScore=score;const pct=score===null?50:50+50*Math.tanh(score/400);$('evalwhite').style.height=pct+'%';$('evaluation').textContent=score===null?'Evaluation: —':'White evaluation: '+(score>=0?'+':'')+(score/100).toFixed(2);}
function san(m){return game.moves({verbose:true}).find(v=>v.from+v.to+(v.promotion||'')===m)?.san||m;}
const glyph={k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const aiTurn=()=>['both',game.turn()==='w'?'white':'black'].includes($('mode').value);
function draw(){
 $('board').replaceChildren();
 const files=[...'abcdefgh'],ranks=[8,7,6,5,4,3,2,1];
 if(flipped){files.reverse();ranks.reverse();}
 const legal=selected?game.moves({square:selected,verbose:true}).map(m=>m.to):[];
 for(const rank of ranks)for(const file of files){
 const sq=file+rank,p=game.get(sq),b=document.createElement('button');
 b.className=((file.charCodeAt(0)-97+rank)%2?'light':'dark')+(sq===selected?' selected':legal.includes(sq)?' legal':'')+(p?.color==='w'?' whitepiece':'');
 b.textContent=p?glyph[p.type]:'';b.draggable=!!p&&p.color===game.turn()&&!aiTurn()&&!game.isGameOver();b.ondragstart=e=>{e.dataTransfer.setData('text/plain',sq);};b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData('text/plain');if(/^[a-h][1-8]$/.test(from)&&game.get(from)?.color===game.turn()){selected=from;choose(sq);}};
 b.setAttribute('aria-label',sq+(p?' '+p.color+' '+p.type:''));
 const label=document.createElement('small');label.textContent=sq;b.append(label);b.onclick=()=>choose(sq);$('board').append(b);
 }
 overlay();material();$('outcome').hidden=!game.isGameOver();$('outcome').textContent=game.isCheckmate()?(game.turn()==='w'?'Black':'White')+' wins!':game.isDraw()?'Game drawn':'';
 $('fen').value=game.fen();$('history').textContent=game.pgn()||'No moves yet';
 $('turn').textContent=game.isCheckmate()?(game.turn()==='w'?'Black':'White')+' wins by checkmate':game.isDraw()?'Draw':(game.turn()==='w'?'White':'Black')+' to move'+(game.isCheck()?' · Check':'');
}
function choose(sq){
 if(liveGame)return;
 if(game.isGameOver()||aiTurn())return;
 const p=game.get(sq);
 if(selected&&game.moves({square:selected,verbose:true}).some(m=>m.to===sq)){
 const options=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);
 let promotion='q';if(options.some(m=>m.promotion)){const v=prompt('Promote to q, r, b or n','q');if(!v||!['q','r','b','n'].includes(v))return;promotion=v;}
 game.move({from:selected,to:sq,promotion});changed();return;
 }
 selected=p?.color===game.turn()?sq:null;draw();
}
function changed(){cancelReview();selected=null;draw();request($('auto').checked||aiTurn());}
function request(run=true){best=null;candidates.clear();overlay();evaluation(null);lines.clear();$('results').textContent='';pending=run;if(search){search.cancelled=true;worker.postMessage('stop');}else start();}
function start(){
 if(!ready||search||!pending||game.isGameOver())return;
 pending=false;const seconds=Number($('time').value);if(!Number.isFinite(seconds)||seconds<1||seconds>30){$('status').textContent='Thinking time must be 1–30 seconds';return;}const depth=Number($('depth').value),skill=Number($('skill').value);
 if(!Number.isInteger(depth)||depth<1||depth>22||!Number.isInteger(skill)||skill<0||skill>20){$('status').textContent='Invalid engine settings';return;}
 search={fen:game.fen(),cancelled:false,play:!liveGame&&aiTurn()};$('status').textContent='Analysing…';
 worker.postMessage('setoption name Skill Level value '+skill);
 worker.postMessage('setoption name MultiPV value '+(search.play?1:3));
 worker.postMessage('position fen '+search.fen);
 worker.postMessage('go depth '+depth+' movetime '+Math.round(seconds*1000));
}
try{
 worker=new Worker(ENGINE_PATH);worker.onerror=()=>{$('status').textContent='Engine failed';ready=false;search=null;$('analyse').disabled=true;};
 worker.onmessage=e=>{for(const line of String(e.data).split(/\r?\n/)){
 if(line==='uciok')worker.postMessage('isready');
 if(line==='readyok'){ready=true;$('analyse').disabled=false;$('status').textContent='Engine ready';start();}
 if(search&&!search.cancelled&&search.fen===game.fen()&&line.startsWith('info ')){
 const pv=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/),score=line.match(/\bscore (cp|mate) (-?\d+)/),rank=line.match(/\bmultipv (\d+)/);
 if(pv&&score){candidates.set(Number(rank?.[1]||1),pv[1]);overlay();if(Number(rank?.[1]||1)===1){best=pv[1];overlay();const n=Number(score[2]),sign=game.turn()==='w'?1:-1;evaluation(sign*(score[1]==='mate'?(n>=0?10000:-10000):n));if(score[1]==='mate')$('evaluation').textContent='White evaluation: mate '+(sign*n); }lines.set(Number(rank?.[1]||1),san(pv[1])+' · '+(score[1]==='mate'?'Mate '+score[2]:(Number(score[2])/100).toFixed(2)));$('results').textContent=[...lines].sort((a,b)=>a[0]-b[0]).map(([i,v])=>i+'. '+v).join('\n');}
 }
 if(line.startsWith('bestmove ')&&search){const old=search;search=null;const m=line.split(' ')[1];
 if(!old.cancelled&&old.fen===game.fen()){$('status').textContent='Best move: '+san(m);
 if(old.play&&aiTurn()&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)){try{game.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]||'q'});changed();}catch{$('mode').value='human';$('status').textContent='Engine move rejected';}}}
 start();}
 }};
 worker.postMessage('uci');
}catch(e){$('status').textContent=e.message;}
$('undo').onclick=()=>{if(liveGame)return;$('mode').value='human';game.undo();changed();};
$('reset').onclick=()=>{liveGame=null;$('mode').value='human';game.reset();changed();};
$('flip').onclick=()=>{flipped=!flipped;draw();};
$('load').onclick=()=>{try{const next=new Chess($('fen').value.trim());liveGame=null;game=next;$('mode').value='human';changed();}catch(e){$('status').textContent='Invalid FEN: '+e.message;}};
$('analyse').onclick=()=>request(true);
$('stop').onclick=()=>{$('mode').value='human';$('auto').checked=false;request(false);$('status').textContent='Paused';};
$('mode').onchange=()=>{if(liveGame){$('mode').value='human';return;}changed();};$('auto').onchange=()=>request($('auto').checked||aiTurn());
$('panel').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('popup.html')+'?full=1'});
$('arrowsOn').onchange=overlay;if(new URLSearchParams(location.search).has('full')){document.body.classList.add('full');$('panel').hidden=true;}$('arrowCount').onchange=overlay;$('preset').onchange=()=>{if($('preset').value!=='')$('skill').value=$('preset').value;};
function material(){const values={p:1,n:3,b:3,r:5,q:9,k:0};let w=0,b=0;for(const row of game.board())for(const p of row)if(p){if(p.color==='w')w+=values[p.type];else b+=values[p.type];}const d=w-b;$('material').textContent='Material: '+(d===0?'Equal':(d>0?'White +':'Black +')+Math.abs(d));}
function source(){return liveGame||game;}
function navigate(n){const original=source(),moves=original.history({verbose:true});if(!moves.length)return;cursor=Math.max(0,Math.min(n,moves.length));if(cursor===moves.length){game=original;liveGame=null;}else{liveGame=original;game=new Chess(moves[0].before);for(let i=0;i<cursor;i++)game.move(moves[i].san);}
 $('mode').value='human';selected=null;draw();$('reviewState').textContent=liveGame?'Review position '+cursor+' / '+moves.length:'Latest position';request($('auto').checked);}
$('prev').onclick=()=>navigate((liveGame?cursor:source().history().length)-1);
$('next').onclick=()=>navigate((liveGame?cursor:source().history().length)+1);
$('latest').onclick=()=>navigate(source().history().length);
function cancelReview(){reviewToken++;if(reviewWorker){reviewWorker.terminate();reviewWorker=null;}reviewRows=[];$('ratings').replaceChildren();$('accuracy').textContent='';$('graph').replaceChildren();$('reviewState').textContent='';}
function showReview(rows){$('ratings').replaceChildren();const ns='http://www.w3.org/2000/svg',svg=$('graph');svg.replaceChildren();const line=document.createElementNS(ns,'polyline');line.setAttribute('points',rows.map((r,i)=>((i+1)*300/Math.max(1,rows.length))+','+(50-45*Math.tanh(r.after/400))).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#8cdbab');line.setAttribute('stroke-width','2');svg.append(line);
 for(const [i,r] of rows.entries()){const b=document.createElement('button');b.textContent=(i+1)+'. '+r.san+' · '+r.rating+' · '+r.loss+' cp';b.onclick=()=>navigate(i+1);$('ratings').append(b);}
 const avg=c=>{const a=rows.filter(r=>r.color===c);return a.length?(a.reduce((n,r)=>n+100*Math.exp(-r.loss/200),0)/a.length).toFixed(1)+'%':'—';};$('accuracy').textContent='Estimated accuracy: White '+avg('w')+' · Black '+avg('b');}
$('review').onclick=()=>{
 const moves=source().history({verbose:true});cancelReview();if(!moves.length){$('reviewState').textContent='Play some moves first';return;}
 const token=reviewToken,positions=[moves[0].before,...moves.map(m=>m.after)],scores=[];let index=0,last=null,engineBest=null;
 $('reviewState').textContent='Reviewing 0 / '+positions.length;
 try{reviewWorker=new Worker(ENGINE_PATH);}catch(e){$('reviewState').textContent=e.message;return;}
 const w=reviewWorker;
 function finish(){w.terminate();reviewWorker=null;showReview(reviewRows);$('reviewState').textContent='Review complete · depth 12 / 1 second per position';}
 function next(){if(index>=positions.length){finish();return;}const p=new Chess(positions[index]);if(p.isGameOver()){scores.push({cp:p.isCheckmate()?(p.turn()==='w'?-10000:10000):0,best:null});advance();return;}last=null;engineBest=null;w.postMessage('position fen '+positions[index]);w.postMessage('go depth 12 movetime 1000');}
 function advance(){if(index>0){const m=moves[index-1],before=scores[index-1],after=scores[index],loss=Math.max(0,Math.round((before.cp-after.cp)*(m.color==='w'?1:-1))),uci=m.from+m.to+(m.promotion||'');reviewRows.push({san:m.san,color:m.color,after:after.cp,loss,rating:uci===before.best?'Best':loss<=20?'Excellent':loss<=60?'Good':loss<=120?'Inaccuracy':loss<=250?'Mistake':'Blunder'});}index++;$('reviewState').textContent='Reviewing '+index+' / '+positions.length;next();}
 w.onerror=()=>{if(token===reviewToken){w.terminate();reviewWorker=null;$('reviewState').textContent='Review engine failed';}};
 w.onmessage=e=>{if(token!==reviewToken)return;for(const l of String(e.data).split(/\r?\n/)){if(l==='uciok'){w.postMessage('setoption name Skill Level value 20');w.postMessage('setoption name MultiPV value 1');w.postMessage('isready');}else if(l==='readyok')next();else if(l.startsWith('info ')){const sc=l.match(/\bscore (cp|mate) (-?\d+)/),pv=l.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/);if(sc&&pv&&!/\b(?:lowerbound|upperbound)\b/.test(l)){const n=Number(sc[2]);last=(positions[index].split(' ')[1]==='w'?1:-1)*(sc[1]==='mate'?(n>=0?10000:-10000):n);engineBest=pv[1];}}else if(l.startsWith('bestmove ')){if(last===null){w.terminate();reviewWorker=null;$('reviewState').textContent='Review incomplete: no evaluation';return;}scores.push({cp:last,best:engineBest});advance();}}};w.postMessage('uci');
};
draw();pending=true;start();
