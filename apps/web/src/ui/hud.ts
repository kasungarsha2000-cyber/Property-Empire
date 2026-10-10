import type {Game} from '../../../../packages/core/types';
import {avatar,esc,icon,money} from './dom';
import type {DockModel} from './turn-state';

export interface HudContext {viewer:string|null;lan:boolean;room?:string;online:boolean;offline:Set<string>}

export function hudMarkup(g:Game,ctx:HudContext){
 const active=g.players[g.current],live=g.players.filter(p=>!p.bankrupt).length;
 const chips=g.players.map(p=>{
  const classes=['chip-player',p.id===active.id&&g.phase!=='ended'?'active':'',p.id===ctx.viewer?'mine':'',p.bankrupt?'out':'',ctx.offline.has(p.id)?'offline':''].filter(Boolean).join(' ');
  const badge=p.bankrupt?'':ctx.offline.has(p.id)?`<span class="cp-badge offline">${icon('offline')}</span>`:p.jailed?`<span class="cp-badge jail">${icon('jail')}</span>`:p.bot?`<span class="cp-badge">${icon('bot')}</span>`:'';
  const label=`${p.name}${p.id===ctx.viewer?' (you)':''}: ${money(p.cash)}${p.bankrupt?', bankrupt':p.jailed?', in jail':''}${p.bot?', computer player':''}${p.id===active.id?', current turn':''}`;
  return `<button class="${classes}" data-player="${esc(p.id)}" aria-label="${esc(label)}">${avatar(g,p,'sm')}${badge}<span class="cp-text"><b>${p.id===ctx.viewer?'You':esc(p.name)}</b><span class="player-cash">${money(p.cash)}</span></span></button>`;
 }).join('');
 return `<div class="hud"><div class="hud-line"><span class="round">Turn ${g.turn}${g.config.turnLimit?` of ${g.config.turnLimit}`:''}</span><span class="sep">·</span><span>${ctx.lan?`Room ${esc(ctx.room??'')}`:`${live} players`}</span>${ctx.lan?`<span class="conn ${ctx.online?'':'off'}"><i></i>${ctx.online?'Connected':'Reconnecting'}</span>`:''}</div><div class="player-strip" data-count="${g.players.length}" role="list" aria-label="Players">${chips}</div></div>`;
}

export function dockMarkup(g:Game,model:DockModel,tools:{canTrade:boolean;incoming:boolean;compact?:boolean}){
 const actor=model.actor?g.players.find(p=>p.id===model.actor):null;
 const roll=g.log.length&&model.mood==='moving'?g.dice:null;
 const primary=model.primary?`<button class="btn primary dock-primary" ${model.primary.action?`data-action="${esc(JSON.stringify(model.primary.action))}"`:`data-do="${model.primary.command}"`} ${model.primary.disabled?'disabled':''} data-haptic="light">${icon(model.primary.icon)}<span>${esc(model.primary.label)}</span></button>`
  :`<div class="dock-waiting">${model.mood==='moving'||model.mood==='other'?'<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>':''}<span>${model.mood==='moving'?'Moving':model.mood==='offline'?'Offline':model.mood==='other'?'Waiting':''}</span></div>`;
 return `<div class="dock${tools.compact?' compact':''}">
<div class="dock-status mood-${model.mood}" role="status" aria-live="polite">${actor?avatar(g,actor,'sm'):''}<span class="dock-status-text"><b>${esc(model.title)}</b><small>${esc(model.detail)}</small></span>${roll?`<span class="dice-badge" aria-label="Rolled ${roll[0]} and ${roll[1]}"><i>${roll[0]}</i><i>${roll[1]}</i></span>`:''}</div>
<div class="dock-row"><button class="tool" data-do="properties">${icon('deeds')}<span>Properties</span></button><button class="tool" data-do="trade" ${tools.canTrade?'':'disabled'}>${icon('trade')}<span>Trade</span></button><div class="dock-center">${primary}</div><button class="tool" data-do="bank">${icon('bank')}<span>Bank</span></button><button class="tool" data-do="game-menu">${icon('menu')}<span>Menu</span></button></div>
</div>`;
}
