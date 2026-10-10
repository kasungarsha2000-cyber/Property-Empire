import {BOARD} from '../../../../packages/core/board';
import {playerById} from '../../../../packages/core/engine';
import type {Game} from '../../../../packages/core/types';
import {tradable,tradePreview,type TradeDraft} from '../game-ui';
import {avatar,esc,icon,money} from './dom';
import {friendlyReason} from './deed';
import {tradeComparison,tradeSentence} from './decisions';

export type TradeSide='give'|'receive';
export interface TradeState {draft:TradeDraft;side:TradeSide;step:'build'|'review'}

export function emptyDraft(to:string):TradeDraft{return{type:'offerTrade',to,give:[],receive:[],giveCash:0,receiveCash:0,giveCards:0,receiveCards:0};}

/** Toggle a deed on the side that owns it; deeds never appear on both sides. */
export function togglePick(draft:TradeDraft,side:TradeSide,index:number):TradeDraft{
 const list=draft[side],next=list.includes(index)?list.filter(i=>i!==index):[...list,index];
 return{...draft,[side]:next};
}
export function setAmount(g:Game,viewer:string,draft:TradeDraft,field:'giveCash'|'receiveCash'|'giveCards'|'receiveCards',value:number):TradeDraft{
 const owner=playerById(g,field.startsWith('give')?viewer:draft.to),limit=field.endsWith('Cash')?owner.cash:owner.cards.length;
 return{...draft,[field]:Math.max(0,Math.min(limit,Math.floor(Number.isFinite(value)?value:0)))};
}
/** Changing partner keeps what you offer and clears what you asked of the previous partner. */
export function changePartner(draft:TradeDraft,to:string):TradeDraft{return{...draft,to,receive:[],receiveCash:0,receiveCards:0};}

export function tradeIssue(g:Game,viewer:string,draft:TradeDraft){
 const empty=!draft.give.length&&!draft.receive.length&&!draft.giveCash&&!draft.receiveCash&&!draft.giveCards&&!draft.receiveCards;
 if(empty)return'Add a property, cash or a jail card to either side.';
 const error=tradePreview(g,viewer,draft).error;
 return error?friendlyReason(error):null;
}

function picker(g:Game,owner:string,side:TradeSide,draft:TradeDraft){
 const deeds=BOARD.filter(s=>g.properties[s.index].owner===owner);
 if(!deeds.length)return`<p class="empty-line">${side==='give'?'You have':`${esc(playerById(g,owner).name)} has`} no properties to trade.</p>`;
 return `<div class="pick-grid">${deeds.map(s=>{const v=g.properties[s.index],ok=tradable(g,s.index),on=draft[side].includes(s.index);return`<button class="pick ${on?'on':''}" style="--group:${s.color}" data-pick="${s.index}" aria-pressed="${on}" ${ok?'':'disabled'}><span class="pick-band" aria-hidden="true"></span><strong>${esc(s.name)}</strong><small>${!ok?'Sell group buildings first':v.mortgaged?'Mortgaged · 10% fee':money(s.price)}</small>${on?`<span class="pick-check" aria-hidden="true">${icon('check')}</span>`:''}</button>`;}).join('')}</div>`;
}

function stepper(field:string,label:string,value:number,max:number,unit:'cash'|'cards'){
 const steps=unit==='cash'?[10,50,100]:[];
 return `<div class="amount-row"><div class="amount-label"><span>${label}</span><small>${unit==='cash'?`of ${money(max)}`:`${max} held`}</small></div><div class="stepper compact" role="group" aria-label="${esc(label)}"><button class="btn icon-only secondary" data-step-field="${field}" data-step="${unit==='cash'?-10:-1}" ${value<=0?'disabled':''} aria-label="Less">${icon('minus')}</button><label class="stepper-value">${unit==='cash'?'<span aria-hidden="true">$</span>':''}<input type="number" inputmode="numeric" min="0" max="${max}" value="${value}" data-amount-field="${field}" data-focus-key="${field}" aria-label="${esc(label)}"></label><button class="btn icon-only secondary" data-step-field="${field}" data-step="${unit==='cash'?10:1}" ${value>=max?'disabled':''} aria-label="More">${icon('plus')}</button></div>${steps.length?`<div class="chip-row">${steps.map(step=>`<button class="chip" data-step-field="${field}" data-step="${step}" ${value+step>max?'disabled':''}>+${money(step)}</button>`).join('')}${max>0?`<button class="chip" data-step-field="${field}" data-set="0" ${value===0?'disabled':''}>Clear</button>`:''}</div>`:''}</div>`;
}

export function tradeFooter(g:Game,viewer:string,draft:TradeDraft){
 const issue=tradeIssue(g,viewer,draft);
 return `<p class="sentence">${esc(tradeSentence(g,viewer,{...draft,from:viewer}))}</p>${issue?`<p class="note warn">${icon('info')}<span>${esc(issue)}</span></p>`:''}<button class="btn primary block" data-do="review-trade" ${issue?'disabled':''}>Review offer ${icon('chevron')}</button>`;
}

export function tradeBuilderSheet(g:Game,viewer:string,state:TradeState){
 const {draft,side}=state,me=playerById(g,viewer),partner=playerById(g,draft.to),counter=draft.type==='counterTrade';
 if(state.step==='review')return `<div class="sheet-body trade-review"><p class="lead">${counter?'Your counteroffer':'Your offer'} to <b>${esc(partner.name)}</b>. Nothing changes until they accept.</p>${tradeComparison(g,viewer,draft)}<p class="sentence">${esc(tradeSentence(g,viewer,{...draft,from:viewer}))}</p><div class="panel-actions"><button class="btn secondary" data-do="edit-trade">${icon('back')}<span>Edit</span></button><button class="btn primary" data-do="send-trade" data-haptic="light">${icon('check')}<span>${counter?'Send counteroffer':'Send offer'}</span></button></div></div>`;
 const others=g.players.filter(p=>p.id!==viewer&&!p.bankrupt);
 const owner=side==='give'?me:partner;
 return `<div class="sheet-body trade-builder">
${counter?`<p class="lead">Counteroffer to <b>${esc(partner.name)}</b>. Adjust the terms, then review.</p>`:`<div class="partners" role="radiogroup" aria-label="Trade with">${others.map(p=>`<button class="partner ${p.id===draft.to?'on':''}" role="radio" aria-checked="${p.id===draft.to}" data-partner="${esc(p.id)}">${avatar(g,p,'sm')}<span>${esc(p.name)}</span><small>${money(p.cash)}</small></button>`).join('')}</div>`}
<div class="segmented" role="tablist" aria-label="Trade side"><button role="tab" class="seg ${side==='give'?'on':''}" aria-selected="${side==='give'}" data-trade-side="give">You give${draft.give.length+(draft.giveCash?1:0)+(draft.giveCards?1:0)?` <b>${draft.give.length+(draft.giveCash?1:0)+(draft.giveCards?1:0)}</b>`:''}</button><button role="tab" class="seg ${side==='receive'?'on':''}" aria-selected="${side==='receive'}" data-trade-side="receive">You receive${draft.receive.length+(draft.receiveCash?1:0)+(draft.receiveCards?1:0)?` <b>${draft.receive.length+(draft.receiveCash?1:0)+(draft.receiveCards?1:0)}</b>`:''}</button></div>
<div class="trade-side-body"><h3 class="side-title">${side==='give'?'From your properties':`From ${esc(partner.name)}’s properties`}</h3>${picker(g,owner.id,side,draft)}
${stepper(`${side}Cash`,side==='give'?'Cash you add':'Cash you ask for',draft[`${side}Cash`],owner.cash,'cash')}
${owner.cards.length?stepper(`${side}Cards`,'Get Out of Jail Free cards',draft[`${side}Cards`],owner.cards.length,'cards'):''}</div>
<footer class="trade-footer">${tradeFooter(g,viewer,draft)}</footer>
</div>`;
}
