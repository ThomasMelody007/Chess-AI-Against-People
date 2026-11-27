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
 b.className=((file.charCodeAt(0)-97+rank)%2?'dark':'light')+(sq===selected?' selected':legal.includes(sq)?' legal':'')+(p?.color==='w'?' whitepiece':'');
 b.textContent=p?pieceGlyph(p.type,p.color):'';b.draggable=!liveGame&&!!p&&p.color===game.turn()&&!aiTurn()&&!game.isGameOver();b.ondragstart=e=>{e.dataTransfer.setData('text/plain',sq);};b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData('text/plain');if(/^[a-h][1-8]$/.test(from)&&game.get(from)?.color===game.turn()){selected=from;choose(sq);}};
 b.setAttribute('aria-label',sq+(p?' '+p.color+' '+p.type:''));
 const label=document.createElement('small');label.textContent=sq;b.append(label);b.onclick=()=>choose(sq);$('board').append(b);
 }
 overlay();material();openingAndCaptures();$('outcome').hidden=!game.isGameOver();$('outcome').textContent=game.isCheckmate()?(game.turn()==='w'?'Black':'White')+' wins!':game.isDraw()?'Draw · '+drawReason():'';
 $('fen').value=game.fen();$('history').textContent=gamePgn(game)||'No moves yet';
 $('turn').textContent=game.isCheckmate()?(game.turn()==='w'?'Black':'White')+' wins by checkmate':game.isDraw()?'Draw':(game.turn()==='w'?'White':'Black')+' to move'+(game.isCheck()?' · Check':'');
}
function choose(sq){
 if(liveGame)return;
 if(game.isGameOver()||aiTurn())return;
 const p=game.get(sq);
 if(selected&&game.moves({square:selected,verbose:true}).some(m=>m.to===sq)){
 const options=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);
 let promotion='q';if(options.some(m=>m.promotion)){const v=prompt('Promote to q, r, b or n','q');if(!v||!['q','r','b','n'].includes(v))return;promotion=v;}
 const moved=game.move({from:selected,to:sq,promotion});playSound(!!moved.captured);changed();return;
 }
 selected=p?.color===game.turn()?sq:null;draw();
}
function changed(){cancelReview();selected=null;draw();saveGame();request($('auto').checked||aiTurn());}
function request(run=true){$('status').textContent=game.isGameOver()?(game.isCheckmate()?(game.turn()==='w'?'Black':'White')+' wins by checkmate':'Game drawn'):(run?'Waiting for engine…':'Analysis paused');best=null;candidates.clear();overlay();evaluation(game.isDraw()?0:game.isCheckmate()?(game.turn()==='w'?-10000:10000):null);if(game.isCheckmate())$('evaluation').textContent='Checkmate';lines.clear();$('results').textContent='';pending=run&&!game.isGameOver();if(search){search.cancelled=true;worker.postMessage('stop');}else start();}
function start(){
 if(!ready||search||!pending||game.isGameOver())return;
 pending=false;const seconds=Number($('time').value);if(!Number.isFinite(seconds)||seconds<1||seconds>30){$('status').textContent='Thinking time must be 1–30 seconds';return;}const depth=Number($('depth').value),skill=Number($('skill').value);
 if(!Number.isInteger(depth)||depth<1||depth>22||!Number.isInteger(skill)||skill<0||skill>20){$('status').textContent='Invalid engine settings';return;}
 search={fen:game.fen(),cancelled:false,play:!liveGame&&aiTurn()};$('status').textContent='Analysing…';
 worker.postMessage('setoption name Skill Level value '+(search.play?skill:20));
 worker.postMessage('setoption name MultiPV value '+(search.play?1:3));
 worker.postMessage('position fen '+search.fen);
 worker.postMessage('go depth '+depth+' movetime '+Math.round(seconds*1000));
}
try{
 worker=new Worker(ENGINE_PATH);worker.onerror=()=>{$('status').textContent='Engine failed';ready=false;search=null;$('analyse').disabled=true;};
 worker.onmessage=e=>{for(const line of String(e.data).split(/\r?\n/)){
 if(line==='uciok')worker.postMessage('isready');
 if(line==='readyok'){ready=true;$('analyse').disabled=false;if(!game.isGameOver())$('status').textContent='Engine ready';start();}
 if(search&&!search.cancelled&&search.fen===game.fen()&&line.startsWith('info ')){
 const pv=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/),score=line.match(/\bscore (cp|mate) (-?\d+)/),rank=line.match(/\bmultipv (\d+)/);
 if(pv&&score&&!/\b(?:lowerbound|upperbound)\b/.test(line)){candidates.set(Number(rank?.[1]||1),pv[1]);overlay();if(Number(rank?.[1]||1)===1){best=pv[1];overlay();const n=Number(score[2]),sign=game.turn()==='w'?1:-1;evaluation(sign*(score[1]==='mate'?(n>=0?10000:-10000):n));if(score[1]==='mate')$('evaluation').textContent='White evaluation: mate '+(sign*n); }lines.set(Number(rank?.[1]||1),san(pv[1])+' · '+formatScore(score[1],Number(score[2]),game.turn()));$('results').textContent=[...lines].sort((a,b)=>a[0]-b[0]).map(([i,v])=>i+'. '+v).join('\n');}
 }
 if(line.startsWith('bestmove ')&&search){const old=search;search=null;const m=line.split(' ')[1];
 if(!old.cancelled&&old.fen===game.fen()){$('status').textContent='Best move: '+san(m);
 if(old.play&&aiTurn()&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)){try{const moved=game.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]||'q'});playSound(!!moved.captured);changed();}catch{$('mode').value='human';$('status').textContent='Engine move rejected';}}}
 start();}
 }};
 worker.postMessage('uci');
}catch(e){$('status').textContent=e.message;}
$('undo').onclick=()=>{if(liveGame)return;$('mode').value='human';game.undo();changed();};
$('reset').onclick=()=>{liveGame=null;$('mode').value='human';game.reset();changed();};
$('flip').onclick=()=>{flipped=!flipped;draw();saveSettings();};
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
function cancelReview(){reviewToken++;if(reviewWorker){reviewWorker.terminate();reviewWorker=null;}reviewRows=[];$('ratings').replaceChildren();$('reviewSummary').replaceChildren();$('accuracy').textContent='';$('graph').replaceChildren();$('reviewState').textContent='';}
function showReview(rows){$('ratings').replaceChildren();const ns='http://www.w3.org/2000/svg',svg=$('graph');svg.replaceChildren();const line=document.createElementNS(ns,'polyline');line.setAttribute('points',rows.map((r,i)=>((i+1)*300/Math.max(1,rows.length))+','+(50-45*Math.tanh(r.after/400))).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#8cdbab');line.setAttribute('stroke-width','2');svg.append(line);const baseline=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:0,x2:300,y1:50,y2:50,stroke:'#788391','stroke-dasharray':'3 3'}))baseline.setAttribute(k,v);svg.prepend(baseline);$('reviewSummary').replaceChildren();for(const rating of ['Great','Best','Excellent','Good','Inaccuracy','Mistake','Blunder']){const el=document.createElement('span');el.textContent=rating+': '+rows.filter(r=>r.rating===rating).length;$('reviewSummary').append(el);}
 for(const [i,r] of rows.entries()){const b=document.createElement('button');b.textContent=r.number+(r.color==='w'?'. ':'... ')+r.san+' · '+r.rating+' · '+r.loss+' cp';b.dataset.rating=r.rating;b.onclick=()=>navigate(i+1);$('ratings').append(b);}
 const avg=c=>{const a=rows.filter(r=>r.color===c);return a.length?(a.reduce((n,r)=>n+100*Math.exp(-r.loss/200),0)/a.length).toFixed(1)+'%':'—';};$('accuracy').textContent='Estimated accuracy: White '+avg('w')+' · Black '+avg('b');}
$('review').onclick=()=>{
 $('mode').value='human';request(false);const moves=source().history({verbose:true});cancelReview();if(!moves.length){$('reviewState').textContent='Play some moves first';return;}
 const token=reviewToken,positions=[moves[0].before,...moves.map(m=>m.after)],scores=[];let index=0,last=null,engineBest=null,reviewScores=new Map();
 $('reviewState').textContent='Reviewing 0 / '+positions.length;
 try{reviewWorker=new Worker(ENGINE_PATH);}catch(e){$('reviewState').textContent=e.message;return;}
 const w=reviewWorker;
 function finish(){w.terminate();reviewWorker=null;showReview(reviewRows);$('reviewState').textContent='Review complete · depth 12 / 1 second per position';}
 function next(){if(index>=positions.length){finish();return;}const p=new Chess(positions[index]);if(p.isGameOver()){scores.push({cp:p.isCheckmate()?(p.turn()==='w'?-10000:10000):0,best:null});advance();return;}last=null;engineBest=null;reviewScores.clear();w.postMessage('position fen '+positions[index]);w.postMessage('go depth 12 movetime 1000');}
 function advance(){if(index>0){const m=moves[index-1],before=scores[index-1],after=scores[index],loss=Math.max(0,Math.round((before.cp-after.cp)*(m.color==='w'?1:-1))),uci=m.from+m.to+(m.promotion||'');reviewRows.push({number:Number(m.before.split(' ')[5]),san:m.san,color:m.color,after:after.cp,loss,rating:uci===before.best?(before.gap>=150&&loss<=30&&new Chess(m.before).moves().length>1&&Math.abs(before.cp)<1000?'Great':'Best'):loss<=20?'Excellent':loss<=60?'Good':loss<=120?'Inaccuracy':loss<=250?'Mistake':'Blunder'});}index++;$('reviewState').textContent='Reviewing '+index+' / '+positions.length;next();}
 w.onerror=()=>{if(token===reviewToken){w.terminate();reviewWorker=null;$('reviewState').textContent='Review engine failed';}};
 w.onmessage=e=>{if(token!==reviewToken)return;for(const l of String(e.data).split(/\r?\n/)){if(l==='uciok'){w.postMessage('setoption name Skill Level value 20');w.postMessage('setoption name MultiPV value 2');w.postMessage('isready');}else if(l==='readyok')next();else if(l.startsWith('info ')){const sc=l.match(/\bscore (cp|mate) (-?\d+)/),pv=l.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/);if(sc&&pv&&!/\b(?:lowerbound|upperbound)\b/.test(l)){const n=Number(sc[2]);const rank=Number(l.match(/\bmultipv (\d+)/)?.[1]||1),depth=Number(l.match(/\bdepth (\d+)/)?.[1]||0),cp=(positions[index].split(' ')[1]==='w'?1:-1)*(sc[1]==='mate'?(n>=0?10000:-10000):n);reviewScores.set(rank,{cp,depth});if(rank===1){last=cp;engineBest=pv[1];}}}else if(l.startsWith('bestmove ')){if(last===null){w.terminate();reviewWorker=null;$('reviewState').textContent='Review incomplete: no evaluation';return;}const a=reviewScores.get(1),b=reviewScores.get(2);scores.push({cp:last,best:engineBest,gap:a&&b&&a.depth===b.depth?Math.abs(a.cp-b.cp):0});advance();}}};w.postMessage('uci');
};
function formatScore(type,n,turn){const v=n*(turn==='w'?1:-1);return type==='mate'?'Mate '+(v>0?'+':'')+v:(v>=0?'+':'')+(v/100).toFixed(2);}
const openings=[
['e4','King’s Pawn Opening'],['d4','Queen’s Pawn Opening'],['c4','English Opening'],['Nf3','Réti Opening'],['e4 e5','Open Game'],['e4 c5','Sicilian Defence'],['e4 e6','French Defence'],['e4 c6','Caro-Kann Defence'],['e4 d5','Scandinavian Defence'],['e4 d6','Pirc Defence'],['e4 Nf6','Alekhine Defence'],['e4 e5 Nf3 Nc6 Bb5','Ruy Lopez'],['e4 e5 Nf3 Nc6 Bc4','Italian Game'],['e4 e5 Nf3 Nc6 d4','Scotch Game'],['e4 e5 Nf3 Nf6','Petrov Defence'],['e4 e5 f4','King’s Gambit'],['d4 d5 c4','Queen’s Gambit'],['d4 d5 c4 dxc4','Queen’s Gambit Accepted'],['d4 d5 c4 e6','Queen’s Gambit Declined'],['d4 d5 c4 c6','Slav Defence'],['d4 Nf6 c4 g6','King’s Indian setup'],['d4 Nf6 c4 e6 Nc3 Bb4','Nimzo-Indian Defence'],['d4 Nf6 c4 g6 Nc3 d5','Grünfeld Defence'],['d4 d5 Bf4','London System'],['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6','Sicilian Najdorf']];
function openingAndCaptures(){const h=game.history({verbose:true}),start=h[0]?.before||game.fen(),standard=new Chess().fen(),seq=h.map(m=>m.san).join(' ');const match=start===standard?openings.filter(([p])=>seq===p||seq.startsWith(p+' ')).sort((a,b)=>b[0].length-a[0].length)[0]:null;$('opening').textContent='Opening: '+(match?.[1]||(start===standard?'Unclassified':'Custom position'));const label=(id,c)=>{const el=$(id);el.textContent=(c==='w'?'White':'Black')+' captured: ';const captures=h.filter(m=>m.color===c&&m.captured);if(!captures.length)el.append('—');for(const m of captures){const p=document.createElement('span');p.className=c==='w'?'b':'w';p.textContent=pieceGlyph(m.captured,p.className)+' ';el.append(p);}};label('capturedTop',flipped?'w':'b');label('capturedBottom',flipped?'b':'w');}
$('cancelReview').onclick=()=>{cancelReview();$('reviewState').textContent='Review cancelled';};
const settingIds=['theme','pieces','sound','arrowsOn','arrowCount','auto','time','depth','skill','preset'];
const storageKey='chessai-v2.5-game',settingsKey='chessai-v2.5-settings';
function drawReason(){return game.isStalemate()?'Stalemate':game.isInsufficientMaterial()?'Insufficient material':game.isThreefoldRepetition()?'Threefold repetition':game.isDrawByFiftyMoves()?'Fifty-move rule':'Draw';}
function gamePgn(g){const result=g.isCheckmate()?(g.turn()==='w'?'0-1':'1-0'):g.isDraw()?'1/2-1/2':'*';g.setHeader('Result',result);return g.pgn();}
function pieceGlyph(t,c){const white={k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'};return c==='w'&&$('pieces').value==='outline'?white[t]:glyph[t];}
function applyAppearance(){document.body.dataset.theme=$('theme').value;document.body.dataset.pieces=$('pieces').value;}
function saveSettings(){try{const data={flipped};for(const id of settingIds)data[id]=$(id).type==='checkbox'?$(id).checked:$(id).value;localStorage.setItem(settingsKey,JSON.stringify(data));}catch{}}
function restoreSettings(){try{const data=JSON.parse(localStorage.getItem(settingsKey)||'{}');for(const id of settingIds)if(data[id]!==undefined){if($(id).type==='checkbox')$(id).checked=!!data[id];else $(id).value=data[id];}flipped=!!data.flipped;}catch{}applyAppearance();}
function saveGame(){try{const g=source();localStorage.setItem(storageKey,JSON.stringify({pgn:gamePgn(g),fen:g.fen(),moves:g.history().length}));$('saveStatus').textContent='Game saved locally';}catch{$('saveStatus').textContent='Could not save game';}}
function restoreGame(){try{const data=JSON.parse(localStorage.getItem(storageKey)||'null');if(!data){$('saveStatus').textContent='No saved game';return false;}const next=new Chess();if(data.moves)next.loadPgn(data.pgn);else next.load(data.fen);if(next.fen()!==data.fen)throw Error('Saved position mismatch');game=next;liveGame=null;$('mode').value='human';$('saveStatus').textContent='Saved game restored';return true;}catch(e){$('saveStatus').textContent='Restore failed: '+e.message;return false;}}
let audio;function playSound(capture){if(!$('sound').checked)return;try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=capture?240:440;g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.09);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.1);}catch{}}
for(const id of settingIds)$(id).addEventListener('change',()=>{saveSettings();if(id==='theme'||id==='pieces'){applyAppearance();draw();}});
$('resume').onclick=()=>{if(restoreGame())changed();};
$('import').onclick=()=>{try{const next=new Chess();next.loadPgn($('pgn').value.trim());game=next;liveGame=null;$('mode').value='human';changed();}catch(e){$('status').textContent='Invalid PGN: '+e.message;}};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([gamePgn(source())],{type:'application/x-chess-pgn'}));const a=document.createElement('a');a.href=url;a.download='ChessAI-game.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('graph').onclick=e=>{if(!reviewRows.length)return;const rect=$('graph').getBoundingClientRect();navigate(Math.max(0,Math.min(reviewRows.length,Math.round((e.clientX-rect.left)/rect.width*reviewRows.length))));};
document.addEventListener('keydown',e=>{if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName))return;if(e.key==='ArrowLeft'){$('prev').click();e.preventDefault();}if(e.key==='ArrowRight'){$('next').click();e.preventDefault();}});
restoreSettings();restoreGame();draw();pending=$('auto').checked&&!game.isGameOver();if(game.isGameOver())request(false);start();
