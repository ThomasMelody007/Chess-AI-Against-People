const fs=require("node:fs"),path=require("node:path");
const root=__dirname, src=path.join(root,"node_modules","stockfish"), dist=path.join(root,"dist");
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(src);
const js=files.find(f=>/stockfish.*lite.*single.*\.js$/i.test(path.basename(f)));
if(!js)throw Error("Single-threaded lite Stockfish build not found");
const stem=path.basename(js,".js");
const wasm=files.filter(f=>path.basename(f).startsWith(stem)&&f.endsWith(".wasm"));
if(!wasm.length)throw Error("Stockfish WASM missing");
fs.mkdirSync(dist,{recursive:true});
for(const name of ["manifest.json","popup.html","popup.js","popup.css"])fs.copyFileSync(path.join(root,name),path.join(dist,name));
fs.copyFileSync(path.join(root,"node_modules","chess.js","dist","esm","chess.js"),path.join(dist,"chess.mjs"));
fs.copyFileSync(path.join(root,"node_modules","chess.js","LICENSE"),path.join(dist,"ChessJS-LICENSE"));
for(const f of [js,...wasm])fs.copyFileSync(f,path.join(dist,path.basename(f)));
fs.writeFileSync(path.join(dist,"engine-path.js"),"const ENGINE_PATH = "+JSON.stringify(path.basename(js))+";\n");
for(const f of files.filter(f=>/^(copying|license|licence)(\..*)?$/i.test(path.basename(f))))fs.copyFileSync(f,path.join(dist,"Stockfish-"+path.basename(f)));
fs.writeFileSync(path.join(dist,"ENGINE-SOURCE.txt"),"Stockfish 17.1.0, GPLv3. Distribution source: https://github.com/nmrugg/stockfish.js and https://github.com/official-stockfish/Stockfish . Package: https://www.npmjs.com/package/stockfish/v/17.1.0\n");
console.log("Load unpacked extension from "+dist);
