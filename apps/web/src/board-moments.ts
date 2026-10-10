import type {Game} from '../../../packages/core/types';
import {BOARD} from '../../../packages/core/board';
import {cardDesign,cardIllustration} from './card-designs';
import {esc as e} from './ui/dom';
import {propertyArtwork} from './property-art';
import {SMALL_NOTICE_MS,TRADE_CONFIRMATION_MS} from './presentation-timing';
export type TradeAsset={kind:'deed';property:number;mortgaged:boolean}|{kind:'cash';amount:number}|{kind:'card';deck:'chance'|'community';count:number};
export type TradeExchange={from:string;to:string;give:TradeAsset[];receive:TradeAsset[]};
export type BoardMoment={key:string;kind:'rent'|'purchase'|'trade'|'card'|'build';property?:number;title:string;detail:string;amount?:number;deck?:'chance'|'community';card?:number;exchange?:TradeExchange};
function tradeAssets(game:Game,player:string,properties:number[],cash:number,cards:number):TradeAsset[]{
 const selected=game.players.find(p=>p.id===player)!.cards.slice(0,cards);
 return [...properties.map(property=>({kind:'deed' as const,property,mortgaged:game.properties[property].mortgaged})),...(cash?[{kind:'cash' as const,amount:cash}]:[]),...(['chance','community'] as const).flatMap(deck=>{const count=selected.filter(card=>card===deck).length;return count?[{kind:'card' as const,deck,count}]:[];})];
}
export function boardMoments(before:Game|null,after:Game,viewer:string):BoardMoment[]{
 if(!before||after.eventSeq<=before.eventSeq)return[];const fresh=after.log.filter(n=>n.id>before.eventSeq),moments:BoardMoment[]=[];
 for(const log of fresh){
  const payment=log.payment;
  if(payment?.property!==undefined&&payment.from!==viewer&&payment.to!==viewer){const from=after.players.find(p=>p.id===payment.from),to=after.players.find(p=>p.id===payment.to);if(from&&to)moments.push({key:`rent:${log.id}`,kind:'rent',property:payment.property,title:`${to.name} receives rent`,detail:`${from.name} → ${to.name}`,amount:payment.amount});}
  if(log.kind==='purchase'){const property=after.properties.findIndex((p,i)=>p.owner&&p.owner!==before.properties[i].owner&&log.text.includes(BOARD[i].name));if(property>=0){const owner=after.players.find(p=>p.id===after.properties[property].owner)!;moments.push({key:`purchase:${log.id}`,kind:'purchase',property,title:`${owner.name} owns ${BOARD[property].name}`,detail:'Deed signed · Ownership registered',amount:-Number(log.text.match(/\$(\d+)/)?.[1]??BOARD[property].price)});}}
 }
 after.properties.forEach((property,index)=>{if(property.owner&&property.level>before.properties[index].level){const owner=after.players.find(p=>p.id===property.owner)!;moments.push({key:`build:${after.eventSeq}:${index}`,kind:'build',property:index,title:`${property.level===5?'Hotel built':'House built'}`,detail:`${owner.name} develops ${BOARD[index].name}.`});}});
 if(before.trade&&fresh.some(log=>log.kind==='trade'&&log.text.endsWith(' accepts the trade.'))){const t=before.trade,from=after.players.find(p=>p.id===t.from)!,to=after.players.find(p=>p.id===t.to)!;const exchanged=[...t.give.map(i=>`${BOARD[i].name} → ${to.name}`),...t.receive.map(i=>`${BOARD[i].name} → ${from.name}`),...(t.giveCash?[`$${t.giveCash} → ${to.name}`]:[]),...(t.receiveCash?[`$${t.receiveCash} → ${from.name}`]:[]),...(t.giveCards+t.receiveCards?[`${t.giveCards+t.receiveCards} jail card(s) exchanged`]:[])];moments.push({key:`trade:${after.eventSeq}`,kind:'trade',title:`${from.name} ↔ ${to.name}`,detail:exchanged.join(' · '),exchange:{from:from.name,to:to.name,give:tradeAssets(before,t.from,t.give,t.giveCash,t.giveCards),receive:tradeAssets(before,t.to,t.receive,t.receiveCash,t.receiveCards)}});}
 if(before.pendingCard&&fresh.some(log=>log.kind==='card-resolved')){const card=before.pendingCard,design=cardDesign(card.deck,card.id),player=after.players.find(p=>p.id===card.player)!;moments.push({key:`card:${card.event}`,kind:'card',deck:card.deck,card:card.id,title:design.name,detail:`${player.name} · ${after.debt?'Raise funds to finish this card':'Card effect activated'}`});}
 return moments;
}
const transferIcon=(kind:'cash'|'card')=>`<svg viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${kind==='cash'?'<rect x="2" y="3" width="28" height="18" rx="3"/><circle cx="16" cy="12" r="5"/><path d="M6 8h3m14 8h3M16 9v6"/>':'<path d="M5 2h22v5a5 5 0 0 0 0 10v5H5v-5A5 5 0 0 0 5 7V2Z"/><path d="M12 8h8m-8 4h8m-6 4h4"/>'}</svg>`;
function exchangeMarkup(exchange:TradeExchange){
 const assets=(items:TradeAsset[])=>items.length?items.map(asset=>asset.kind==='deed'?`<div class="trade-mini-deed" style="--deed-color:${BOARD[asset.property].color}"><div class="trade-mini-art" aria-hidden="true">${propertyArtwork(asset.property)}</div><strong>${e(BOARD[asset.property].name)}</strong><small>${asset.mortgaged?'Mortgaged':'Title deed'}</small></div>`:asset.kind==='cash'?`<div class="trade-mini-cash">${transferIcon('cash')}<strong>$${asset.amount.toLocaleString('en-US')}</strong><small>Cash</small></div>`:`<div class="trade-mini-card">${transferIcon('card')}<strong>${asset.count} jail ${asset.count===1?'card':'cards'}</strong><small>${asset.deck==='chance'?'Chance':'Community Chest'}</small></div>`).join(''):'<p class="trade-empty-transfer">Nothing returned</p>';
 const side=(from:string,to:string,items:TradeAsset[],direction:string)=>`<section class="trade-transfer ${direction}"><header><strong>${e(from)}</strong><span>to ${e(to)}</span></header><div class="trade-assets">${assets(items)}</div></section>`;
 return `<div class="trade-exchange">${side(exchange.from,exchange.to,exchange.give,'transfer-give')}<span class="trade-transfer-arrow" aria-hidden="true">⇄</span>${side(exchange.to,exchange.from,exchange.receive,'transfer-receive')}</div>`;
}
export function boardMomentMarkup(moment:BoardMoment,reduced:boolean){
 const trade=moment.kind==='trade'&&moment.exchange;
 return `<div class="board-moment moment-${moment.kind}${reduced?' moment-reduced':''}" ${moment.property!==undefined?`data-property="${moment.property}"`:''} data-moment="${e(moment.key)}">${trade?`<div class="trade-confirmation"><header class="trade-complete-head"><span class="trade-settled" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 12 4 4 8-8"/></svg></span><div><span>Trade completed</span><strong>${e(moment.title)}</strong></div></header>${exchangeMarkup(moment.exchange!)}<p class="trade-settlement-note">Deeds and balances updated</p><span class="sr-only">${e(moment.detail)}</span></div>`: `${moment.kind==='purchase'?'<span class="ownership-seal" aria-hidden="true">✓</span>':moment.kind==='card'?`<div class="resolved-card-art" aria-hidden="true">${cardIllustration(moment.deck!,moment.card!)}</div>`:''}${moment.kind==='card'?'':`<div class="moment-copy"><span>${e(moment.kind==='purchase'?'Property purchased':moment.title)}</span>${moment.amount!==undefined?`<strong>${moment.amount<0?'−':'+'}$${Math.abs(moment.amount)}</strong>`:''}<p>${e(moment.kind==='purchase'?moment.title:moment.detail)}</p></div>`}`}</div>`;
}
export class BoardMoments{
 private previous:Game|null=null;private pending:BoardMoment[]=[];private layer:HTMLDivElement;private timer:ReturnType<typeof setTimeout>|null=null;
 private moving=false;
 constructor(stage:HTMLElement,private project:(property:number)=>{x:number;y:number}|null,private reduced:()=>boolean){this.layer=document.createElement('div');this.layer.className='board-moments';this.layer.setAttribute('aria-live','polite');stage.append(this.layer);}
 observe(game:Game,viewer:string,moving:boolean,animate=true){if(!animate||this.previous&&game.eventSeq<this.previous.eventSeq){this.reset();this.previous=game;return;}if(moving&&!this.moving)this.clear();this.moving=moving;this.pending.push(...boardMoments(this.previous,game,viewer));this.previous=game;if(!moving)this.settle();}
 settle(arrived=true){
  if(arrived)this.moving=false;if(this.moving||!this.pending.length||this.layer.childElementCount)return;const moment=this.pending.shift()!;this.pending=this.pending.slice(-12);
  this.layer.innerHTML=boardMomentMarkup(moment,this.reduced());
  this.reposition();this.timer=setTimeout(()=>{this.clear();this.settle(false);},moment.kind==='card'?1800:moment.kind==='trade'?TRADE_CONFIRMATION_MS:SMALL_NOTICE_MS);
 }
 reposition(){const stage=this.layer.parentElement!;this.layer.querySelectorAll<HTMLElement>('[data-property]').forEach(node=>{const point=this.project(Number(node.dataset.property)),halfWidth=node.offsetWidth/2,halfHeight=node.offsetHeight/2;node.hidden=!point;if(point){node.style.left=`${Math.max(halfWidth+8,Math.min(stage.clientWidth-halfWidth-8,point.x))}px`;node.style.top=`${Math.max(halfHeight+8,Math.min(stage.clientHeight-halfHeight-8,point.y-30))}px`;}});}
 configure(){this.layer.querySelectorAll('.board-moment').forEach(node=>node.classList.toggle('moment-reduced',this.reduced()));}
 reset(){this.pending=[];this.previous=null;this.moving=false;this.clear();}
 private clear(){if(this.timer)clearTimeout(this.timer);this.timer=null;this.layer.replaceChildren();}
}
