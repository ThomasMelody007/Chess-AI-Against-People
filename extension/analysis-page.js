// Dedicated standalone analysis pages only; never game IDs, studies or puzzles.
(() => {
 const allowed=()=>location.origin==="https://lichess.org" && /^\/analysis\/?$/.test(location.pathname);
 if(!allowed())return;
 const panel=document.createElement("aside");
 panel.style.cssText="position:fixed;right:16px;bottom:16px;z-index:9999;background:#252a32;color:#fff;padding:14px;border:1px solid #667;border-radius:10px;width:280px;font:14px system-ui;box-shadow:0 4px 20px #0005";
 const title=document.createElement("strong");title.textContent="ChessAI · Practice review";
 const toggle=document.createElement("button");toggle.textContent="Show panel";toggle.style.cssText="display:block;margin-top:8px";
 const body=document.createElement("div");body.hidden=true;
 const info=document.createElement("p");info.textContent="Copy the complete FEN from Lichess's FEN & PGN section, then open ChessAI in your browser toolbar to analyse it.";
 const copy=document.createElement("button");copy.textContent="Copy current analysis FEN";
 const status=document.createElement("p");status.setAttribute("role","status");
 body.append(info,copy,status);panel.append(title,toggle,body);document.body.append(panel);
 toggle.onclick=()=>{body.hidden=!body.hidden;toggle.textContent=body.hidden?"Show panel":"Hide panel";};
 copy.onclick=async()=>{
  if(!allowed())return;
  const fields=[...document.querySelectorAll("input,textarea")];
  const fen=fields.map(e=>e.value.trim()).find(v=>/^(?:[prnbqkPRNBQK1-8]+\/){7}[prnbqkPRNBQK1-8]+ [wb] (?:-|K?Q?k?q?) (?:-|[a-h][36]) \d+ \d+$/.test(v));
  if(!fen){status.textContent="FEN not found. Expand FEN & PGN and try again.";return;}
  try{await navigator.clipboard.writeText(fen);status.textContent="Copied. Paste into the extension's manual FEN field.";}catch{status.textContent="Clipboard unavailable. Copy the FEN manually.";}
 };
 setInterval(()=>{if(!allowed())panel.remove();},500);
})();