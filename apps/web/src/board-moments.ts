import type {Game} from '../../../packages/core/types';
import {BOARD} from '../../../packages/core/board';
import {cardDesign,cardIllustration} from './card-designs';
import {escapeHTML as e} from './ui-components';
export type BoardMoment={key:string;kind:'rent'|'purchase'|'trade'|'card'|'build';property?:number;title:string;detail:string;amount?:number;deck?:'chance'|'community';card?:number};
export function boardMoments(before:Game|null,after:Game,viewer:string):BoardMoment[]{
 if(!before||after.eventSeq<=before.eventSeq)return[];const fresh=after.log.filter(n=>n.id>before.eventSeq),moments:BoardMoment[]=[];
 for(const log of fresh){
  const payment=log.payment;
  if(payment?.property!==undefined&&payment.from!==viewer&&payment.to!==viewer){const from=after.players.find(p=>p.id===payment.from),to=after.players.find(p=>p.id===payment.to);if(from&&to)moments.push({key:`rent:${log.id}`,kind:'rent',property:payment.property,title:`${to.name} receives rent`,detail:`${from.name} → ${to.name}`,amount:payment.amount});}
  if(log.kind==='purchase'){const property=after.properties.findIndex((p,i)=>p.owner&&p.owner!==before.properties[i].owner&&log.text.includes(BOARD[i].name));if(property>=0){const owner=after.players.find(p=>p.id===after.properties[property].owner)!;moments.push({key:`purchase:${log.id}`,kind:'purchase',property,title:`${owner.name} owns ${BOARD[property].name}`,detail:'Deed signed · Ownership registered',amount:-Number(log.text.match(/\$(\d+)/)?.[1]??BOARD[property].price)});}}
 }
 after.properties.forEach((property,index)=>{if(property.owner&&property.level>before.properties[index].level){const owner=after.players.find(p=>p.id===property.owner)!;moments.push({key:`build:${after.eventSeq}:${index}`,kind:'build',property:index,title:`${property.level===5?'Hotel built':'House built'}`,detail:`${owner.name} develops ${BOARD[index].name}.`});}});
 if(before.trade&&fresh.some(log=>log.kind==='trade'&&log.text.endsWith(' accepts the trade.'))){const t=before.trade,from=after.players.find(p=>p.id===t.from)!,to=after.players.find(p=>p.id===t.to)!;const exchanged=[...t.give.map(i=>`${BOARD[i].name} → ${to.name}`),...t.receive.map(i=>`${BOARD[i].name} → ${from.name}`),...(t.giveCash?[`$${t.giveCash} → ${to.name}`]:[]),...(t.receiveCash?[`$${t.receiveCash} → ${from.name}`]:[]),...(t.giveCards+t.receiveCards?[`${t.giveCards+t.receiveCards} jail card(s) exchanged`]:[])];moments.push({key:`trade:${after.eventSeq}`,kind:'trade',title:`${from.name} ↔ ${to.name}`,detail:exchanged.join(' · ')});}
 if(before.pendingCard&&fresh.some(log=>log.kind==='card-resolved')){const card=before.pendingCard,design=cardDesign(card.deck,card.id),player=after.players.find(p=>p.id===card.player)!;moments.push({key:`card:${card.event}`,kind:'card',deck:card.deck,card:card.id,title:design.name,detail:`${player.name} · ${after.debt?'Raise funds to finish this card':'Card effect activated'}`});}
 return moments;
}
export class BoardMoments{
 private previous:Game|null=null;private pending:BoardMoment[]=[];private layer:HTMLDivElement;private timer:ReturnType<typeof setTimeout>|null=null;
 private moving=false;
 constructor(stage:HTMLElement,private project:(property:number)=>{x:number;y:number}|null,private reduced:()=>boolean){this.layer=document.createElement('div');this.layer.className='board-moments';this.layer.setAttribute('aria-live','polite');stage.append(this.layer);}
 observe(game:Game,viewer:string,moving:boolean,animate=true){if(!animate||this.previous&&game.eventSeq<this.previous.eventSeq){this.reset();this.previous=game;return;}this.moving=moving;this.pending.push(...boardMoments(this.previous,game,viewer));this.previous=game;if(!moving)this.settle();}
 settle(arrived=true){
  if(arrived)this.moving=false;if(this.moving||!this.pending.length||this.layer.childElementCount)return;const moment=this.pending.shift()!;this.pending=this.pending.slice(-12);
  this.layer.innerHTML=`<div class="board-moment moment-${moment.kind}${this.reduced()?' moment-reduced':''}" ${moment.property!==undefined?`data-property="${moment.property}"`:''} data-moment="${e(moment.key)}">${moment.kind==='purchase'?'<span class="ownership-seal" aria-hidden="true">✓</span>':moment.kind==='trade'?'<div class="trade-flight" aria-hidden="true"><i>DEED</i><i>DEED</i><span>⇄</span></div>':moment.kind==='card'?`<div class="resolved-card-art" aria-hidden="true">${cardIllustration(moment.deck!,moment.card!)}</div>`:''}${moment.kind==='card'?'':`<div class="moment-copy"><span>${e(moment.kind==='purchase'?'Property purchased':moment.kind==='trade'?'Trade completed':moment.title)}</span>${moment.amount!==undefined?`<strong>${moment.amount<0?'−':'+'}$${Math.abs(moment.amount)}</strong>`:''}<p>${e(moment.kind==='purchase'?moment.title:moment.detail)}</p></div>`}</div>`;
  this.reposition();this.timer=setTimeout(()=>{this.clear();this.settle(false);},moment.kind==='card'?1800:8000);
 }
 reposition(){const stage=this.layer.parentElement!;this.layer.querySelectorAll<HTMLElement>('[data-property]').forEach(node=>{const point=this.project(Number(node.dataset.property)),halfWidth=node.offsetWidth/2,halfHeight=node.offsetHeight/2;node.hidden=!point;if(point){node.style.left=`${Math.max(halfWidth+8,Math.min(stage.clientWidth-halfWidth-8,point.x))}px`;node.style.top=`${Math.max(halfHeight+8,Math.min(stage.clientHeight-halfHeight-8,point.y-30))}px`;}});}
 configure(){this.layer.querySelectorAll('.board-moment').forEach(node=>node.classList.toggle('moment-reduced',this.reduced()));}
 reset(){this.pending=[];this.previous=null;this.moving=false;this.clear();}
 private clear(){if(this.timer)clearTimeout(this.timer);this.timer=null;this.layer.replaceChildren();}
}
