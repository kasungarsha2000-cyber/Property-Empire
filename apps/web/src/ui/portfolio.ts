import {BOARD,GROUPS} from '../../../../packages/core/board';
import {netWorth,playerById,rentFor} from '../../../../packages/core/engine';
import type {Action,Game} from '../../../../packages/core/types';
import {esc,icon,money,playerColor} from './dom';
import {buildingPips,developmentLabel,friendlyReason,type Check} from './deed';

export type PortfolioFilter='mine'|'all'|'bank';
export interface PortfolioOptions {viewer:string|null;filter:PortfolioFilter;raise:boolean;check:Check}

function rentLine(g:Game,index:number){
 const s=BOARD[index],v=g.properties[index];
 if(v.mortgaged)return'Mortgaged · no rent';
 if(!v.owner)return`For sale · ${money(s.price)}`;
 const rent=s.type==='utility'?`${rentFor(g,index,1)}× dice`:money(rentFor(g,index,0));
 return s.type==='street'?`Rent ${rent} · ${developmentLabel(v.level)}`:`Rent ${rent}`;
}

function quick(action:Action,check:Check,iconName:string,label:string,amount?:string){
 const reason=check(action);
 return `<button class="btn quick ${amount?'with-amount':''}" data-action="${esc(JSON.stringify(action))}" aria-label="${esc(label)}" title="${esc(reason?friendlyReason(reason):label)}" ${reason?'disabled':''}>${icon(iconName)}${amount?`<span>${amount}</span>`:''}</button>`;
}

function ownedRow(g:Game,index:number,o:PortfolioOptions){
 const s=BOARD[index],v=g.properties[index],buttons:string[]=[];
 if(s.type==='street'){
  if(!o.raise)buttons.push(quick({type:'build',property:index},o.check,'build',`${v.level===4?'Build a hotel':'Build a house'} on ${s.name} for ${money(s.buildCost)}`));
  if(v.level>0)buttons.push(quick({type:'sell',property:index},o.check,'sell',`Sell a building on ${s.name} for ${money(s.buildCost/2)}`,o.raise&&v.level?`+${money(s.buildCost/2)}`:undefined));
 }
 buttons.push(v.mortgaged?quick({type:'unmortgage',property:index},o.check,'unlock',`Lift the mortgage on ${s.name} for ${money(Math.ceil(s.mortgage*1.1))}`):quick({type:'mortgage',property:index},o.check,'lock',`Mortgage ${s.name} for ${money(s.mortgage)}`,o.raise?`+${money(s.mortgage)}`:undefined));
 return `<li class="prop-row ${v.mortgaged?'mortgaged':''}" style="--group:${s.color}"><button class="prop-main" data-do="open-deed" data-index="${index}"><span class="prop-swatch" aria-hidden="true"></span><span class="prop-text"><strong>${esc(s.name)}</strong><small>${esc(rentLine(g,index))}</small></span>${buildingPips(v.level)}</button><div class="prop-quick">${buttons.join('')}</div></li>`;
}

function otherRow(g:Game,index:number,viewer:string|null){
 const s=BOARD[index],v=g.properties[index],owner=v.owner?playerById(g,v.owner):null;
 return `<li class="prop-row" style="--group:${s.color}"><button class="prop-main" data-do="open-deed" data-index="${index}"><span class="prop-swatch" aria-hidden="true"></span><span class="prop-text"><strong>${esc(s.name)}</strong><small>${esc(rentLine(g,index))}</small></span>${buildingPips(v.level)}${owner?`<span class="owner-chip ${owner.id===viewer?'mine':''}" style="--player:${playerColor(g,owner)}"><i></i>${owner.id===viewer?'Yours':esc(owner.name)}</span>`:'<span class="owner-chip bank">Bank</span>'}</button></li>`;
}

export function portfolioSheet(g:Game,o:PortfolioOptions){
 const me=o.viewer?g.players.find(p=>p.id===o.viewer)??null:null;
 const tabs=(['mine','all','bank'] as const).map(key=>`<button role="tab" class="seg ${o.filter===key?'on':''}" aria-selected="${o.filter===key}" data-filter="${key}">${{mine:'Yours',all:'All',bank:'For sale'}[key]}</button>`).join('');
 let banner='';
 if(o.raise&&me){
  if(g.debt?.player===me.id)banner=`<div class="banner warn">${icon('cash')}<span><b>Raise ${money(Math.max(0,g.debt.amount-me.cash))}</b> · you owe ${money(g.debt.amount)}. Sell buildings or mortgage below; the debt is paid automatically.</span></div>`;
  else if(g.phase==='purchase'&&g.pendingProperty!==null){const need=BOARD[g.pendingProperty].price-me.cash;banner=`<div class="banner ${need>0?'warn':'good'}">${icon('cash')}<span>${need>0?`<b>Raise ${money(need)}</b> to buy ${esc(BOARD[g.pendingProperty].name)}.`:`You can now afford ${esc(BOARD[g.pendingProperty].name)}.`}</span></div>`;}
 }
 const groups=Object.keys(GROUPS).map(key=>{
  const members=BOARD.filter(s=>s.group===key);
  const shown=members.filter(s=>o.filter==='all'||(o.filter==='bank'?!g.properties[s.index].owner:g.properties[s.index].owner===o.viewer));
  if(!shown.length)return'';
  const owned=members.filter(s=>g.properties[s.index].owner===o.viewer).length,complete=owned===members.length;
  const missing=o.filter==='mine'&&!complete&&members.length-owned===1&&key!=='transport'&&key!=='utility'?members.find(s=>g.properties[s.index].owner!==o.viewer)!:null;
  const missingOwner=missing&&g.properties[missing.index].owner?playerById(g,g.properties[missing.index].owner!):null;
  return `<section class="set" style="--group:${GROUPS[key].color}"><header class="set-head"><span class="set-dot" aria-hidden="true"></span><h3>${esc(GROUPS[key].name)}</h3><span class="set-count ${complete?'complete':''}">${o.viewer?`${owned}/${members.length}${complete?` ${icon('check')}`:''}`:members.length}</span></header><ul class="prop-list">${shown.map(s=>o.filter==='mine'?ownedRow(g,s.index,o):otherRow(g,s.index,o.viewer)).join('')}</ul>${missing?`<p class="set-missing">One away: <b>${esc(missing.name)}</b> · ${missingOwner?`owned by ${esc(missingOwner.name)}`:'still for sale'}${missingOwner&&missingOwner.id!==o.viewer?` <button class="link" data-trade-for="${missing.index}">Ask to trade</button>`:''}</p>`:''}</section>`;
 }).join('');
 const empty=o.filter==='mine'?`<div class="empty">${icon('deeds')}<h3>No properties yet</h3><p>Land on a street, station or utility to buy it. Your deeds appear here, grouped by colour set.</p><button class="btn secondary small" data-filter="bank">See what’s for sale</button></div>`:'<div class="empty"><p>Nothing to show.</p></div>';
 return `<div class="sheet-body portfolio">
${me?`<div class="summary-row"><div><span>Cash</span><strong>${money(me.cash)}</strong></div><div><span>Net worth</span><strong>${money(netWorth(g,me))}</strong></div><div><span>Houses · hotels</span><strong>${g.houses} · ${g.hotels}</strong></div></div>`:''}
${banner}
<div class="segmented" role="tablist" aria-label="Filter properties">${tabs}</div>
<div class="sets" data-scroll="portfolio">${groups||empty}</div>
</div>`;
}
