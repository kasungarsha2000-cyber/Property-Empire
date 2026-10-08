import type {Game} from '../../../packages/core/types';
import {gameNotices,type GameNotice} from './game-events';
import {escapeHTML} from './ui-components';
import {propertyArtwork} from './property-art';

export type DecisionPopup={key:string;kind:string;title:string;html:string};
export class EventPresenter{
 private previous:Game|null=null;
 private viewer='';
 private queue:GameNotice[]=[];
 private current:GameNotice|null=null;
 private decision:DecisionPopup|null=null;
 private closedKey='';
 private suspended=false;
 private signature='';
 private timer:ReturnType<typeof setTimeout>|null=null;
 constructor(private host:HTMLElement,private stage:HTMLElement){}
 get hasDecision(){return !!this.decision;}
 update(game:Game,id:string,decision:DecisionPopup|null){
  if(this.viewer&&this.viewer!==id)this.reset();this.viewer=id;
  this.queue.push(...gameNotices(this.previous,game,id));this.queue=this.queue.slice(-20);this.previous=game;
  this.decision=decision?.key===this.closedKey?null:decision;this.present();
 }
 dismiss(){
  if(this.decision){this.closedKey=this.decision.key;this.decision=null;}
  else this.current=null;
  this.clearTimer();this.present();
 }
 suspend(value:boolean){this.suspended=value;this.clearTimer();this.present();}
 reset(){this.clearTimer();this.previous=null;this.viewer='';this.queue=[];this.current=null;this.decision=null;this.closedKey='';this.suspended=false;this.signature='';this.host.hidden=true;this.stage.classList.remove('decision-open');}
 private clearTimer(){if(this.timer)clearTimeout(this.timer);this.timer=null;}
 private present(){
  this.stage.classList.toggle('decision-open',!!this.decision);
  if(this.suspended){this.host.hidden=true;return;}
  const close='<button class="event-close" data-do="dismiss-event" aria-label="Close event popup">×</button>';
  if(this.decision){
   this.clearTimer();this.host.className=`event-popup event-decision event-${this.decision.kind}`;this.host.setAttribute('role','dialog');this.host.setAttribute('aria-labelledby','event-title');this.host.removeAttribute('aria-live');
   const signature=`decision:${this.decision.key}:${this.decision.html}:${this.decision.title}`;
   if(this.signature!==signature){this.host.innerHTML=`${close}<h2 id="event-title">${escapeHTML(this.decision.title)}</h2>${this.decision.html}`;this.signature=signature;}
   this.host.hidden=false;return;
  }
  this.current??=this.queue.shift()??null;
  if(!this.current){this.host.hidden=true;return;}
  const notice=this.current;this.host.className=`event-popup event-notice event-${notice.kind}`;this.host.setAttribute('role','status');this.host.setAttribute('aria-live','polite');this.host.setAttribute('aria-atomic','true');
  if(this.signature!==notice.key){this.host.innerHTML=`${close}${notice.property!==undefined?`<div class="event-art">${propertyArtwork(notice.property)}</div>`:''}<h2 id="event-title">${escapeHTML(notice.title)}</h2>${notice.amount!==undefined?`<strong class="event-amount ${notice.amount<0?'event-cost':''}">${notice.amount<0?'−':'+'}$${Math.abs(notice.amount).toLocaleString('en-US')}</strong>`:''}<p>${escapeHTML(notice.detail)}</p>`;this.signature=notice.key;}
  this.host.hidden=false;
  if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.current=null;this.present();},5500);
 }
}
