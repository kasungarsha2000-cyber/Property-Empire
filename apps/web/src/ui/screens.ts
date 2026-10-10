import {PLAYER_COLORS} from '../../../../packages/core/board';
import {TOKEN_NAMES} from '../scene-assets';
import type {RoomView} from '../network';
import type {SaveSummary} from '../storage';
import {COLOR_NAMES,esc,icon,tokenIcon} from './dom';

export interface MenuContext {save:SaveSummary|null|undefined;session:{code:string;host:string}|null;native:boolean}
function ago(time:number){const minutes=Math.round((Date.now()-time)/60000);if(minutes<1)return'just now';if(minutes<60)return`${minutes} min ago`;const hours=Math.round(minutes/60);if(hours<24)return`${hours} h ago`;const days=Math.round(hours/24);return`${days} day${days===1?'':'s'} ago`;}

export function menuTop(){
 return `<div class="brand-bar"><span class="mark" aria-hidden="true">${icon('home')}</span><div class="bar-actions"><button class="btn icon-only quiet" data-do="rules" aria-label="How to play">${icon('help')}</button><button class="btn icon-only quiet" data-do="settings" aria-label="Settings">${icon('settings')}</button></div></div>`;
}

export function menuPanel(ctx:MenuContext){
 const save=ctx.save,loading=save===undefined;
 const saveLine=loading?'Checking this device…':save?`Turn ${save.turn} · ${save.players} players · saved ${ago(save.savedAt)}${save.finished?' · finished':''}`:'No saved game on this device yet';
 return `<div class="menu-panel">
<div class="menu-heading"><h1>PROPERTY EMPIRE</h1><p>Buy streets, build a skyline and outlast your rivals.</p></div>
<button class="btn primary hero-button" data-nav="solo">${icon('dice')}<span><b>Play solo</b><small>You against 1–7 computer rivals</small></span>${icon('chevron')}</button>
<div class="menu-row"><button class="btn secondary" data-nav="host">${icon('wifi')}<span>Host LAN game</span></button><button class="btn secondary" data-nav="join">${icon('join')}<span>Join LAN game</span></button></div>
<div class="menu-resume">
<button class="list-button" data-do="continue" ${save?'':'disabled'}>${icon('save')}<span><b>Continue saved game</b><small>${esc(saveLine)}</small></span>${icon('chevron')}</button>
${ctx.session?`<button class="list-button" data-do="rejoin">${icon('wifi')}<span><b>Rejoin LAN game</b><small>Room ${esc(ctx.session.code)} · ${esc(ctx.session.host)}</small></span>${icon('chevron')}</button>`:''}
</div>
<p class="credit">Developed by <b>Kasun Samarasinghe</b></p>
</div>`;
}

function tokenPicker(selected:number,taken:number[]=[]){
 return `<fieldset class="token-picker"><legend>Token</legend><div class="token-grid">${PLAYER_COLORS.map((color,i)=>`<label class="token-option" style="--player:${color}"><input type="radio" name="token" value="${i}" ${i===selected?'checked':''} ${taken.includes(i)&&i!==selected?'disabled':''}><span class="avatar avatar-md">${tokenIcon(i)}</span><small>${esc(TOKEN_NAMES[i])}</small><span class="sr-only">${COLOR_NAMES[i]}</span></label>`).join('')}</div></fieldset>`;
}
function radios(name:string,label:string,options:[string,string][],value:string){
 return `<div class="field"><span class="field-label">${label}</span><div class="segmented" role="radiogroup" aria-label="${esc(label)}">${options.map(([v,text])=>`<label class="seg"><input type="radio" name="${name}" value="${v}" ${v===value?'checked':''}><span>${text}</span></label>`).join('')}</div></div>`;
}
function numberStepper(name:string,label:string,value:number,min:number,max:number,detail=''){
 return `<div class="field stepper-field"><span class="field-label">${label}${detail?`<small>${detail}</small>`:''}</span><div class="stepper" role="group" aria-label="${esc(label)}"><button type="button" class="btn icon-only secondary" data-form-step="${name}" data-step="-1" aria-label="Fewer">${icon('minus')}</button><label class="stepper-value"><input type="number" name="${name}" min="${min}" max="${max}" value="${value}" inputmode="numeric" aria-label="${esc(label)}"></label><button type="button" class="btn icon-only secondary" data-form-step="${name}" data-step="1" aria-label="More">${icon('plus')}</button></div></div>`;
}
function rules(){
 return `<section class="form-card"><h2>Rules</h2>${radios('cash','Starting cash',[['1000','$1,000'],['1500','$1,500'],['2000','$2,000']],'1500')}${radios('length','Game length',[['0','Classic'],['80','Quick'],['160','Extended']],'0')}<p class="field-note" data-length-note>Classic: play until one player remains.</p><label class="toggle-row"><span class="row-text"><b>Free Parking jackpot</b><small>House rule · taxes collect on Free Parking</small></span><input type="checkbox" role="switch" name="jackpot"><i class="switch" aria-hidden="true"></i></label></section>`;
}
function hostField(value:string,required:boolean,label='Host computer'){
 return `<section class="form-card"><h2>${label}</h2><label class="field"><span class="field-label">Address<small>Shown in the host’s terminal, e.g. 192.168.1.5:3001</small></span><input name="server" value="${esc(value)}" ${required?'required':''} inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="192.168.1.5:3001"></label><p class="field-note">The host computer runs <b>run.bat</b> or <b>npm run start:lan</b>. Every device must be on the same Wi-Fi or hotspot.</p></section>`;
}

export interface SetupContext {kind:'solo'|'host'|'join';name:string;token:number;host:string;native:boolean;room?:string}
export function setupPage(ctx:SetupContext){
 const title={solo:'New solo game',host:'Host a LAN game',join:'Join a LAN game'}[ctx.kind];
 const you=`<section class="form-card"><h2>You</h2><label class="field"><span class="field-label">Name</span><input name="name" value="${esc(ctx.name)}" maxlength="24" required autocomplete="nickname"></label>${tokenPicker(ctx.token)}</section>`;
 const opponents=`<section class="form-card"><h2>${ctx.kind==='host'?'Computer opponents':'Opponents'}</h2>${numberStepper('bots','Bots',ctx.kind==='solo'?3:1,ctx.kind==='solo'?1:0,7,ctx.kind==='host'?'Friends who join take the other seats':'')}${radios('difficulty','Difficulty',[['easy','Easy'],['medium','Medium'],['hard','Hard']],'medium')}</section>`;
 const body=ctx.kind==='join'
  ?`${you}<section class="form-card"><h2>Room</h2><label class="field"><span class="field-label">Room code</span><input name="code" class="code-input" value="${esc(ctx.room??'')}" required minlength="6" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="A1B2C3" pattern="[A-Za-z0-9]{6}"></label></section>${ctx.native?hostField(ctx.host,true):`<details class="form-card advanced"><summary>Host address</summary>${hostField(ctx.host,false,'Different host')}</details>`}`
  :`${you}${opponents}${rules()}${ctx.kind==='host'?(ctx.native?hostField(ctx.host,true):`<details class="form-card advanced"><summary>Host address</summary>${hostField(ctx.host,false,'Different host')}</details>`):''}`;
 const action={solo:'Start game',host:'Create room',join:'Join room'}[ctx.kind];
 return `<div class="page setup-page"><header class="page-head"><button class="btn icon-only quiet" data-nav="menu" aria-label="Back to the main menu">${icon('back')}</button><h1>${title}</h1></header><form id="setup-form" class="page-body" data-kind="${ctx.kind}" novalidate>${body}</form><footer class="page-foot"><p class="summary" data-setup-summary></p><button class="btn primary block" type="submit" form="setup-form">${action} ${icon('chevron')}</button></footer></div>`;
}

export interface LobbyContext {room:RoomView;me:string|undefined;hostLabel:string;native:boolean}
export function lobbyPage(ctx:LobbyContext){
 const r=ctx.room,isHost=r.host===ctx.me,me=r.members.find(m=>m.id===ctx.me),bots=r.members.filter(m=>m.bot),ready=r.members.length>=2&&r.members.every(m=>m.ready&&m.connected);
 const waiting=r.members.filter(m=>!m.bot&&(!m.ready||!m.connected)).map(m=>m.name);
 return `<div class="page lobby-page"><header class="page-head"><button class="btn icon-only quiet" data-do="leave-room" aria-label="Leave room">${icon('back')}</button><h1>Your table</h1></header>
<div class="page-body">
<section class="form-card room-card"><span class="eyebrow">Room code</span><strong class="room-code" id="room-code">${esc(r.code)}</strong><p>Host <b>${esc(ctx.hostLabel)}</b></p><div class="room-actions"><button class="btn secondary" data-do="share-room">${icon('share')}<span>Share invite</span></button></div><p class="field-note">Friends choose <b>Join LAN game</b> and enter this code${ctx.native?' and host address':''}.</p></section>
<section class="form-card"><h2>Players <span class="count">${r.members.length}/8</span></h2><ul class="members">${r.members.map(m=>`<li class="member" style="--player:${PLAYER_COLORS[m.token]}"><span class="avatar avatar-sm">${tokenIcon(m.token)}</span><span class="member-name"><b>${esc(m.name)}${m.id===ctx.me?' · You':''}</b><small>${m.bot?`${m.difficulty} bot`:m.id===r.host?'Host':'Guest'}</small></span><span class="badge ${!m.connected?'off':m.ready?'ok':''}">${!m.connected?'Away':m.ready?'Ready':'Not ready'}</span></li>`).join('')}</ul></section>
${isHost?`<form id="room-config" class="form-card"><h2>Computer opponents</h2>${numberStepper('bots','Bots',bots.length,0,Math.max(0,8-r.members.filter(m=>!m.bot).length))}${radios('difficulty','Difficulty',[['easy','Easy'],['medium','Medium'],['hard','Hard']],bots[0]?.difficulty??'medium')}<button class="btn secondary block" type="submit">Update opponents</button><p class="field-note">Changing opponents asks guests to confirm Ready again.</p></form>`:''}
</div>
<footer class="page-foot">${isHost?`<p class="summary">${ready?'Everyone is ready.':waiting.length?`Waiting for ${esc(waiting.join(', '))}`:'Invite at least one more player or add a bot.'}</p><button class="btn primary block" data-do="start-lan" ${ready?'':'disabled'}>${icon('dice')}<span>Start match</span></button>`:`<p class="summary">${me?.ready?'You are ready. The host starts the match.':'Tell the host when you are ready.'}</p><button class="btn ${me?.ready?'secondary':'primary'} block" data-do="ready">${me?.ready?'Not ready':'I’m ready'}</button>`}</footer>
</div>`;
}

export function connectingPage(message:string,detail:string){
 return `<div class="page connecting-page"><header class="page-head"><button class="btn icon-only quiet" data-do="cancel-connect" aria-label="Cancel">${icon('back')}</button><h1>Connecting</h1></header><div class="page-body centered"><span class="spinner" aria-hidden="true"></span><p class="lead">${esc(message)}</p><p class="field-note">${esc(detail)}</p><button class="btn secondary" data-do="cancel-connect">Cancel</button></div></div>`;
}
