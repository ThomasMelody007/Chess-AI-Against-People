const $ = id => document.getElementById(id);
const modes = {
 assistant: {heading:"AI Assistant",description:"Open Lichess analysis for permitted practice or review. Local Stockfish analysis is available through the desktop board; browser engine integration is planned.",url:"https://lichess.org/analysis",label:"Open analysis board"},
 auto: {heading:"Auto Play",description:"Start the dedicated BOT connection in the ChessAI desktop app. This preview does not start or stop the bot from the extension.",url:"https://lichess.org/",label:"Open Lichess"}
};
function select(mode) {
 if (!Object.hasOwn(modes,mode)) mode="assistant";
 const data=modes[mode];
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
 const port=Number($("port").value);
 if(!Number.isInteger(port)||port<1||port>65535){$("status").textContent="Enter the port shown in the desktop application.";return;}
 chrome.storage.local.set({port});
 chrome.tabs.create({url:"http://127.0.0.1:"+port+"/"});
 $("status").textContent="Opening local board. Start it in the desktop app first.";
});