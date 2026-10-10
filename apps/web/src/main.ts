import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-600.css';
// The 3D board paints tile lettering and dice with these faces; they are not used by the UI chrome.
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/nunito/latin-800.css';
import './ui/tokens.css';
import './ui/components.css';
import './ui/layout.css';
import './ui/panels.css';
import './ui/effects.css';
import {BOARD,createGame,applyAction,botDecision,actionPlayer,playerById} from '../../../packages/core/index';
import type {Action,Difficulty,Game} from '../../../packages/core/types';
import {MAX_COUNTER_OFFERS,reverseTrade} from '../../../packages/core/trade-terms';
import {BoardView} from './board-view';
import {BoardMoments} from './board-moments';
import {EventFeedback} from './event-feedback';
import {MoneyLedger} from './money-ledger';
import {MatchFinale} from './match-finale';
import {GameSounds} from './game-sounds';
import {AmbientMusic} from './ambient-music';
import {loadGame,saveGame,saveSummary,readSettings,writeSettings,isReduced,systemReducedMotion,type SaveSummary,type Settings} from './storage';
import {Network,storedSession,defaultSocketUrl} from './network';
import {isNative,hapticsSupported,haptic,setHaptics,initPlatform,armBack,shareText,type HapticKind} from './platform';
import {socketUrlFromHost,hostLabel,rememberedHost,rememberHost} from './lan-address';
import {esc,icon,money,patch,avatar} from './ui/dom';
import {viewerDecision,dockModel,tradeOpen,type Decision} from './ui/turn-state';
import {hudMarkup,dockMarkup} from './ui/hud';
import {deedPreview,deedSheet,friendlyReason} from './ui/deed';
import {purchasePanel,auctionPanel,jailPanel,debtPanel,incomingTradePanel,suggestedBid} from './ui/decisions';
import {cardReveal} from './ui/card-reveal';
import {portfolioSheet,type PortfolioFilter} from './ui/portfolio';
import {tradeBuilderSheet,tradeFooter,emptyDraft,togglePick,setAmount,changePartner,tradeIssue,type TradeState,type TradeSide} from './ui/trade-builder';
import {settingsSheet,gameMenuSheet,rulesSheet,playerSheet,bankSheet} from './ui/sheets';
import {menuTop,menuPanel,setupPage,lobbyPage,connectingPage,localPlayerRow} from './ui/screens';
import {NoticeFeed} from './ui/notices';

type Route='menu'|'solo'|'host'|'join'|'lobby'|'connecting'|'game';
type Sheet={kind:'properties';filter:PortfolioFilter;raise:boolean}|{kind:'deed';index:number}|{kind:'trade'}|{kind:'player';id:string}|{kind:'bank';scope:'mine'|'table'}|{kind:'menu'}|{kind:'settings'}|{kind:'rules'};
type Dialog={title:string;body:string;confirm:string;tone:'danger'|'primary';command:string};

// ---------- Shell ----------
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<div class="shell" id="shell" data-route="menu"><header id="top"></header><main id="stage" aria-label="Game board"><div id="board"></div><div class="notice-host" id="notices" aria-live="polite"></div><div class="preview-host" id="preview"></div><div class="decision-host" id="decision"></div><div class="stage-tools" id="stage-tools"><button class="btn icon-only" data-do="camera-reset" aria-label="Reset camera">${icon('reset')}</button></div></main><footer id="bottom"></footer></div>
<div id="page" hidden></div>
<div class="layer sheet-layer" id="sheet-layer" hidden><div class="sheet-scrim" data-do="close-sheet"></div><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1"><header class="sheet-head" id="sheet-head"></header><div class="sheet-scroll" id="sheet-scroll"></div></section></div>
<div class="layer card-layer" id="card-layer" hidden></div>
<div class="layer finale-layer" id="finale-layer"></div>
<div id="handoff" hidden></div>
<div class="layer dialog-layer" id="dialog-layer" hidden></div>
<div id="toast" role="status" aria-live="polite"></div>`;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const shell=$('#shell'),top=$('#top'),stage=$('#stage'),bottom=$('#bottom'),pageEl=$('#page'),noticeHost=$('#notices'),previewHost=$('#preview'),decisionHost=$('#decision'),stageTools=$('#stage-tools');
const sheetLayer=$('#sheet-layer'),sheetEl=sheetLayer.querySelector<HTMLElement>('.sheet')!,sheetHead=$('#sheet-head'),sheetScroll=$('#sheet-scroll'),cardLayer=$('#card-layer'),finaleLayer=$('#finale-layer'),dialogLayer=$('#dialog-layer');

// ---------- State ----------
let settings:Settings=readSettings();
let route:Route='menu',mode:'solo'|'lan'='solo',game:Game|null=null;
let sheets:Sheet[]=[],dialog:Dialog|null=null,preview:number|null=null;
let minimised:string|null=null,lastDecision='',cardHidden:number|null=null;
let trade:TradeState|null=null,bidDraft:{key:string;value:number}|null=null;
let saveInfo:SaveSummary|null|undefined=undefined,formRoute:'host'|'join'='join',connectError='';
let botTimer:ReturnType<typeof setTimeout>|null=null,toastTimer:ReturnType<typeof setTimeout>|null=null;
let pendingCommand:{revision:number;timer:ReturnType<typeof setTimeout>}|null=null;
let pendingHaptic:HapticKind|null=null,paused=false,savingFailed=false,lastActive='',lastSheet='';
/** Pass and play: the human currently holding the device, and a pending hand-over to another human. */
let seat:string|null=null,handoff:string|null=null;

const reduced=()=>isReduced(settings);
const sounds=new GameSounds(settings.sound);
const music=new AmbientMusic(settings.music);
setHaptics(settings.haptics);
const feedback=new EventFeedback(stage,reduced(),property=>board?.projectSpace(property)??null);
const moments=new BoardMoments(stage,property=>board?.projectSpace(property)??null,reduced);
const moneyLedger=new MoneyLedger(top,reduced);
const finale=new MatchFinale(finaleLayer,reduced);
const notices=new NoticeFeed(noticeHost);

function toast(message:string){const el=$('#toast');el.textContent=message;el.classList.add('show');if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3600);}

let board:BoardView|null=null;
try{board=new BoardView($('#board'),selectSpace,settings);}catch{$('#board').innerHTML='<div class="context-error">This device could not start 3D graphics. You can still play with the property list and the controls below.</div>';}
if(board){
 board.onFrame=()=>{feedback.reposition();moments.reposition();};
 board.onStep=()=>sounds.play('step');
 board.onSettled=()=>{sounds.settle();feedback.settle();moments.settle();moneyLedger.settle();notices.setMoving(false);flushHaptic();if(route==='game'){render();scheduleBot();}};
}
const demo=createGame({players:['You','Milo','Cleo','Jasper'].map((name,i)=>({id:`demo-${i}`,name,bot:true,token:i}))},25);
demo.players.forEach((p,i)=>p.position=[0,14,25,36][i]);[1,3,6,8,11,13,16,19,23,27,32,39].forEach((i,n)=>{demo.properties[i].owner=demo.players[n%4].id;});[6,11,16,23,32].forEach(i=>demo.properties[i].level=2);
board?.update(demo,false);

// ---------- Network ----------
const network=new Network(()=>{
 if(mode!=='lan')return;
 if(pendingCommand&&(!network.game||network.game.revision!==pendingCommand.revision))clearPending();
 if(network.game){
  const changed=game!==network.game;game=network.game;
  if(route!=='game'){route='game';resetMatchUi();updateBoard(false);render();board?.reset();return;}
  else if(changed)updateBoard(true);
 }else if(network.room&&(route==='connecting'||route==='lobby'))route='lobby';
 render();
},message=>{
 clearPending();
 if(route==='connecting'&&!network.session){network.stop();connectError=message;route=formRoute;render();}
 toast(message);
},url=>{
 if(route==='connecting'||route==='lobby'){connectError=`Could not reach the host at ${hostLabel(url)}. Check that it is running and that this device is on the same Wi-Fi.`;route=formRoute;mode='lan';render();toast('Host not reachable');}
});
function networkReady(){return mode==='solo'||network.connected;}
function clearPending(){if(pendingCommand){clearTimeout(pendingCommand.timer);pendingCommand=null;}}

// ---------- Rules access ----------
function hotseat(){return mode==='solo'&&!!game&&game.players.filter(p=>!p.bot).length>1;}
function viewer():string|null{if(!game)return null;if(mode==='lan')return network.session?.playerId??null;return hotseat()&&seat?seat:game.players.find(p=>!p.bot)?.id??null;}
/** The device follows whichever human must act; a hand-over screen appears unless bids are going round an auction. */
function syncSeat(){
 if(!game||!hotseat())return;
 const actor=actionPlayer(game),player=actor?game.players.find(p=>p.id===actor):null;
 if(!seat){seat=player&&!player.bot?player.id:game.players.find(p=>!p.bot&&!p.bankrupt)?.id??null;handoff=seat;}
 else if(player&&!player.bot&&player.id!==seat){seat=player.id;if(game.phase!=='auction')handoff=player.id;}
}
/** Null when the viewer may perform the action now; otherwise a reason (usually the engine's own message). */
function check(action:Action):string|null{
 const id=viewer();if(!game||!id)return'Unavailable';
 if(handoff)return'Pass the device first';
 if(board?.isAnimating)return'Wait for the pawn to arrive';
 if(!networkReady())return'Reconnecting to the host';
 if(pendingCommand)return'Sending…';
 try{applyAction(game,id,action);return null;}catch(error){return error instanceof Error?error.message:'Unavailable';}
}
function perform(action:Action){
 const id=viewer(),reason=check(action);if(!game||!id)return;
 if(reason){toast(friendlyReason(reason));return;}
 if(action.type==='bid'||action.type==='pass')bidDraft=null;
 if(mode==='lan'){pendingCommand={revision:game.revision,timer:setTimeout(()=>{pendingCommand=null;render();},6000)};network.action(action);render();return;}
 game=applyAction(game,id,action);afterLocalChange();
}
function afterLocalChange(){updateBoard(true);soloSave();render();scheduleBot();}
function canTrade(){const me=viewer();return !!game&&!!me&&tradeOpen(game,me)&&networkReady()&&!board?.isAnimating&&!pendingCommand;}
function canCounter(){const me=viewer();return !!game?.trade&&game.phase==='trade'&&game.trade.to===me&&(game.trade.round??0)<MAX_COUNTER_OFFERS&&networkReady()&&!board?.isAnimating;}

function scheduleBot(){
 if(botTimer)clearTimeout(botTimer);botTimer=null;
 if(mode!=='solo'||route!=='game'||!game||board?.isAnimating||paused)return;
 const decision=botDecision(game);if(!decision)return;
 const delay=game.phase==='card'?(settings.speed==='fast'?4000:9000):settings.speed==='fast'?240:reduced()?350:900;
 botTimer=setTimeout(()=>{botTimer=null;if(!game||mode!=='solo')return;try{game=applyAction(game,decision.playerId,decision.action);}catch(error){toast(error instanceof Error?error.message:'A computer player could not continue');return;}afterLocalChange();},delay);
}
function continueObserverCard(){
 const pending=game?.pendingCard;if(!game||!pending||board?.isAnimating)return;
 const drawer=game.players.find(p=>p.id===pending.player);if(!drawer?.bot)return;
 if(mode==='lan'){if(network.connected)network.send({type:'CONTINUE_BOT_CARD',event:pending.event});return;}
 if(botTimer)clearTimeout(botTimer);botTimer=null;game=applyAction(game,pending.player,{type:'resolveCard'});afterLocalChange();
}

function soloSave(manual=false){
 if(!game||mode!=='solo')return;
 void saveGame(game).then(()=>{savingFailed=false;if(manual)toast('Game saved on this device.');}).catch(()=>{if(!savingFailed||manual)toast('Could not save. Check storage space and permissions.');savingFailed=true;});
}
function refreshSaveInfo(){saveInfo=undefined;void saveSummary().then(info=>{saveInfo=info;if(route==='menu')render();});}

// ---------- Board and feedback ----------
function viewerHaptic(before:Game,after:Game,id:string):HapticKind|null{
 const was=before.players.find(p=>p.id===id),now=after.players.find(p=>p.id===id);if(!was||!now)return null;
 if(now.bankrupt&&!was.bankrupt)return'error';
 if(after.winner===id&&before.winner!==id)return'success';
 if(now.jailed&&!was.jailed)return'warning';
 if(after.properties.filter(p=>p.owner===id).length>before.properties.filter(p=>p.owner===id).length)return'success';
 const fresh=after.log.filter(entry=>entry.id>before.eventSeq);
 if(fresh.some(entry=>entry.payment?.from===id&&entry.payment.property!==undefined))return'warning';
 if(fresh.some(entry=>entry.kind==='roll')&&before.players[before.current].id===id)return'medium';
 return null;
}
let observed:Game|null=null;
function updateBoard(animate=true){
 if(!game)return;syncSeat();const me=viewer(),before=observed;observed=game;
 board?.setViewer(me,settings.highlightMine);board?.update(game,animate);
 const moving=!!board?.isAnimating;
 sounds.observe(game,moving,animate);moneyLedger.observe(game,moving,animate);
 if(me){feedback.observe(game,me,moving,animate);moments.observe(game,reduced()?'':me,moving,animate);notices.update(game,me,moving,animate);if(animate&&before){const cue=viewerHaptic(before,game,me);if(cue){pendingHaptic=cue;if(!moving)flushHaptic();}}}
}
function flushHaptic(){if(pendingHaptic){haptic(pendingHaptic);pendingHaptic=null;}}

function selectSpace(index:number){
 if(route!=='game'||!game)return;
 if(index<0||!BOARD[index]){preview=null;board?.select(-1);render();return;}
 board?.select(index);
 const decision=viewerDecision(game,viewer());
 if(decision&&minimised!==decision.key&&!board?.isAnimating){openSheet({kind:'deed',index});return;}
 preview=index;render();
}

// ---------- Overlays ----------
function openSheet(sheet:Sheet,replace=false){if(replace)sheets=[];preview=null;sheets.push(sheet);render();sheetEl.focus({preventScroll:true});}
function closeSheets(){sheets=[];trade=null;render();}
function closeTopSheet(){sheets.pop();if(!sheets.some(s=>s.kind==='trade'))trade=null;render();}
function confirm(next:Dialog){dialog=next;render();dialogLayer.querySelector<HTMLButtonElement>('[data-dialog-cancel]')?.focus();}
function resetMatchUi(){seat=null;handoff=null;sheets=[];dialog=null;preview=null;minimised=null;lastDecision='';cardHidden=null;trade=null;bidDraft=null;observed=null;pendingHaptic=null;clearPending();notices.reset();feedback.reset();moments.reset();moneyLedger.reset();finale.reset();sounds.reset();board?.select(-1);}

/** System Back: dialog → sheet → finale → preview → card → decision panel → game menu. */
function back():boolean{
 if(dialog){dialog=null;render();return true;}
 if(handoff){handoff=null;render();return true;}
 if(sheets.length){closeTopSheet();return true;}
 if(route==='game'&&game){
  if(finale.visible){finale.dismiss();render();return true;}
  if(preview!==null){preview=null;board?.select(-1);render();return true;}
  const card=game.pendingCard;if(card&&cardHidden!==card.event&&!board?.isAnimating){cardHidden=card.event;render();return true;}
  const decision=viewerDecision(game,viewer());if(decision&&minimised!==decision.key&&!board?.isAnimating){minimised=decision.key;render();return true;}
  openSheet({kind:'menu'});return true;
 }
 if(route==='lobby'){confirm({title:'Leave this room?',body:'<p>You will give up your seat in the lobby. You can join again with the room code.</p>',confirm:'Leave room',tone:'danger',command:'leave-room'});return true;}
 if(route==='connecting'){cancelConnect();return true;}
 if(route!=='menu'){nav('menu');return true;}
 return false;
}

// ---------- Rendering ----------
function render(){
 const root=document.documentElement;root.classList.toggle('reduced-motion',reduced());root.dataset.textSize=settings.textSize;
 shell.dataset.route=route==='game'?'game':route==='menu'?'menu':'page';
 if(route==='game')syncSeat();
 if(route==='menu')renderMenu();else if(route==='game'&&game)renderGame();else renderPage();
 renderSheet();renderDialog();renderHandoff();
 // Draw the board only where it can be seen: not behind full-screen pages or a full-height sheet on a phone.
 const covered=sheets.length>0&&sheetEl.classList.contains('tall')&&innerWidth<900;
 board?.setActive((route==='menu'||route==='game'&&!!game)&&!covered);
 armBack(route!=='menu'||sheets.length>0||!!dialog);
}
function clearStage(){patch(previewHost,'');patch(decisionHost,'');cardLayer.hidden=true;patch(cardLayer,'');stageTools.hidden=true;notices.reset();}
function renderMenu(){
 pageEl.hidden=true;patch(pageEl,'');board?.setIdle(true);clearStage();
 const session=storedSession();
 patch(top,menuTop());patch(bottom,menuPanel({save:saveInfo,session:session?{code:session.code,host:hostLabel(session.url)}:null,native:isNative}));
}
function renderPage(){
 board?.setIdle(false);clearStage();pageEl.hidden=false;
 if(route==='lobby'&&network.room){
  // Room updates re-render the lobby; keep the host's unsent opponent changes.
  const form=pageEl.querySelector<HTMLFormElement>('#room-config'),edits=form?.dataset.dirty?{bots:form.querySelector<HTMLInputElement>('[name="bots"]')?.value,difficulty:new FormData(form).get('difficulty')}:null;
  if(patch(pageEl,lobbyPage({room:network.room,me:network.session?.playerId,hostLabel:hostLabel(network.session?.url??''),native:isNative}))&&edits){
   const next=pageEl.querySelector<HTMLFormElement>('#room-config');
   if(next){next.dataset.dirty='1';const bots=next.querySelector<HTMLInputElement>('[name="bots"]');if(bots&&edits.bots)bots.value=edits.bots;next.querySelector<HTMLInputElement>(`[name="difficulty"][value="${edits.difficulty}"]`)?.click();}
  }
 }
 else if(route==='connecting')patch(pageEl,connectingPage('Connecting to the host…','Make sure the host is running and that this device is on the same network.'));
 else if(route==='solo'||route==='host'||route==='join'){
  const player=storedPlayer();
  const html=setupPage({kind:route,name:player.name,token:player.token,host:rememberedHost(),native:isNative,room:new URLSearchParams(location.search).get('room')??''});
  if(patch(pageEl,html))updateSetupSummary();
  const error=pageEl.querySelector<HTMLElement>('[data-connect-error]');
  if(connectError&&!error)pageEl.querySelector('.page-body')?.insertAdjacentHTML('afterbegin',`<p class="banner warn" data-connect-error>${icon('warning')}<span>${esc(connectError)}</span></p>`);
 }
}
function decisionMarkup(decision:Decision,me:string){
 const g=game!;
 switch(decision.kind){
  case'purchase':return purchasePanel(g,me,check);
  case'auction':return auctionPanel(g,me,check,bidDraft?.key===decision.key?bidDraft.value:null);
  case'jail':return jailPanel(g,me,check);
  case'debt':return debtPanel(g,me,check,canTrade());
  case'trade':return incomingTradePanel(g,me,check,canCounter());
 }
}
function renderGame(){
 pageEl.hidden=true;patch(pageEl,'');board?.setIdle(false);
 const g=game!,me=viewer(),moving=!!board?.isAnimating,decision=viewerDecision(g,me);
 if(decision&&decision.key!==lastDecision){
  lastDecision=decision.key;minimised=null;
  if(decision.mine){preview=null;sheets=sheets.filter(s=>s.kind==='deed'&&decision.kind==='purchase'&&s.index===g.pendingProperty);if(!sheets.length)trade=null;}
  if(decision.kind==='purchase')board?.select(g.pendingProperty!);
 }else if(!decision)lastDecision='';
 const panelOpen=!!decision&&minimised!==decision.key&&!moving&&!!me;
 const card=g.pendingCard??null,cardOpen=!!card&&cardHidden!==card.event&&!moving;
 const offline=new Set((mode==='lan'?network.room?.members.filter(m=>!m.bot&&!m.connected).map(m=>m.id):[])??[]);
 patch(top,hudMarkup(g,{viewer:me,lan:mode==='lan',room:network.room?.code,online:networkReady(),offline,hotseat:hotseat()}));
 moneyLedger.refresh(top);
 const active=g.players[g.current].id;if(active!==lastActive){lastActive=active;top.querySelector('.chip-player.active')?.scrollIntoView?.({block:'nearest',inline:'center',behavior:reduced()?'auto':'smooth'});}
 const model=dockModel(g,{viewer:me,moving,online:networkReady(),panelOpen,cardOpen:cardOpen,hotseat:hotseat(),allowed:action=>!check(action)});
 patch(bottom,dockMarkup(g,model,{canTrade:canTrade(),incoming:g.phase==='trade'&&g.trade?.to===me,compact:panelOpen||(cardOpen&&card?.player===me)}));
 if(pendingCommand)bottom.querySelector('.dock-primary')?.classList.add('is-busy');
 patch(decisionHost,panelOpen&&decision&&me?decisionMarkup(decision,me):'');
 if(pendingCommand)decisionHost.querySelectorAll('[data-action]').forEach(button=>(button as HTMLButtonElement).disabled=true);
 patch(previewHost,preview!==null&&!panelOpen?deedPreview(g,preview,me):'');
 stageTools.hidden=panelOpen||preview!==null;
 if(cardOpen&&card){
  const mine=card.player===me,drawer=g.players.find(p=>p.id===card.player);
  cardLayer.hidden=false;cardLayer.className=`layer card-layer ${mine?'modal':'observer'}`;
  if(patch(cardLayer,cardReveal(g,{viewer:me,canResolve:!check({type:'resolveCard'}),canContinueBot:!!drawer?.bot&&networkReady(),reduced:reduced()}))&&mine)cardLayer.querySelector<HTMLButtonElement>('[data-action]')?.focus({preventScroll:true});
 }else{cardLayer.hidden=true;patch(cardLayer,'');}
 if(me){finale.update(g,me);}
 stage.setAttribute('aria-busy',String(moving));
}
const SHEET_TITLES:Record<Sheet['kind'],string>={properties:'Properties',deed:'Title deed',trade:'New trade',player:'Player',bank:'Bank and history',menu:'Game menu',settings:'Settings',rules:'How to play'};
function renderSheet(){
 const sheet=sheets.at(-1);
 if(!sheet){sheetLayer.hidden=true;lastSheet='';patch(sheetHead,'');patch(sheetScroll,'');return;}
 const g=game,me=viewer();let body='';let title=SHEET_TITLES[sheet.kind];
 switch(sheet.kind){
  case'properties':body=g?portfolioSheet(g,{viewer:me,filter:sheet.filter,raise:sheet.raise,check}):'';break;
  case'deed':body=g?`<div class="sheet-body">${deedSheet(g,sheet.index,{viewer:me,check,canTrade:canTrade()})}</div>`:'';break;
  case'trade':if(g&&me&&trade){body=tradeBuilderSheet(g,me,trade);title=trade.step==='review'?'Review offer':trade.draft.type==='counterTrade'?'Counteroffer':'New trade';}break;
  case'player':body=g?playerSheet(g,sheet.id,me,{canTrade:canTrade(),connected:mode==='lan'?network.room?.members.find(m=>m.id===sheet.id)?.connected:undefined}):'';break;
  case'bank':body=g?bankSheet(g,me,sheet.scope):'';break;
  case'menu':body=g?gameMenuSheet(g,{lan:mode==='lan',room:network.room?.code,turnLimit:g.config.turnLimit}):'';break;
  case'settings':body=settingsSheet(settings,{hapticsSupported,systemReducedMotion:systemReducedMotion(),inMatch:route==='game',native:isNative});break;
  case'rules':body=rulesSheet(g);break;
 }
 if(!body&&sheet.kind!=='settings'&&sheet.kind!=='rules'){sheets.pop();renderSheet();return;}
 sheetLayer.hidden=false;
 sheetEl.classList.toggle('tall',['properties','trade','rules','bank','player'].includes(sheet.kind));
 patch(sheetHead,`${sheets.length>1?`<button class="btn icon-only quiet" data-do="close-sheet" aria-label="Back">${icon('back')}</button>`:''}<h2 id="sheet-title">${esc(title)}</h2><button class="btn icon-only quiet" data-do="close-all-sheets" aria-label="Close">${icon('close')}</button>`);
 const key=sheet.kind==='deed'?`deed:${sheet.index}`:sheet.kind==='player'?`player:${sheet.id}`:sheet.kind;if(key!==lastSheet){lastSheet=key;sheetScroll.scrollTop=0;}
 if(patch(sheetScroll,body)&&sheet.kind==='trade')sheetScroll.querySelector<HTMLInputElement>('[data-focus-key]')?.blur();
}
function renderHandoff(){
 const el=$('#handoff'),player=handoff&&game?game.players.find(p=>p.id===handoff):null;
 if(!player||route!=='game'||!game){el.hidden=true;patch(el,'');return;}
 const reason=game.phase==='trade'?`${esc(player.name)} has a trade offer to answer.`:game.phase==='debt'?`${esc(player.name)} needs to raise funds.`:`It is ${esc(player.name)}’s turn.`;
 el.hidden=false;el.className='handoff';
 patch(el,`<div class="handoff-card" role="dialog" aria-modal="true" aria-labelledby="handoff-title">${avatar(game,player,'lg')}<h2 id="handoff-title">Pass the device to ${esc(player.name)}</h2><p>${reason}</p><button class="btn block" data-do="take-seat" data-haptic="light">I’m ${esc(player.name)} · continue</button></div>`);
}
function renderDialog(){
 if(!dialog){dialogLayer.hidden=true;patch(dialogLayer,'');return;}
 dialogLayer.hidden=false;
 patch(dialogLayer,`<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">${esc(dialog.title)}</h2>${dialog.body}<div class="dialog-actions"><button class="btn secondary" data-dialog-cancel data-do="close-dialog">Cancel</button><button class="btn ${dialog.tone}" data-do="${dialog.command}" data-haptic="${dialog.tone==='danger'?'warning':'light'}">${esc(dialog.confirm)}</button></div></div>`);
}

// ---------- Navigation ----------
function nav(next:Route){
 if(next===route&&next!=='menu')return;
 if(route==='game'&&game&&mode==='solo')soloSave();
 if(botTimer)clearTimeout(botTimer);botTimer=null;
 if(mode==='lan'&&(next==='menu'||route==='game')){network.stop();mode='solo';}
 if(route==='game'||next==='menu'){game=null;lastActive='';resetMatchUi();board?.update(demo,false);}
 connectError='';route=next;sheets=sheets.filter(s=>s.kind==='settings'||s.kind==='rules');dialog=null;
 if(next==='menu')refreshSaveInfo();
 render();
 if(next==='menu')board?.reset();
}
function startSolo(next:Game){network.stop();mode='solo';game=next;route='game';resetMatchUi();updateBoard(false);render();board?.reset();soloSave();scheduleBot();}
async function continueSolo(backup=false){
 try{const saved=await loadGame(backup);if(!saved){toast(backup?'There is no earlier save to restore.':'No saved game yet. Start a new one.');return;}sheets=[];startSolo(saved);if(backup)toast('Previous save restored.');}
 catch(error){toast(error instanceof Error?error.message:'Could not load the save');}
}
function connect(url:string,message:unknown,from:'host'|'join'){formRoute=from;connectError='';mode='lan';route='connecting';render();network.connect(url,message);}
function cancelConnect(){network.stop();mode='solo';route=formRoute;render();}
function leaveMatch(){dialog=null;if(mode==='lan'){network.stop();mode='solo';}nav('menu');}

// ---------- Setup forms ----------
function storedPlayer(){try{const v=JSON.parse(localStorage.getItem('empire-player')||'null');return{name:typeof v?.name==='string'&&v.name.trim()?v.name:'Player',token:Number.isInteger(v?.token)&&v.token>=0&&v.token<8?v.token:0};}catch{return{name:'Player',token:0};}}
function rememberPlayer(name:string,token:number){try{localStorage.setItem('empire-player',JSON.stringify({name,token}));}catch{/* optional */}}
function updateSetupSummary(){
 const form=pageEl.querySelector<HTMLFormElement>('#setup-form');if(!form)return;
 const data=new FormData(form),kind=form.dataset.kind,bots=Number(data.get('bots')||0),difficulty=String(data.get('difficulty')??'medium'),cash=Number(data.get('cash')||1500),length=Number(data.get('length')||0);
 const lengthName=length===80?'Quick':length===160?'Extended':'Classic';
 const note=pageEl.querySelector('[data-length-note]');if(note)note.textContent=length?`${lengthName}: ends after ${length} turns; the highest net worth wins.`:'Classic: play until one player remains.';
 const summary=pageEl.querySelector('[data-setup-summary]');if(!summary)return;
 const locals=data.getAll('localName').length,people=locals?`${locals+1} players on this device`:'You';
 summary.textContent=kind==='join'?'You will join the host’s room with this name and token.':kind==='host'?`You host with ${bots} ${difficulty} bot${bots===1?'':'s'} · ${money(cash)} · ${lengthName}`:`${people}${bots?` and ${bots} ${difficulty} bot${bots===1?'':'s'}`:''} · ${money(cash)} · ${lengthName}`;
}
function submitSetup(form:HTMLFormElement){
 const data=new FormData(form),kind=form.dataset.kind as 'solo'|'host'|'join',name=String(data.get('name')??'').trim(),token=Number(data.get('token')??0);
 const fail=(message:string,field?:string)=>{toast(message);if(field)form.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();};
 if(!name)return fail('Enter your name','name');
 rememberPlayer(name,token);
 const botCount=Math.max(0,Math.min(7,Number(data.get('bots')||0))),difficulty=String(data.get('difficulty')??'medium') as Difficulty;
 const config={startingCash:Number(data.get('cash')||1500),turnLimit:Number(data.get('length')||0),jackpot:data.has('jackpot')};
 if(kind==='solo'){
  const names=data.getAll('localName').map(v=>String(v).trim()),tokens=data.getAll('localToken').map(Number);
  if(names.some(n=>!n))return fail('Give every player on this device a name');
  const humans=[{id:'human',name,bot:false,token},...names.map((n,i)=>({id:`human-${i+2}`,name:n,bot:false,token:tokens[i]}))];
  if(new Set(humans.map(h=>h.token)).size!==humans.length)return fail('Each player needs a different token');
  if(new Set(humans.map(h=>h.name.toLowerCase())).size!==humans.length)return fail('Each player needs a different name');
  if(humans.length+botCount<2)return fail('Add a bot or another player on this device','bots');
  if(humans.length+botCount>8)return fail('A game has at most eight players','bots');
  const free=[0,1,2,3,4,5,6,7].filter(i=>!humans.some(h=>h.token===i)),botNames=['Milo','Cleo','Jasper','Nova','Otis','Ivy','Theo'].filter(n=>!humans.some(h=>h.name.toLowerCase()===n.toLowerCase()));
  startSolo(createGame({players:[...humans,...Array.from({length:botCount},(_,i)=>({id:`bot-${i}`,name:botNames[i],bot:true,difficulty,token:free[i]}))],...config},crypto.getRandomValues(new Uint32Array(1))[0]));
  return;
 }
 let url:string;const server=String(data.get('server')??'').trim();
 try{url=server?socketUrlFromHost(server):isNative?socketUrlFromHost(''):defaultSocketUrl();}catch(error){return fail(error instanceof Error?error.message:'Check the host address','server');}
 if(server)rememberHost(server);
 if(kind==='host')connect(url,{type:'CREATE',name,token,botCount,difficulty,config},'host');
 else{const code=String(data.get('code')??'').trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code))return fail('Enter the 6-character room code','code');connect(url,{type:'JOIN',name,token,code},'join');}
}

// ---------- Settings ----------
function applySettings(next:Settings){
 settings=next;writeSettings(settings);sounds.setEnabled(settings.sound);music.setEnabled(settings.music);setHaptics(settings.haptics);
 feedback.configure(reduced());moments.configure();moneyLedger.configure();board?.configure(settings);board?.setViewer(viewer(),settings.highlightMine);
 if(!board?.isAnimating){sounds.settle();feedback.settle();moments.settle();moneyLedger.settle();}
 render();scheduleBot();
}

// ---------- Trade builder ----------
function openTrade(partner?:string,draft?:TradeState['draft']){
 if(!game)return;const me=viewer();
 if(!me||!(draft?.type==='counterTrade'?canCounter():canTrade())){toast(game.tradeOffered?'You have already made a trade offer this turn.':'You can propose a trade during your turn.');return;}
 const others=game.players.filter(p=>p.id!==me&&!p.bankrupt);const to=draft?.to??partner??others[0]?.id;if(!to)return;
 // Open on the side the draft already uses; a request for someone else's deed starts on "You receive".
 const givesNothing=!!draft&&!draft.give.length&&!draft.giveCash&&!draft.giveCards;
 trade={draft:draft??emptyDraft(to),side:givesNothing&&(draft!.receive.length||draft!.receiveCash)?'receive':'give',step:'build'};
 sheets=sheets.filter(s=>s.kind!=='trade');openSheet({kind:'trade'});
}
function refreshTradeFooter(){if(!game||!trade)return;const me=viewer();const footer=sheetScroll.querySelector<HTMLElement>('.trade-footer');if(me&&footer)footer.innerHTML=tradeFooter(game,me,trade.draft);}

// ---------- Events ----------
document.addEventListener('click',event=>{
 const target=event.target as HTMLElement,button=target.closest<HTMLElement>('button,[data-do]');
 if(!button||(button as HTMLButtonElement).disabled)return;
 if(button.dataset.haptic)haptic(button.dataset.haptic as HapticKind);
 const d=button.dataset;
 if(d.nav){nav(d.nav as Route);return;}
 if(d.action){perform(JSON.parse(d.action) as Action);return;}
 if(d.player&&game){openSheet({kind:'player',id:d.player},sheets.length>0&&sheets.at(-1)?.kind==='player');return;}
 if(d.filter){const sheet=sheets.at(-1);if(sheet?.kind==='properties'){sheet.filter=d.filter as PortfolioFilter;render();}return;}
 if(d.history){const sheet=sheets.at(-1);if(sheet?.kind==='bank'){sheet.scope=d.history as 'mine'|'table';render();}return;}
 if(d.tradeFor&&game){const index=Number(d.tradeFor),owner=game.properties[index].owner;if(owner){const draft=emptyDraft(owner);draft.receive=[index];openTrade(owner,draft);}return;}
 if(d.setting){const key=d.setting as keyof Settings;if(d.value!==undefined)applySettings({...settings,[key]:d.value} as Settings);return;}
 if(trade&&game&&viewer()){
  const me=viewer()!;
  if(d.partner&&!d.do){trade={...trade,draft:changePartner(trade.draft,d.partner)};render();return;}
  if(d.tradeSide){trade={...trade,side:d.tradeSide as TradeSide};render();return;}
  if(d.pick){trade={...trade,draft:togglePick(trade.draft,trade.side,Number(d.pick))};render();return;}
  if(d.stepField){const field=d.stepField as 'giveCash'|'receiveCash'|'giveCards'|'receiveCards';const value=d.set!==undefined?Number(d.set):trade.draft[field]+Number(d.step);trade={...trade,draft:setAmount(game,me,trade.draft,field,value)};render();return;}
 }
 if(d.bidStep||d.bidAdd){
  const g=game,me=viewer(),decision=g&&me?viewerDecision(g,me):null;if(!g||!me||decision?.kind!=='auction')return;
  const current=bidDraft?.key===decision.key?bidDraft.value:suggestedBid(g),cash=playerById(g,me).cash;
  const value=d.bidAdd?g.auction!.bid+Number(d.bidAdd):current+Number(d.bidStep)*Math.max(1,Math.min(10,Math.floor(BOARD[g.auction!.property].price/40)));
  bidDraft={key:decision.key,value:Math.max(g.auction!.bid+1,Math.min(cash,value))};render();return;
 }
 if(d.formStep){const input=button.closest('form')?.querySelector<HTMLInputElement>(`input[name="${d.formStep}"]`);if(input){input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)+Number(d.step))));input.dispatchEvent(new Event('input',{bubbles:true}));}return;}
 switch(d.do){
  case'continue':void continueSolo();break;
  case'restore-backup':closeSheets();void continueSolo(true);break;
  case'rejoin':{const session=storedSession();if(session){formRoute='join';connect(session.url,{type:'RESUME',code:session.code,token:session.token},'join');}break;}
  case'rules':openSheet({kind:'rules'});break;
  case'settings':openSheet({kind:'settings'});break;
  case'game-menu':openSheet({kind:'menu'},true);break;
  case'properties':{const me=viewer(),owns=!!game&&game.properties.some(p=>p.owner===me);openSheet({kind:'properties',filter:owns||d.mode==='raise'?'mine':'all',raise:d.mode==='raise'},d.mode!=='raise'&&sheets.at(-1)?.kind!=='deed');break;}
  case'bank':openSheet({kind:'bank',scope:'mine'},true);break;
  case'trade':openTrade(d.partner);break;
  case'counter-trade':if(game?.trade&&canCounter())openTrade(game.trade.from,reverseTrade(game.trade));break;
  case'review-trade':if(trade&&game&&viewer()&&!tradeIssue(game,viewer()!,trade.draft)){trade={...trade,step:'review'};render();}break;
  case'edit-trade':if(trade){trade={...trade,step:'build'};render();}break;
  case'send-trade':if(trade){const draft=trade.draft;if(check(draft)){toast(friendlyReason(check(draft)!));trade={...trade,step:'build'};render();break;}sheets=[];trade=null;perform(draft);toast(draft.type==='counterTrade'?'Counteroffer sent.':'Offer sent.');}break;
  case'open-deed':openSheet({kind:'deed',index:Number(d.index)});break;
  case'focus-tile':{const index=d.index!==undefined?Number(d.index):preview??-1;if(index>=0){sheets=[];preview=null;board?.select(index);board?.focus(index);render();}break;}
  case'close-preview':preview=null;board?.select(-1);render();break;
  case'close-sheet':closeTopSheet();break;
  case'close-all-sheets':closeSheets();break;
  case'close-dialog':dialog=null;render();break;
  case'camera-reset':board?.reset(true);break;
  case'minimise-decision':{const decision=game?viewerDecision(game,viewer()):null;if(decision){minimised=decision.key;render();}break;}
  case'open-decision':minimised=null;sheets=[];render();break;
  case'open-card':cardHidden=null;render();break;
  case'hide-card':if(game?.pendingCard){cardHidden=game.pendingCard.event;render();}break;
  case'continue-observer-card':continueObserverCard();break;
  case'place-bid':{const input=decisionHost.querySelector<HTMLInputElement>('#bid-amount');const amount=Math.floor(Number(input?.value));if(Number.isFinite(amount))perform({type:'bid',amount});break;}
  case'confirm-bankrupt':{const g=game,creditor=g?.debt?.creditor?playerById(g,g.debt.creditor).name:null;confirm({title:'Declare bankruptcy?',body:`<ul><li>${creditor?`${esc(creditor)} receives your cash, jail cards and properties. Buildings are sold to the bank at half price first.`:'Your properties return to the bank and are auctioned to the other players.'}</li><li>You leave the game. This cannot be undone.</li></ul>`,confirm:'Declare bankruptcy',tone:'danger',command:'bankrupt'});break;}
  case'bankrupt':dialog=null;perform({type:'bankrupt'});break;
  case'confirm-leave':confirm({title:'Leave this match?',body:mode==='lan'?'<p>Your seat stays reserved. Choose <b>Rejoin LAN game</b> on the main menu to return.</p>':'<p>Your game is saved on this device. Continue it any time from the main menu.</p>',confirm:'Leave match',tone:'primary',command:'leave-match'});break;
  case'leave-match':leaveMatch();break;
  case'save':if(mode==='solo')soloSave(true);else network.send({type:'SAVE'});break;
  case'show-results':finale.reopen();render();break;
  case'dismiss-finale':finale.dismiss();render();break;
  case'leave-room':dialog=null;network.send({type:'LEAVE'});network.stop();try{localStorage.removeItem('empire-session');}catch{/* nothing stored */}mode='solo';nav('menu');break;
  case'start-lan':network.send({type:'START'});break;
  case'ready':network.send({type:'READY',ready:!network.room?.members.find(m=>m.id===network.session?.playerId)?.ready});break;
  case'share-room':{const room=network.room;if(!room)break;const host=hostLabel(network.session?.url??'');const link=!isNative&&!['localhost','127.0.0.1'].includes(location.hostname)?`\n${location.origin}/?room=${room.code}`:'';void shareText('Property Empire',`Join my Property Empire game.\nRoom code: ${room.code}\nHost: ${host}${link}`).then(result=>toast(result==='copied'?'Invite copied.':result==='failed'?`Room code ${room.code} · host ${host}`:'Invite shared.'));break;}
  case'cancel-connect':cancelConnect();break;
  case'take-seat':handoff=null;render();break;
  case'add-local-player':{const list=pageEl.querySelector<HTMLElement>('[data-local-players]'),form=pageEl.querySelector<HTMLFormElement>('#setup-form');if(!list||!form)break;const data=new FormData(form),used=[Number(data.get('token')),...data.getAll('localToken').map(Number)],rows=list.children.length,bots=Number(data.get('bots')||0);if(rows+2+bots>8){toast('A game has at most eight players. Remove a bot first.');break;}if(rows>=7)break;list.insertAdjacentHTML('beforeend',localPlayerRow(rows,[0,1,2,3,4,5,6,7].find(t=>!used.includes(t))??0));updateSetupSummary();break;}
  case'remove-local-player':button.closest('.local-player')?.remove();updateSetupSummary();break;
 }
});
document.addEventListener('change',event=>{
 const input=event.target as HTMLInputElement;
 if(input.dataset.setting&&input.type==='checkbox'){applySettings({...settings,[input.dataset.setting]:input.checked} as Settings);return;}
 if(input.dataset.amountField&&trade&&game&&viewer()){trade={...trade,draft:setAmount(game,viewer()!,trade.draft,input.dataset.amountField as 'giveCash',Number(input.value))};render();}
});
document.addEventListener('input',event=>{
 const input=event.target as HTMLInputElement;
 if(input.closest('#setup-form'))updateSetupSummary();
 const roomForm=input.closest<HTMLFormElement>('#room-config');if(roomForm)roomForm.dataset.dirty='1';
 if(input.dataset.amountField&&trade&&game&&viewer()){trade={...trade,draft:setAmount(game,viewer()!,trade.draft,input.dataset.amountField as 'giveCash',Number(input.value))};refreshTradeFooter();}
 if(input.id==='bid-amount'&&game){const decision=viewerDecision(game,viewer());const value=Math.floor(Number(input.value));if(decision&&Number.isFinite(value)){bidDraft={key:decision.key,value};const bid=decisionHost.querySelector<HTMLButtonElement>('[data-do="place-bid"]');if(bid){bid.disabled=!!check({type:'bid',amount:value});bid.querySelector('span')!.textContent=`Bid ${money(Math.max(0,value))}`;}}}
});
document.addEventListener('submit',event=>{
 event.preventDefault();const form=event.target as HTMLFormElement;
 if(form.id==='setup-form')submitSetup(form);
 else if(form.id==='room-config'){delete form.dataset.dirty;const data=new FormData(form);network.send({type:'CONFIG',botCount:Number(data.get('bots')||0),difficulty:String(data.get('difficulty')??'medium'),config:network.room?.config??{}});}
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&back())event.preventDefault();
 if(event.key==='Enter'&&(event.target as HTMLElement).id==='bid-amount'){event.preventDefault();decisionHost.querySelector<HTMLButtonElement>('[data-do="place-bid"]')?.click();}
});
document.addEventListener('pointerdown',()=>{sounds.unlock();music.unlock();},{passive:true});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>applySettings(settings));

void initPlatform({
 back,
 pause:()=>{paused=true;music.pause();if(botTimer){clearTimeout(botTimer);botTimer=null;}soloSave();board?.setPaused(true);},
 resume:()=>{if(!paused)return;paused=false;music.resume();board?.setPaused(false);render();scheduleBot();}
});
addEventListener('beforeunload',()=>soloSave());

const invited=new URLSearchParams(location.search).get('room');
if(invited){formRoute='join';route='join';}
refreshSaveInfo();
render();
if('serviceWorker' in navigator&&import.meta.env.PROD&&!isNative)void navigator.serviceWorker.register('/sw.js').catch(()=>{});
