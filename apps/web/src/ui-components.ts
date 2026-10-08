import {BOARD,GROUPS,PLAYER_COLORS,netWorth,playerById} from '../../../packages/core/index';
import type {Game,Player} from '../../../packages/core/types';
import {propertyArtwork} from './property-art';
import {portfolioGroups,tradable,tradePreview,type TradeDraft} from './game-ui';

export const escapeHTML=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money=(amount:number)=>`$${amount.toLocaleString('en-US')}`;
 const status=(g:Game,index:number)=>g.properties[index].mortgaged?'Mortgaged':g.properties[index].level===5?'Hotel':g.properties[index].level?`${g.properties[index].level} house${g.properties[index].level===1?'':'s'}`:'No buildings';

export function portfolioMarkup(g:Game,me:Player|null,canTrade:boolean){
 if(!me)return '<section class="portfolio"><h2>City portfolio</h2><p>Choose a property to inspect its deed.</p></section>';
 const groups=portfolioGroups(g,me.id),count=groups.reduce((sum,group)=>sum+group.owned.length,0);
 return `<section class="portfolio" style="--you:${PLAYER_COLORS[me.token??g.players.indexOf(me)]}">
  <div class="portfolio-heading"><div><span>Your empire</span><h2>Your properties</h2></div><span class="property-count">${count}</span></div>
  <div class="portfolio-money"><div><span>Your cash</span><strong>${money(me.cash)}</strong></div><div><span>Total net worth</span><strong>${money(netWorth(g,me))}</strong></div></div>
  <button class="ownership-toggle" data-do="highlight-owned" aria-pressed="true"><span class="ownership-marker"></span>Highlight mine on board</button>
  <div class="portfolio-scroll">${groups.length?groups.map(group=>`<details class="portfolio-group" open style="--group:${GROUPS[group.key].color}"><summary><span class="district-dot"></span><strong>${escapeHTML(GROUPS[group.key].name)}</strong><span class="group-progress ${group.complete?'complete':''}">${group.owned.length}/${group.owned.length+group.missing.length}${group.complete?' ✓':''}</span></summary><div>${group.owned.map(index=>`<button class="portfolio-property" data-space="${index}" aria-label="Inspect your ${escapeHTML(BOARD[index].name)}"><span class="portfolio-art">${propertyArtwork(index,g.properties[index].level)}</span><span><strong>${escapeHTML(BOARD[index].name)}</strong><small>${status(g,index)}</small></span><span class="owned-check">✓</span></button>`).join('')}${group.missing.length===1&&BOARD[group.missing[0]].type==='street'?missingDeed(g,group.missing[0],canTrade):group.complete&&BOARD[group.owned[0]].type==='street'?'<p class="set-complete">Complete color group</p>':''}</div></details>`).join(''):'<div class="portfolio-empty"><div class="empty-deed">⌂</div><h3>Your first deed awaits.</h3><p>Buy a property when you land on it. It will appear here, grouped by district.</p><button data-do="bank-deeds">Explore available properties</button></div>'}</div>
  <button class="all-deeds-link" data-do="properties">Browse all title deeds</button>
 </section>`;
}
function missingDeed(g:Game,index:number,canTrade:boolean){
 const property=g.properties[index],owner=g.players.find(p=>p.id===property.owner);
 return `<div class="missing-deed"><span>One deed from a complete set</span><strong>${escapeHTML(BOARD[index].name)}</strong><small>${owner?`Owned by ${escapeHTML(owner.name)}`:'Available from the bank'}</small>${owner?`<button data-trade-for="${index}" ${canTrade&&tradable(g,index)?'':'disabled'} title="${!canTrade?'Trade during your turn':!tradable(g,index)?'The owner must sell group buildings first':'Start a trade for this deed'}">Trade for this property</button>`:`<button data-space="${index}">View available deed</button>`}</div>`;
}

export function tradeFormMarkup(g:Game,from:string,draft:TradeDraft){
 const you=playerById(g,from),partner=playerById(g,draft.to),partners=g.players.filter(p=>p.id!==from&&!p.bankrupt);
 const side=(p:Player,direction:'give'|'receive')=>{
  const indices=BOARD.filter(s=>g.properties[s.index].owner===p.id);
  return `<section class="trade-side" style="--party:${PLAYER_COLORS[p.token??g.players.indexOf(p)]}"><header><span class="party-dot"></span><div><h3>${direction==='give'?'You give':'You receive'}</h3><p>${escapeHTML(p.name)} · ${money(p.cash)} cash</p></div><span class="trade-count" data-count="${direction}">${draft[direction].length}</span></header>
   <div class="trade-cash-fields"><label>${direction==='give'?'Cash you give':'Cash you receive'}<span class="currency-input"><span>$</span><input type="number" name="${direction}Cash" min="0" max="${p.cash}" value="${draft[`${direction}Cash`]}" required></span></label>${p.cards.length?`<label>Jail cards<input type="number" name="${direction}Cards" min="0" max="${p.cards.length}" value="${draft[`${direction}Cards`]}" required></label>`:`<input type="hidden" name="${direction}Cards" value="0">`}</div>
   <p class="trade-pick-label">Select properties to include</p><div class="trade-deed-grid">${indices.length?indices.map(s=>{
    const eligible=tradable(g,s.index),property=g.properties[s.index];
    return `<label class="trade-choice ${eligible?'':'trade-blocked'}" style="--group:${s.color}"><input type="checkbox" name="${direction}" value="${s.index}" ${draft[direction].includes(s.index)?'checked':''} ${eligible?'':'disabled'} aria-label="${escapeHTML(s.name)}"><span class="trade-choice-face"><span class="trade-choice-art">${propertyArtwork(s.index,property.level)}</span><strong>${escapeHTML(s.name)}</strong><small>${property.mortgaged?'Mortgaged · 10% transfer fee':eligible?money(s.price):'Sell group buildings to trade'}</small></span></label>`;
   }).join(''):'<div class="trade-no-deeds"><strong>No deeds to include yet.</strong><p>You can still offer cash or jail cards.</p></div>'}</div></section>`;
 };
 return `<form id="trade-form"><div class="trade-builder-heading"><label>Trade with<select name="partner" id="trade-partner">${partners.map(p=>`<option value="${escapeHTML(p.id)}" ${p.id===draft.to?'selected':''}>${escapeHTML(p.name)}${p.bot?' · Bot':''}</option>`).join('')}</select></label><p>Pick the cards on each side, add cash, then review your offer. The other player decides whether to accept.</p></div><div class="visual-trade-columns">${side(you,'give')}${side(partner,'receive')}</div><div id="trade-live-summary" aria-live="polite"></div><div class="trade-form-footer"><span>Nothing changes until the offer is accepted.</span><button class="primary" type="submit">Review trade</button></div></form>`;
}

export function tradeSummaryMarkup(g:Game,from:string,draft:TradeDraft,compact=false){
 const preview=tradePreview(g,from,draft),you=playerById(g,from),other=playerById(g,draft.to);
 const items=(indices:number[],cash:number,cards:number)=>`${indices.map(index=>`<div class="trade-summary-deed" style="--group:${BOARD[index].color}"><span>${propertyArtwork(index)}</span><strong>${escapeHTML(BOARD[index].name)}${g.properties[index].mortgaged?'<small>Mortgaged</small>':''}</strong></div>`).join('')}${cash?`<div class="trade-summary-cash"><span>Cash</span><strong>${money(cash)}</strong></div>`:''}${cards?`<div class="trade-summary-cash"><span>Jail cards</span><strong>${cards}</strong></div>`:''}${!indices.length&&!cash&&!cards?'<p class="nothing-included">Nothing included</p>':''}`;
 const benefits=(groups:string[])=>groups.length?`<div class="trade-benefit">Completes ${groups.map(key=>escapeHTML(GROUPS[key].name)).join(', ')}</div>`:'';
 return `<div class="trade-summary ${compact?'compact':''}"><div class="trade-summary-columns"><section><h3>${escapeHTML(you.name)} gives</h3>${items(draft.give,draft.giveCash,draft.giveCards)}<div class="trade-after"><span>Cash after acceptance</span><strong>${money(preview.giveCashAfter)}</strong>${preview.giveInterest?`<small>Includes ${money(preview.giveInterest)} mortgage transfer interest</small>`:''}</div>${benefits(preview.completedForSender)}</section><section><h3>${escapeHTML(other.name)} gives</h3>${items(draft.receive,draft.receiveCash,draft.receiveCards)}<div class="trade-after"><span>Cash after acceptance</span><strong>${money(preview.receiveCashAfter)}</strong>${preview.receiveInterest?`<small>Includes ${money(preview.receiveInterest)} mortgage transfer interest</small>`:''}</div>${benefits(preview.completedForReceiver)}</section></div>${g.debt&&(g.phase==='debt'||g.trade?.resume==='debt')?`<p class="trade-debt-note">Cash after acceptance includes the ${money(g.debt.amount)} debt payment if it can be cleared.</p>`:''}${preview.error?`<p class="trade-validation">${escapeHTML(preview.error)}</p>`:''}</div>`;
}
