import {BOARD,GROUPS,groupSpaces} from '../../../../packages/core/board';
import {playerById} from '../../../../packages/core/engine';
import type {Action,Game,Trade} from '../../../../packages/core/types';
import {deedFinancials,propertyArtwork} from '../property-art';
import {tradePreview,type TradeDraft} from '../game-ui';
import {MAX_COUNTER_OFFERS} from '../../../../packages/core/trade-terms';
import {avatar,esc,icon,money,plural} from './dom';
import {friendlyReason,spaceKicker,type Check} from './deed';

function act(label:string,action:Action,check:Check,tone='secondary',iconName?:string,extra=''){
 const reason=check(action);
 return `<button class="btn ${tone}" data-action="${esc(JSON.stringify(action))}" ${reason?`disabled title="${esc(friendlyReason(reason))}"`:''} ${extra}>${iconName?icon(iconName):''}<span>${esc(label)}</span></button>`;
}
const minimise='<button class="btn icon-only quiet panel-min" data-do="minimise-decision" aria-label="Hide panel and view the board">'+icon('down')+'</button>';
function head(eyebrow:string,title:string,extra=''){return `<header class="panel-head"><div><span class="eyebrow">${eyebrow}</span><h2 id="panel-title">${title}</h2></div>${extra}${minimise}</header>`;}

/** Cash the player could raise by selling every building and mortgaging every deed. */
export function liquidationValue(g:Game,id:string){
 return g.properties.reduce((sum,v,i)=>v.owner!==id?sum:sum+(v.level===5?5:v.level)*BOARD[i].buildCost/2+(v.mortgaged?0:BOARD[i].mortgage),0);
}

function rentSummary(index:number){
 const s=BOARD[index];
 if(s.type==='street')return`${money(s.rents[0])} · ${money(s.rents[0]*2)} with the set`;
 if(s.type==='transport')return'$25 – $200 by stations owned';
 return'4× or 10× the dice';
}

export function purchasePanel(g:Game,viewer:string,check:Check){
 const index=g.pendingProperty!,s=BOARD[index],me=playerById(g,viewer),short=s.price-me.cash,financials=deedFinancials(g,index);
 const ownedInSet=groupSpaces(index).filter(space=>g.properties[space.index].owner===viewer).length;
 return `<section class="panel purchase" style="--group:${s.color}" aria-labelledby="panel-title">
${head(`For sale · ${esc(spaceKicker(index))}`,esc(s.name))}
<div class="purchase-body"><figure class="thumb">${propertyArtwork(index)}</figure><dl class="kv tight"><div><dt>Price</dt><dd class="amount">${money(s.price)}</dd></div><div><dt>Rent</dt><dd>${rentSummary(index)}</dd></div><div><dt>Cash after</dt><dd class="${short>0?'neg':''}">${short>0?`Short ${money(short)}`:money(me.cash-s.price)}</dd></div>${ownedInSet?`<div><dt>Your set</dt><dd>${ownedInSet+1} of ${groupSpaces(index).length} after buying</dd></div>`:''}</dl></div>
${short>0?`<p class="note warn">${icon('warning')}<span>You need ${money(short)} more. Mortgage or sell to raise cash, or send it to auction.</span></p>`:'<p class="note">Decline and every player, including you, can bid in an auction.</p>'}
<details class="more"><summary>Full rent schedule</summary><dl class="rent-table">${financials.rows.map(row=>`<div><dt>${esc(row.label)}</dt><dd>${row.value}</dd></div>`).join('')}</dl></details>
<div class="panel-actions">${short>0?`<button class="btn secondary" data-do="properties" data-mode="raise">${icon('cash')}<span>Raise cash</span></button>`:''}${act('Auction',{type:'decline'},check,'secondary','gavel')}${act(`Buy for ${money(s.price)}`,{type:'buy'},check,'primary','check','data-haptic="success"')}</div>
</section>`;
}

export interface AuctionView {bid:number}
/** Quick increments scale with the deed so a $400 street is not bid up a dollar at a time. */
export function bidSteps(price:number){return price>=300?[10,25,50,100]:price>=150?[5,10,25,50]:[1,5,10,25];}
export function suggestedBid(g:Game){const a=g.auction!;return a.bid+Math.max(1,Math.min(25,Math.floor(BOARD[a.property].price/10)));}

export function auctionPanel(g:Game,viewer:string,check:Check,draft:number|null){
 const a=g.auction!,s=BOARD[a.property],me=g.players.find(p=>p.id===viewer)!,myTurn=a.turn===viewer;
 const leader=a.leader?playerById(g,a.leader):null,minimum=a.bid+1;
 const opened=[...g.log].reverse().find(entry=>entry.kind==='auction'&&entry.text.startsWith('Auction opens'));
 const history=g.log.filter(entry=>entry.kind==='auction'&&opened&&entry.id>opened.id).slice(-3).reverse();
 const bidders=g.players.filter(p=>!p.bankrupt).map(p=>{const state=p.id===a.leader?'leading':a.active.includes(p.id)?(p.id===a.turn?'turn':'in'):'out';return`<li class="bidder ${state}">${avatar(g,p,'sm')}<span>${p.id===viewer?'You':esc(p.name)}</span><small>${state==='leading'?'Leading':state==='turn'?'Bidding':state==='in'?'In':'Passed'}</small></li>`;}).join('');
 let controls='';
 if(myTurn){
  const value=Math.min(me.cash,Math.max(minimum,draft??suggestedBid(g))),canBid=me.cash>=minimum;
  controls=canBid?`<div class="bid-controls"><div class="stepper" role="group" aria-label="Your bid"><button class="btn icon-only secondary" data-bid-step="-1" ${value<=minimum?'disabled':''} aria-label="Lower bid">${icon('minus')}</button><label class="stepper-value"><span class="sr-only">Bid amount</span><span aria-hidden="true">$</span><input id="bid-amount" data-focus-key="bid" type="number" inputmode="numeric" min="${minimum}" max="${me.cash}" value="${value}"></label><button class="btn icon-only secondary" data-bid-step="1" ${value>=me.cash?'disabled':''} aria-label="Raise bid">${icon('plus')}</button></div><div class="chip-row">${bidSteps(s.price).map(step=>`<button class="chip" data-bid-add="${step}" ${a.bid+step>me.cash?'disabled':''}>+${money(step)}</button>`).join('')}</div><p class="note">Minimum ${money(minimum)} · You have ${money(me.cash)}</p></div>
<div class="panel-actions">${act('Pass',{type:'pass'},check,'secondary')}<button class="btn primary" data-do="place-bid" data-haptic="light" ${check({type:'bid',amount:value})?'disabled':''}>${icon('gavel')}<span>Bid ${money(value)}</span></button></div>`
  :`<p class="note warn">${icon('warning')}<span>The bid already exceeds your cash. You can only pass.</span></p><div class="panel-actions">${act('Pass',{type:'pass'},check,'primary')}</div>`;
 }else{
  const turn=playerById(g,a.turn),mineState=!a.active.includes(viewer)?'You have passed on this auction.':a.leader===viewer?'You hold the highest bid.':'Your turn to bid will come around.';
  controls=`<p class="waiting">${avatar(g,turn,'sm')}<span><b>${esc(turn.name)}</b> is bidding…</span></p><p class="note">${mineState}</p>`;
 }
 return `<section class="panel auction" style="--group:${s.color}" aria-labelledby="panel-title">
${head(`Auction · ${esc(GROUPS[s.group].name)}`,esc(s.name),`<span class="list-price">List ${money(s.price)}</span>`)}
<div class="bid-board"><div><span class="eyebrow">Highest bid</span><strong class="amount big" data-bid="${a.bid}">${a.bid?money(a.bid):'No bids'}</strong></div>${leader?`<div class="leader">${avatar(g,leader,'sm')}<span>${leader.id===viewer?'You':esc(leader.name)}</span></div>`:''}</div>
<ul class="bidders">${bidders}</ul>
${history.length?`<ol class="auction-log">${history.map(entry=>`<li>${esc(entry.text)}</li>`).join('')}</ol>`:''}
${controls}
</section>`;
}

export function jailPanel(g:Game,viewer:string,check:Check){
 const me=playerById(g,viewer),attempt=me.jailTurns+1,last=attempt>=3;
 const pay=check({type:'bail'}),card=check({type:'jailCard'});
 return `<section class="panel jail" aria-labelledby="panel-title">
${head('Jail',`Attempt ${attempt} of 3`,`<span class="jail-icon" aria-hidden="true">${icon('jail')}</span>`)}
<ol class="attempts" aria-label="Jail attempts">${[1,2,3].map(n=>`<li class="${n<attempt?'used':n===attempt?'now':''}">${n}</li>`).join('')}</ol>
<p class="note">${last?'This is your last attempt. If you miss doubles, you pay $50 and move by that roll.':'Roll doubles to leave and move. Doubles from jail do not earn another roll.'}</p>
<div class="panel-actions column">${act('Roll for doubles',{type:'roll'},check,'primary','dice','data-haptic="light"')}${act('Pay $50 fine',{type:'bail'},check,'secondary','cash')}${act(me.cards.length?`Use Get Out of Jail Free (${me.cards.length})`:'Use Get Out of Jail Free',{type:'jailCard'},check,'secondary','card')}</div>
<ul class="reasons">${pay?`<li><b>Fine:</b> ${me.cash<50?`You need ${money(50-me.cash)} more.`:esc(friendlyReason(pay))}</li>`:''}${card?`<li><b>Card:</b> ${me.cards.length?esc(friendlyReason(card)):'You do not hold a Get Out of Jail Free card.'}</li>`:''}</ul>
</section>`;
}

function debtReason(g:Game){
 const d=g.debt!;
 if(d.rentProperty!==undefined)return`Rent at ${esc(BOARD[d.rentProperty].name)}`;
 if(d.tax)return'Tax';
 if(d.creditor)return'Payment';
 return'Payment to the bank';
}

export function debtPanel(g:Game,viewer:string,check:Check,canTrade:boolean){
 const d=g.debt!,me=playerById(g,viewer),short=Math.max(0,d.amount-me.cash),raise=liquidationValue(g,viewer),creditor=d.creditor?playerById(g,d.creditor):null;
 const progress=Math.min(100,Math.round(me.cash/d.amount*100)),hopeless=me.cash+raise<d.amount;
 return `<section class="panel debt" aria-labelledby="panel-title">
${head(creditor?`${debtReason(g)} · to ${esc(creditor.name)}`:debtReason(g),`Raise ${money(short)}`)}
<div class="debt-meter"><div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${d.amount}" aria-valuenow="${me.cash}" aria-label="Cash towards the debt"><i style="width:${progress}%"></i></div><div class="meter-labels"><span>Cash ${money(me.cash)}</span><span>Owed ${money(d.amount)}</span></div></div>
<p class="note">${hopeless?`${icon('warning')}<span>Selling and mortgaging everything raises at most ${money(raise)}. A trade may still help; otherwise bankruptcy ends your game.</span>`:`<span>You can raise up to ${money(raise)} by selling buildings and mortgaging. The debt is paid automatically once you have enough cash.</span>`}</p>
<div class="panel-actions column"><button class="btn primary" data-do="properties" data-mode="raise">${icon('deeds')}<span>Sell or mortgage</span></button><button class="btn secondary" data-do="trade" ${canTrade?'':'disabled'}>${icon('trade')}<span>Offer a trade</span></button><button class="btn danger-quiet" data-do="confirm-bankrupt" ${check({type:'bankrupt'})?'disabled':''}>${icon('flag')}<span>Declare bankruptcy</span></button></div>
</section>`;
}

/** A trade described from one player's point of view. */
export function tradeSides(g:Game,viewer:string,t:Pick<Trade,'from'|'to'|'give'|'receive'|'giveCash'|'receiveCash'|'giveCards'|'receiveCards'>){
 const fromViewer=t.from===viewer;
 return{
  youGive:fromViewer?{deeds:t.give,cash:t.giveCash,cards:t.giveCards}:{deeds:t.receive,cash:t.receiveCash,cards:t.receiveCards},
  youGet:fromViewer?{deeds:t.receive,cash:t.receiveCash,cards:t.receiveCards}:{deeds:t.give,cash:t.giveCash,cards:t.giveCards},
  partner:fromViewer?t.to:t.from
 };
}
export function assetList(g:Game,side:{deeds:number[];cash:number;cards:number}){
 const items=[...side.deeds.map(i=>`<li class="asset deed-asset" style="--group:${BOARD[i].color}"><i></i><span>${esc(BOARD[i].name)}${g.properties[i].mortgaged?' <small>Mortgaged</small>':''}</span></li>`),...(side.cash?[`<li class="asset cash-asset">${icon('cash')}<span>${money(side.cash)}</span></li>`]:[]),...(side.cards?[`<li class="asset card-asset">${icon('card')}<span>${plural(side.cards,'jail card')}</span></li>`]:[])];
 return items.length?`<ul class="assets">${items.join('')}</ul>`:'<p class="nothing">Nothing</p>';
}
/** Plain-language line such as "You give $100 and Cedar Row. You receive Copper Lane." */
export function tradeSentence(g:Game,viewer:string,t:Parameters<typeof tradeSides>[2]){
 const {youGive,youGet}=tradeSides(g,viewer,t);
 const words=(side:typeof youGive)=>{const parts=[...(side.cash?[money(side.cash)]:[]),...side.deeds.map(i=>BOARD[i].name),...(side.cards?[plural(side.cards,'jail card')]:[])];return parts.length?parts.length>1?`${parts.slice(0,-1).join(', ')} and ${parts.at(-1)}`:parts[0]:'nothing';};
 return`You give ${words(youGive)}. You receive ${words(youGet)}.`;
}

export function tradeComparison(g:Game,viewer:string,t:TradeDraft&{from?:string}){
 const from=t.from??viewer,terms={...t,from},{youGive,youGet,partner}=tradeSides(g,viewer,terms),other=playerById(g,partner);
 const preview=tradePreview(g,from,t),mineAfter=from===viewer?preview.giveCashAfter:preview.receiveCashAfter,theirsAfter=from===viewer?preview.receiveCashAfter:preview.giveCashAfter;
 const completed=from===viewer?preview.completedForSender:preview.completedForReceiver,interest=from===viewer?preview.giveInterest:preview.receiveInterest;
 return `<div class="compare"><section><h3>You give</h3>${assetList(g,youGive)}</section><span class="compare-arrow" aria-hidden="true">${icon('trade')}</span><section><h3>You receive</h3>${assetList(g,youGet)}</section></div>
<dl class="kv tight compare-cash"><div><dt>Your cash after</dt><dd>${money(mineAfter)}</dd></div><div><dt>${esc(other.name)}’s cash after</dt><dd>${money(theirsAfter)}</dd></div>${interest?`<div><dt>Mortgage transfer fee</dt><dd>${money(interest)}</dd></div>`:''}</dl>
${completed.length?`<p class="note good">${icon('check')}<span>Completes your ${completed.map(key=>esc(GROUPS[key].name)).join(', ')} set.</span></p>`:''}
${g.debt&&(g.phase==='debt'||g.trade?.resume==='debt')&&g.debt.player===viewer?`<p class="note">Your ${money(g.debt.amount)} debt is paid from the proceeds if they cover it.</p>`:''}
${preview.error?`<p class="note warn">${icon('warning')}<span>${esc(friendlyReason(preview.error))}</span></p>`:''}`;
}

export function incomingTradePanel(g:Game,viewer:string,check:Check,canCounter:boolean){
 const t=g.trade!,from=playerById(g,t.from),round=t.round??0;
 return `<section class="panel trade-offer" aria-labelledby="panel-title">
${head(round?`Counteroffer ${round} of ${MAX_COUNTER_OFFERS}`:'Trade offer',`${esc(from.name)} proposes`,avatar(g,from,'md'))}
${tradeComparison(g,viewer,{...t,type:'offerTrade',to:t.to,from:t.from})}
<p class="sentence">${esc(tradeSentence(g,viewer,t))}</p>
<div class="panel-actions">${act('Decline',{type:'rejectTrade'},check,'secondary','close')}<button class="btn secondary" data-do="counter-trade" ${canCounter?'':'disabled'}>${icon('trade')}<span>Counter</span></button>${act('Accept',{type:'acceptTrade'},check,'primary','check','data-haptic="success"')}</div>
${canCounter?'':`<p class="note">${round>=MAX_COUNTER_OFFERS?'This negotiation has used all three counteroffers.':''}</p>`}
</section>`;
}
