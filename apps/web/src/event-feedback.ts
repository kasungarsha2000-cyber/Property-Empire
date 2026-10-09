import type {Game} from '../../../packages/core/types';
import {CARDS} from '../../../packages/core/board';
import {gameNotices,type GameNotice} from './game-events';
import {escapeHTML} from './ui-components';
export type EventTone='positive'|'negative'|'neutral';
export function noticeTone(notice:GameNotice):EventTone{
 if(['purchase','build','salary'].includes(notice.kind))return'positive';
 if(notice.kind==='debt'||notice.kind==='bankruptcy'||notice.title==='Sent to jail')return'negative';
 if(notice.title==='Out of jail'||notice.title==='You built an empire!')return'positive';
 if(notice.kind==='winner')return'negative';
 const amount=notice.amount??notice.card?.amount;
 return amount===undefined||amount===0?'neutral':amount>0?'positive':'negative';
}
export function feedbackNotices(before:Game|null,after:Game,id:string):GameNotice[]{
 if(!before||after.eventSeq<=before.eventSeq)return[];
 const notices=gameNotices(before,after,id),me=after.players.find(p=>p.id===id),old=before.players.find(p=>p.id===id);
 if(!me||!old)return[];
 if(after.debt?.player===id&&(before.debt?.player!==id||before.debt.amount!==after.debt.amount)){
  notices.push({key:`debt:${after.eventSeq}`,kind:'debt',title:'Payment due',detail:`Owe $${after.debt.amount}. Raise funds to pay.`,amount:undefined});
 }
 after.properties.forEach((property,index)=>{if(property.owner===id&&property.level>before.properties[index].level)notices.push({key:`build:${after.eventSeq}:${index}`,kind:'build',title:property.level===5?'Hotel built':'House built',detail:'Your property is growing.',property:index});});
 if(me.bankrupt&&!old.bankrupt)notices.push({key:`bankrupt:${after.eventSeq}`,kind:'bankruptcy',title:'Bankrupt',detail:'Your assets have been settled.'});
 return notices.filter(n=>{
  if(!n.card)return true;
  if(n.card.amount===undefined)return true;
  // Multi-player collections describe an obligation, not cash received. Their
  // individual payment logs supply the actual feedback, including partial debt.
  if(CARDS[n.card.deck][n.card.id].kind==='everyone')return false;
  if(n.card.amount<=0||me.cash-old.cash<n.card.amount)return false;
  return !notices.some(other=>other!==n&&other.amount===n.card!.amount);
 }).filter(n=>noticeTone(n)!=='neutral');
}

/** Cosmetic feedback uses settled personal events; it never blocks an action. */
export class EventFeedback{
 private previous:Game|null=null;
 private viewer='';
 private pending:GameNotice[]=[];
 private layer:HTMLDivElement;
 private timer:ReturnType<typeof setTimeout>|null=null;
 private reduced:boolean;
 constructor(stage:HTMLElement,reduced:boolean){this.reduced=reduced;this.layer=document.createElement('div');this.layer.className='event-feedback';this.layer.setAttribute('aria-hidden','true');stage.append(this.layer);}
 configure(reduced:boolean){this.reduced=reduced;if(reduced)this.clearVisual();}
 observe(game:Game,id:string,moving:boolean,animate=true){
  if(this.viewer!==id){this.reset();this.viewer=id;}
  if(!animate){this.pending=[];this.clearVisual();this.previous=game;return;}
  this.pending.push(...feedbackNotices(this.previous,game,id));this.previous=game;this.pending=this.pending.slice(-12);
  if(!moving)this.settle();
 }
 settle(){
  const pending=this.pending;this.pending=[];if(this.reduced||!pending.length)return;
  // Prefer the actual payment over a duplicate card or salary explanation.
  const notice=pending.find(n=>n.title==='Rent collected'||n.title==='Rent paid')??pending.find(n=>n.kind==='debt')??pending.at(-1)!;
  this.show(notice);
 }
 refreshBalance(){const burst=this.layer.querySelector('.feedback-burst');if(burst)document.querySelector('.portfolio-money')?.classList.add(burst.classList.contains('feedback-positive')?'balance-positive':'balance-negative');}
 reset(){this.previous=null;this.viewer='';this.pending=[];this.clearVisual();}
 private clearVisual(){if(this.timer)clearTimeout(this.timer);this.timer=null;this.layer.replaceChildren();document.querySelectorAll('.balance-positive,.balance-negative').forEach(el=>el.classList.remove('balance-positive','balance-negative'));}
 private show(notice:GameNotice){
  this.clearVisual();const tone=noticeTone(notice),amount=notice.amount??notice.card?.amount;
  this.layer.innerHTML=`<div class="feedback-burst feedback-${tone}"><div class="feedback-label"><span>${escapeHTML(notice.title)}</span>${amount!==undefined?`<strong>${amount<0?'−':'+'}$${Math.abs(amount).toLocaleString('en-US')}</strong>`:`<strong>${tone==='positive'?'✓':'!'}</strong>`}</div>${Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return`<i class="feedback-particle" style="--dx:${Math.cos(angle)*85}px;--dy:${Math.sin(angle)*60-25}px;--delay:${i*25}ms"></i>`;}).join('')}</div>`;
  this.refreshBalance();
  this.timer=setTimeout(()=>this.clearVisual(),1400);
 }
}
