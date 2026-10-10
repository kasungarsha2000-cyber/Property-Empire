import {BOARD,GROUPS,groupSpaces} from '../../../../packages/core/board';
import {rentFor} from '../../../../packages/core/engine';
import type {Action,Game} from '../../../../packages/core/types';
import {deedFinancials,propertyArtwork} from '../property-art';
import {tradable} from '../game-ui';
import {esc,icon,money,playerColor,plural} from './dom';

/** Engine verdict for an action: null when allowed, otherwise the engine's own explanation. */
export type Check=(action:Action)=>string|null;

const TYPE_LABEL:Record<string,string>={street:'Street',transport:'Station',utility:'Utility'};
export function spaceKicker(index:number){const s=BOARD[index];return s.price?`${GROUPS[s.group].name} · ${TYPE_LABEL[s.type]}`:'City space';}

export function spaceExplanation(g:Game,index:number){
 const s=BOARD[index];
 return({go:'Collect $200 each time you pass or land on Start.',tax:`Pay ${money(s.amount)} to the city.`,chance:'Draw a Chance card. It may move you, pay you, charge you or send you to jail.',community:'Draw a Community Chest card and follow its instructions.',jail:'Just visiting? Carry on. In jail? Pay $50, use a card, or roll doubles.',goJail:'Go directly to jail. Do not pass Start or collect $200.',parking:g.config.jackpot?`House rule: collect the tax jackpot, now ${money(g.pot)}.`:'A free rest stop. Nothing happens here in classic rules.'} as Record<string,string>)[s.type]??'';
}

export function developmentLabel(level:number){return level===5?'Hotel':level?plural(level,'house'):'No buildings';}

/** Pips for houses or a hotel marker; textual label stays available for screen readers. */
export function buildingPips(level:number){
 if(!level)return'';
 return `<span class="pips" aria-label="${developmentLabel(level)}">${level===5?'<i class="pip hotel"></i>':'<i class="pip"></i>'.repeat(level)}</span>`;
}

function ownerChip(g:Game,owner:string|null,viewer:string|null){
 if(!owner)return'<span class="owner-chip bank">For sale</span>';
 const p=g.players.find(player=>player.id===owner)!;
 return `<span class="owner-chip ${owner===viewer?'mine':''}" style="--player:${playerColor(g,p)}"><i></i>${owner===viewer?'Yours':esc(p.name)}</span>`;
}

function currentRent(g:Game,index:number){
 const s=BOARD[index],v=g.properties[index];
 if(!v.owner)return s.type==='street'?money(s.rents[0]):s.type==='transport'?money(25):'4× dice';
 if(v.mortgaged)return'Paused';
 if(s.type==='utility')return`${rentFor(g,index,1)}× dice`;
 return money(rentFor(g,index,0));
}

export function deedPreview(g:Game,index:number,viewer:string|null){
 const s=BOARD[index];
 if(!s.price)return `<div class="preview" style="--group:${s.color}"><span class="preview-band" aria-hidden="true"></span><div class="preview-main"><div class="preview-title"><strong>${esc(s.name)}</strong><small>City space</small></div><p class="preview-note">${esc(spaceExplanation(g,index))}</p></div><div class="preview-actions"><button class="btn icon-only quiet" data-do="focus-tile" aria-label="Centre the camera on ${esc(s.name)}">${icon('target')}</button><button class="btn icon-only quiet" data-do="close-preview" aria-label="Close preview">${icon('close')}</button></div></div>`;
 const v=g.properties[index];
 return `<div class="preview" style="--group:${s.color}"><span class="preview-band" aria-hidden="true"></span><div class="preview-main"><div class="preview-title"><strong>${esc(s.name)}</strong><small>${esc(spaceKicker(index))}</small></div><div class="preview-meta">${ownerChip(g,v.owner,viewer)}<span>${v.owner?'Rent':'Price'} <b>${v.owner?currentRent(g,index):money(s.price)}</b></span>${buildingPips(v.level)}${v.mortgaged?'<span class="tag warn">Mortgaged</span>':''}</div></div><div class="preview-actions"><button class="btn small secondary" data-do="open-deed" data-index="${index}">Details</button><button class="btn icon-only quiet" data-do="close-preview" aria-label="Close preview">${icon('close')}</button></div></div>`;
}

export interface DeedContext {viewer:string|null;check:Check;canTrade:boolean}

function actionButton(label:string,action:Action,check:Check,tone='secondary',iconName?:string){
 const reason=check(action);
 return `<button class="btn ${tone}" data-action="${esc(JSON.stringify(action))}" ${reason?`disabled aria-describedby="reason-${action.type}"`:''}>${iconName?icon(iconName):''}<span>${esc(label)}</span></button>`;
}

/** The first reason that explains why a management action is unavailable. */
function reasons(entries:[string,Action][],check:Check){
 const lines=entries.map(([label,action])=>{const reason=check(action);return reason?`<li id="reason-${action.type}"><b>${esc(label)}:</b> ${esc(friendlyReason(reason))}</li>`:'';}).filter(Boolean);
 return lines.length?`<ul class="reasons">${lines.join('')}</ul>`:'';
}
/** Engine messages are precise; a few generic ones get player-facing wording. */
export function friendlyReason(reason:string){
 if(/Insufficient cash|currency limit/.test(reason))return'Not enough cash.';
 if(reason==='Finish the pending action first')return'Finish the current decision first.';
 if(reason==='It is not your turn')return'Only on your turn.';
 if(reason==='Unavailable')return'Not available right now.';
 return reason.endsWith('.')?reason:`${reason}.`;
}

export function deedSheet(g:Game,index:number,ctx:DeedContext){
 const s=BOARD[index],v=g.properties[index];
 if(!s.price)return `<article class="deed" style="--group:${s.color}"><header class="deed-band"><span class="deed-kicker">City space</span><h2>${esc(s.name)}</h2></header><p class="deed-text">${esc(spaceExplanation(g,index))}</p><div class="deed-actions"><button class="btn secondary" data-do="focus-tile" data-index="${index}">${icon('target')}<span>Show on board</span></button></div></article>`;
 const owner=v.owner?g.players.find(p=>p.id===v.owner)!:null,yours=!!owner&&owner.id===ctx.viewer,financials=deedFinancials(g,index),group=groupSpaces(index);
 const set=`<div class="set-chips">${group.map(space=>{const held=g.players.find(p=>p.id===g.properties[space.index].owner);return`<span class="set-chip ${space.index===index?'current':''}" style="--player:${held?playerColor(g,held):'transparent'}"><i></i>${esc(space.name)}<small>${held?(held.id===ctx.viewer?'You':esc(held.name)):'Bank'}</small></span>`;}).join('')}</div>`;
 const costs=[
  ['Mortgage value',money(s.mortgage)],
  ...(v.mortgaged?[['Lift mortgage',money(Math.ceil(s.mortgage*1.1))]]:[]),
  ...(s.buildCost?[['Each house',money(s.buildCost)],['Hotel',`${money(s.buildCost)} + 4 houses`]]:[])
 ];
 let actions='';
 if(yours){
  const entries:[string,Action][]=[];
  if(s.type==='street'){entries.push([v.level===4?'Build hotel':'Build house',{type:'build',property:index}]);if(v.level>0)entries.push([v.level===5?'Sell hotel':'Sell house',{type:'sell',property:index}]);}
  entries.push(v.mortgaged?['Lift mortgage',{type:'unmortgage',property:index}]:['Mortgage',{type:'mortgage',property:index}]);
  const group=s.type==='street'&&groupSpaces(index).some(space=>g.properties[space.index].level>0)?[['Sell all group buildings',{type:'sellGroup',property:index}] as [string,Action]]:[];
  const labels:Record<string,string>={build:`${v.level===4?'Build hotel':'Build house'} · ${money(s.buildCost)}`,sell:`${v.level===5?'Sell hotel':'Sell house'} · +${money(s.buildCost/2)}`,mortgage:`Mortgage · +${money(s.mortgage)}`,unmortgage:`Lift mortgage · ${money(Math.ceil(s.mortgage*1.1))}`,sellGroup:'Sell all group buildings'};
  const icons:Record<string,string>={build:'build',sell:'sell',mortgage:'lock',unmortgage:'unlock',sellGroup:'sell'};
  actions=`<div class="deed-actions grid">${[...entries,...group].map(([,action])=>actionButton(labels[action.type],action,ctx.check,action.type==='build'?'primary':'secondary',icons[action.type])).join('')}</div>${reasons(entries,ctx.check)}`;
 }else if(owner){
  const blocked=!tradable(g,index)?'The owner must sell this group’s buildings before trading it.':!ctx.canTrade?'You can propose trades on your turn.':'';
  actions=`<div class="deed-actions"><button class="btn secondary" data-trade-for="${index}" ${blocked?'disabled':''}>${icon('trade')}<span>Trade for this property</span></button></div>${blocked?`<ul class="reasons"><li>${esc(blocked)}</li></ul>`:''}`;
 }else if(g.phase==='purchase'&&g.pendingProperty===index){
  actions=`<div class="deed-actions">${actionButton(`Buy for ${money(s.price)}`,{type:'buy'},ctx.check,'primary')}${actionButton('Auction',{type:'decline'},ctx.check)}</div>`;
 }
 return `<article class="deed ${v.mortgaged?'is-mortgaged':''}" style="--group:${s.color}">
<header class="deed-band"><span class="deed-kicker">${esc(spaceKicker(index))}</span><h2>${esc(s.name)}</h2>${ownerChip(g,v.owner,ctx.viewer)}</header>
<figure class="deed-art">${propertyArtwork(index,v.level)}${v.mortgaged?'<span class="stamp">Mortgaged</span>':''}</figure>
<div class="stat-row"><div><span>Price</span><strong>${money(s.price)}</strong></div><div><span>${esc(financials.rentLabel)}</span><strong>${esc(financials.rent)}</strong></div>${s.type==='street'?`<div><span>Buildings</span><strong>${v.level===5?'Hotel':v.level?plural(v.level,'house'):'None'}</strong></div>`:`<div><span>Owned in set</span><strong>${financials.count} of ${financials.groupSize}</strong></div>`}</div>
${actions}
<section class="deed-section"><h3>Rent</h3><dl class="rent-table">${financials.rows.map(row=>`<div class="${row.active?'active':''}"><dt>${esc(row.label)}</dt><dd>${row.value}</dd></div>`).join('')}</dl>${s.type==='utility'?'<p class="deed-note">Multiply the dice total that brought the player here.</p>':s.type==='street'?'<p class="deed-note">A complete set doubles rent on streets without buildings.</p>':''}</section>
<section class="deed-section"><h3>${s.type==='street'?'Colour set':s.type==='transport'?'Stations':'Utilities'}</h3>${set}</section>
<section class="deed-section"><h3>Costs</h3><dl class="kv">${costs.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></section>
<div class="deed-foot"><button class="btn quiet" data-do="focus-tile" data-index="${index}">${icon('target')}<span>Show on board</span></button></div>
</article>`;
}
