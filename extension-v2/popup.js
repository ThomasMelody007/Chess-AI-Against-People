import { Chess } from './chess.mjs';
const $=id=>document.getElementById(id);
let game=new Chess(),selected=null,flipped=false,worker,ready=false,search=null,pending=false,lines=new Map();
let best=null,whiteScore=null;
function overlay(){
 const svg=$('arrows');svg.replaceChildren();
 if(!best||!$('arrowsOn').checked)return;
 const point=s=>{let x=s.charCodeAt(0)-97,y=8-Number(s[1]);return flipped?[7.5-x,7.5-y]:[x+.5,y+.5];};
 const [x,y]=point(best.slice(0,2)),[a,b]=point(best.slice(2,4)),d=Math.hypot(a-x,b-y);if(!d)return;
 const ux=(a-x)/d,uy=(b-y)/d,ns='http://www.w3.org/2000/svg';
 const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:x,y1:y,x2:a-ux*.28,y2:b-uy*.28,stroke:'#19a85b','stroke-width':.15,'stroke-linecap':'round',opacity:.85}))line.setAttribute(k,v);svg.append(line);
 const head=document.createElementNS(ns,'polygon');head.setAttribute('points',a+','+b+' '+(a-ux*.48-uy*.22)+','+(b-uy*.48+ux*.22)+' '+(a-ux*.48+uy*.22)+','+(b-uy*.48-ux*.22));head.setAttribute('fill','#19a85b');svg.append(head);
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
 overlay();$('outcome').hidden=!game.isGameOver();$('outcome').textContent=game.isCheckmate()?(game.turn()==='w'?'Black':'White')+' wins!':game.isDraw()?'Game drawn':'';
 $('fen').value=game.fen();$('history').textContent=game.pgn()||'No moves yet';
 $('turn').textContent=game.isCheckmate()?(game.turn()==='w'?'Black':'White')+' wins by checkmate':game.isDraw()?'Draw':(game.turn()==='w'?'White':'Black')+' to move'+(game.isCheck()?' · Check':'');
}
function choose(sq){
 if(game.isGameOver()||aiTurn())return;
 const p=game.get(sq);
 if(selected&&game.moves({square:selected,verbose:true}).some(m=>m.to===sq)){
 const options=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);
 let promotion='q';if(options.some(m=>m.promotion)){const v=prompt('Promote to q, r, b or n','q');if(!v||!['q','r','b','n'].includes(v))return;promotion=v;}
 game.move({from:selected,to:sq,promotion});changed();return;
 }
 selected=p?.color===game.turn()?sq:null;draw();
}
function changed(){selected=null;draw();request($('auto').checked||aiTurn());}
function request(run=true){best=null;overlay();evaluation(null);lines.clear();$('results').textContent='';pending=run;if(search){search.cancelled=true;worker.postMessage('stop');}else start();}
function start(){
 if(!ready||search||!pending||game.isGameOver())return;
 pending=false;const seconds=Number($('time').value);if(!Number.isFinite(seconds)||seconds<1||seconds>30){$('status').textContent='Thinking time must be 1–30 seconds';return;}const depth=Number($('depth').value),skill=Number($('skill').value);
 if(!Number.isInteger(depth)||depth<1||depth>22||!Number.isInteger(skill)||skill<0||skill>20){$('status').textContent='Invalid engine settings';return;}
 search={fen:game.fen(),cancelled:false,play:aiTurn()};$('status').textContent='Analysing…';
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
 if(pv&&score){if(Number(rank?.[1]||1)===1){best=pv[1];overlay();const n=Number(score[2]),sign=game.turn()==='w'?1:-1;evaluation(sign*(score[1]==='mate'?(n>=0?10000:-10000):n));if(score[1]==='mate')$('evaluation').textContent='White evaluation: mate '+(sign*n); }lines.set(Number(rank?.[1]||1),san(pv[1])+' · '+(score[1]==='mate'?'Mate '+score[2]:(Number(score[2])/100).toFixed(2)));$('results').textContent=[...lines].sort((a,b)=>a[0]-b[0]).map(([i,v])=>i+'. '+v).join('\n');}
 }
 if(line.startsWith('bestmove ')&&search){const old=search;search=null;const m=line.split(' ')[1];
 if(!old.cancelled&&old.fen===game.fen()){$('status').textContent='Best move: '+san(m);
 if(old.play&&aiTurn()&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)){try{game.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]||'q'});changed();}catch{$('mode').value='human';$('status').textContent='Engine move rejected';}}}
 start();}
 }};
 worker.postMessage('uci');
}catch(e){$('status').textContent=e.message;}
$('undo').onclick=()=>{$('mode').value='human';game.undo();changed();};
$('reset').onclick=()=>{$('mode').value='human';game.reset();changed();};
$('flip').onclick=()=>{flipped=!flipped;draw();};
$('load').onclick=()=>{try{const next=new Chess($('fen').value.trim());game=next;$('mode').value='human';changed();}catch(e){$('status').textContent='Invalid FEN: '+e.message;}};
$('analyse').onclick=()=>request(true);
$('stop').onclick=()=>{$('mode').value='human';$('auto').checked=false;request(false);$('status').textContent='Paused';};
$('mode').onchange=()=>changed();$('auto').onchange=()=>request($('auto').checked||aiTurn());
$('panel').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('popup.html')+'?full=1'});
$('arrowsOn').onchange=overlay;if(new URLSearchParams(location.search).has('full')){document.body.classList.add('full');$('panel').hidden=true;}draw();pending=true;start();
