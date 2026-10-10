import {BOARD} from '../../../../packages/core/board';
import {netWorth,playerById} from '../../../../packages/core/engine';
import type {Game} from '../../../../packages/core/types';
import type {Settings} from '../storage';
import {avatar,esc,icon,money,plural,playerColor} from './dom';
import {deckCatalog} from './card-reveal';
import {buildingPips} from './deed';

function toggle(key:keyof Settings,label:string,detail:string,on:boolean,disabled=false){
 return `<label class="toggle-row ${disabled?'disabled':''}"><span class="row-text"><b>${label}</b><small>${detail}</small></span><input type="checkbox" role="switch" data-setting="${key}" ${on?'checked':''} ${disabled?'disabled':''}><i class="switch" aria-hidden="true"></i></label>`;
}
function segmented(key:keyof Settings,label:string,options:[string,string][],value:string,detail=''){
 return `<div class="setting-row"><span class="row-text"><b>${label}</b>${detail?`<small>${detail}</small>`:''}</span><div class="segmented small" role="radiogroup" aria-label="${esc(label)}">${options.map(([v,text])=>`<button class="seg ${v===value?'on':''}" role="radio" aria-checked="${v===value}" data-setting="${key}" data-value="${v}">${text}</button>`).join('')}</div></div>`;
}

export interface SettingsContext {hapticsSupported:boolean;systemReducedMotion:boolean;inMatch:boolean;native:boolean}
export function settingsSheet(s:Settings,ctx:SettingsContext){
 return `<div class="sheet-body settings">
<section class="settings-group"><h3>Sound and feel</h3>${toggle('sound','Sound effects','Dice, coins, cards and building',s.sound)}${ctx.hapticsSupported?toggle('haptics','Haptic feedback','Gentle vibration for important moments',s.haptics):''}</section>
<section class="settings-group"><h3>Motion</h3>${segmented('speed','Animation speed',[['normal','Normal'],['fast','Fast']],s.speed,'Dice, pawns and bot turns')}${toggle('reducedMotion','Reduced motion',ctx.systemReducedMotion?'Your device asks for reduced motion, so it is always on.':'Instant moves, no decorative effects',s.reducedMotion||ctx.systemReducedMotion,ctx.systemReducedMotion)}</section>
<section class="settings-group"><h3>Board</h3>${segmented('quality','Graphics quality',[['low','Low'],['medium','Medium'],['high','High']],s.quality,'Lower saves battery on older phones')}${segmented('camera','Camera sensitivity',[['gentle','Gentle'],['normal','Normal'],['quick','Quick']],s.camera)}${toggle('highlightMine','Highlight my properties','Gold outlines on tiles you own',s.highlightMine)}</section>
<section class="settings-group"><h3>Display</h3>${segmented('textSize','Text size',[['default','Default'],['large','Large'],['larger','Larger']],s.textSize)}</section>
${ctx.inMatch?'':`<section class="settings-group"><h3>Saved game</h3><button class="list-button" data-do="restore-backup">${icon('restore')}<span><b>Restore previous solo save</b><small>Load the save made before the latest one</small></span></button></section>`}
</div>`;
}

export function gameMenuSheet(g:Game,ctx:{lan:boolean;room?:string;turnLimit:number}){
 const item=(command:string,iconName:string,label:string,detail='',tone='')=>`<button class="list-button ${tone}" data-do="${command}">${icon(iconName)}<span><b>${label}</b>${detail?`<small>${detail}</small>`:''}</span>${icon('chevron')}</button>`;
 return `<div class="sheet-body game-menu"><p class="lead">${ctx.lan?`LAN room <b>${esc(ctx.room??'')}</b> · the host saves automatically`:'Solo game · saved on this device'} · Turn ${g.turn}${ctx.turnLimit?` of ${ctx.turnLimit}`:''}</p>
<nav class="list">${item('close-sheet','play','Resume')}${item('save','save','Save game',ctx.lan?'Ask the host to write a save now':'Also saves automatically after every action')}${item('bank','bank','Bank and history','Balances, rent totals and recent activity')}${item('rules','help','Rules and cards','How to play and both decks')}${item('settings','settings','Settings')}${item('confirm-leave','exit','Leave match',ctx.lan?'Your seat is kept; rejoin from the main menu':'Your progress is saved','danger')}</nav></div>`;
}

export function rulesSheet(g:Game|null){
 const section=(title:string,body:string)=>`<section class="rule"><h3>${title}</h3><p>${body}</p></section>`;
 return `<div class="sheet-body rules">
${section('Goal','Be the last player who is not bankrupt. In Quick and Extended games the highest net worth wins at the turn limit.')}
${section('Your turn','Roll two dice and move. Passing or landing on Start pays $200. Doubles give you another roll; three doubles in a row send you straight to jail.')}
${section('Buying','Land on an unowned street, station or utility to buy it at its price. If you decline, every player — including you — can bid for it in an auction.')}
${section('Rent','Owning a full colour set doubles rent on its streets without buildings. Stations charge $25, $50, $100 or $200 by how many one player owns. Utilities charge 4× the dice, or 10× with both. Mortgaged deeds charge nothing.')}
${section('Building','Own the whole colour set with no mortgages, then build evenly. Four houses on every street of the set unlock hotels. The bank holds 32 houses and 12 hotels. Buildings sell back at half price.')}
${section('Mortgages','Mortgage a deed for half its price after selling the set’s buildings. Lifting a mortgage costs the value plus 10%. A mortgaged deed received in a trade charges its new owner 10% straight away.')}
${section('Jail','Pay $50 before rolling, use a Get Out of Jail Free card, or try for doubles on up to three turns. After a third miss you pay $50 and move. Doubles that free you do not earn another roll. You still collect rent in jail.')}
${section('Debt and bankruptcy','If you cannot pay, play pauses so you can sell, mortgage or trade. Bankruptcy to a player hands them your cash, cards and deeds; bankruptcy to the bank sends your deeds to auction.')}
${section('Trading','On your turn you may offer one trade of deeds, cash and jail cards. Streets in a set with buildings cannot be traded. The other player can accept, decline or counter up to three times.')}
${g?.config.jackpot?section('House rule: Free Parking jackpot','Taxes collect on Free Parking; landing there collects the pot.'):''}
${section('Controls','Drag to rotate the board, pinch to zoom and drag with two fingers to pan. Tap a tile for a quick look; tap Details for the full deed.')}
<details class="catalog"><summary>All Chance and Community Chest cards</summary>${deckCatalog()}</details>
</div>`;
}

export function playerSheet(g:Game,id:string,viewer:string|null,ctx:{canTrade:boolean;connected?:boolean}){
 const p=playerById(g,id),deeds=BOARD.filter(s=>g.properties[s.index].owner===id),me=id===viewer;
 const status=p.bankrupt?'Bankrupt':me?'You':p.bot?`${(p.difficulty??'medium')[0].toUpperCase()}${(p.difficulty??'medium').slice(1)} bot`:'Player';
 const trade=!me&&!p.bankrupt?`<button class="btn secondary block" data-do="trade" data-partner="${esc(id)}" ${ctx.canTrade?'':'disabled'}>${icon('trade')}<span>Trade with ${esc(p.name)}</span></button>${ctx.canTrade?'':'<p class="note">You can propose a trade on your turn.</p>'}`:'';
 return `<div class="sheet-body player-sheet" style="--player:${playerColor(g,p)}">
<div class="player-hero">${avatar(g,p,'lg')}<div><h3>${esc(p.name)}</h3><p>${status}${p.jailed?' · In jail':''}${ctx.connected===false&&!p.bot?' · Offline':''} · on ${esc(BOARD[p.position].name)}</p></div></div>
<div class="summary-row four"><div><span>Cash</span><strong>${money(p.cash)}</strong></div><div><span>Net worth</span><strong>${money(netWorth(g,p))}</strong></div><div><span>Rent earned</span><strong>${money(p.rentEarned)}</strong></div><div><span>Rent paid</span><strong>${money(p.rentPaid)}</strong></div></div>
${p.cards.length?`<p class="note">${icon('card')}<span>Holds ${plural(p.cards.length,'Get Out of Jail Free card')}.</span></p>`:''}
${trade}
<h3 class="list-title">Properties <span>${deeds.length}</span></h3>
${deeds.length?`<ul class="prop-list">${deeds.map(s=>{const v=g.properties[s.index];return`<li class="prop-row ${v.mortgaged?'mortgaged':''}" style="--group:${s.color}"><button class="prop-main" data-do="open-deed" data-index="${s.index}"><span class="prop-swatch" aria-hidden="true"></span><span class="prop-text"><strong>${esc(s.name)}</strong><small>${v.mortgaged?'Mortgaged':money(s.price)}</small></span>${buildingPips(v.level)}</button></li>`;}).join('')}</ul>`:'<p class="empty-line">No properties yet.</p>'}
</div>`;
}

type HistoryItem={id:number;kind:string;text:string;amount:number|null};
const MONEY_KINDS=new Set(['payment','salary','income','purchase','build','auction','trade','bankruptcy','debt','jail']);
/** Turns the authoritative event log into a readable money history. */
export function moneyHistory(g:Game,viewer:string|null,scope:'mine'|'table'):HistoryItem[]{
 const me=viewer?g.players.find(p=>p.id===viewer):null;
 return [...g.log].reverse().filter(entry=>MONEY_KINDS.has(entry.kind)||/mortgage|sells|lifts/.test(entry.text)).filter(entry=>{
  if(entry.kind==='auction'&&!/ wins /.test(entry.text))return false;
  if(scope==='table'||!me)return true;
  return entry.payment?entry.payment.from===me.id||entry.payment.to===me.id:entry.text.startsWith(`${me.name} `);
 }).slice(0,60).map(entry=>{
  let amount:number|null=null;const value=Number(entry.text.match(/\$([\d,]+)/)?.[1]?.replace(/,/g,''));
  if(entry.payment)amount=me&&entry.payment.to===me.id?entry.payment.amount:me&&entry.payment.from===me.id?-entry.payment.amount:null;
  else if(Number.isFinite(value)&&value>0&&scope==='mine'){
   if(['salary','income'].includes(entry.kind)||/ mortgages | sells /.test(entry.text))amount=value;
   else if(['purchase','build'].includes(entry.kind)||/ lifts | wins /.test(entry.text))amount=-value;
  }
  return{id:entry.id,kind:entry.kind,text:entry.text,amount};
 });
}
const HISTORY_ICON:Record<string,string>={payment:'cash',salary:'coin',income:'coin',purchase:'deeds',build:'build',auction:'gavel',trade:'trade',bankruptcy:'flag',debt:'warning',jail:'jail'};

export function bankSheet(g:Game,viewer:string|null,scope:'mine'|'table'){
 const me=viewer?g.players.find(p=>p.id===viewer)??null:null,items=moneyHistory(g,viewer,scope);
 const deeds=me?g.properties.filter(v=>v.owner===me.id).length:0;
 return `<div class="sheet-body bank">
${me?`<div class="summary-row four"><div><span>Cash</span><strong>${money(me.cash)}</strong></div><div><span>Net worth</span><strong>${money(netWorth(g,me))}</strong></div><div><span>Rent earned</span><strong>${money(me.rentEarned)}</strong></div><div><span>Rent paid</span><strong>${money(me.rentPaid)}</strong></div></div><p class="note">${plural(deeds,'property','properties')} · ${me.cards.length?plural(me.cards.length,'jail card'):'no jail cards'} · Bank holds ${g.houses} houses and ${g.hotels} hotels${g.config.jackpot?` · Jackpot ${money(g.pot)}`:''}</p>`:''}
<div class="segmented" role="tablist" aria-label="History scope"><button role="tab" class="seg ${scope==='mine'?'on':''}" aria-selected="${scope==='mine'}" data-history="mine">Your activity</button><button role="tab" class="seg ${scope==='table'?'on':''}" aria-selected="${scope==='table'}" data-history="table">Whole table</button></div>
${items.length?`<ol class="history">${items.map(item=>`<li class="history-item kind-${item.kind}"><span class="history-icon">${icon(HISTORY_ICON[item.kind]??'history')}</span><span class="history-text">${esc(item.text)}</span>${item.amount!==null?`<b class="${item.amount<0?'neg':'pos'}">${item.amount<0?'−':'+'}${money(Math.abs(item.amount))}</b>`:''}</li>`).join('')}</ol>`:'<p class="empty-line">No money has changed hands yet.</p>'}
</div>`;
}
