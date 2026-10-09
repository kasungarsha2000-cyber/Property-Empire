import type {Game} from '../../../packages/core/types';
import {tableNotices,type GameNotice} from './game-events';
import {escapeHTML} from './ui-components';
import {BOARD} from '../../../packages/core/board';
import {drawnCardMarkup} from './card-ui';
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
 private moving=false;
 private signature='';
 private timer:ReturnType<typeof setTimeout>|null=null;
 constructor(private host:HTMLElement,private stage:HTMLElement){}
 get hasDecision(){return !!this.decision;}
 get hasBlockingCard(){return !!this.current?.card&&!this.current.observer||this.queue.some(notice=>!!notice.card&&!notice.observer);}
 setMoving(value:boolean){if(this.moving!==value){this.moving=value;this.clearTimer();}this.present();}
 update(game:Game,id:string,decision:DecisionPopup|null){
  if((this.viewer&&this.viewer!==id)||(this.previous&&game.eventSeq<this.previous.eventSeq))this.reset();this.viewer=id;
  const incoming=tableNotices(this.previous,game,id);
  if(incoming.length){if(this.current?.observer){this.current=null;this.clearTimer();}this.queue=this.queue.filter(n=>!n.observer);}
  this.queue.push(...incoming);this.queue=this.queue.slice(-20);this.previous=game;
  this.decision=decision?.key===this.closedKey?null:decision;this.present();
 }
 dismiss(){
  if(this.current?.card)this.current=null;
  else if(this.decision){this.closedKey=this.decision.key;this.decision=null;}
  else this.current=null;
  this.clearTimer();this.present();
 }
 suspend(value:boolean){this.suspended=value;this.clearTimer();this.present();}
 reset(){this.clearTimer();this.previous=null;this.viewer='';this.queue=[];this.current=null;this.decision=null;this.closedKey='';this.suspended=false;this.moving=false;this.signature='';this.host.hidden=true;this.stage.classList.remove('decision-open');}
 private clearTimer(){if(this.timer)clearTimeout(this.timer);this.timer=null;}
 private present(){
  this.stage.classList.toggle('decision-open',!!this.decision||this.hasBlockingCard);
  if(this.suspended||this.moving){this.host.hidden=true;return;}
  const close='<button class="event-close" data-do="dismiss-event" aria-label="Close event popup">×</button>';
  if(this.decision&&this.current?.observer){this.current=null;this.clearTimer();}
  const nextCard=this.queue.findIndex(notice=>!!notice.card&&!notice.observer);
  if(!this.current?.card&&nextCard>=0){const notice=this.queue.splice(nextCard,1)[0];if(this.current)this.queue.unshift(this.current);this.current=notice;}
  if(this.current?.card&&!this.current.observer){
   this.clearTimer();const notice=this.current;this.host.className=`event-popup event-card card-${notice.card!.deck}`;this.host.setAttribute('role','dialog');this.host.setAttribute('aria-labelledby','event-title');this.host.removeAttribute('aria-live');
   if(this.signature!==notice.key){this.host.innerHTML=`${close}<h2 id="event-title">${escapeHTML(notice.title)}</h2>${drawnCardMarkup(notice.card!)}<div class="event-actions card-continue"><button class="primary" data-do="dismiss-event">Continue</button></div>`;this.signature=notice.key;}
   this.host.hidden=false;return;
  }
  if(this.decision){
   this.clearTimer();this.host.className=`event-popup event-decision event-${this.decision.kind}`;this.host.setAttribute('role','dialog');this.host.setAttribute('aria-labelledby','event-title');this.host.removeAttribute('aria-live');
   const signature=`decision:${this.decision.key}:${this.decision.html}:${this.decision.title}`;
   if(this.signature!==signature){this.host.innerHTML=`${close}<h2 id="event-title">${escapeHTML(this.decision.title)}</h2>${this.decision.html}`;this.signature=signature;}
   this.host.hidden=false;return;
  }
  this.current??=this.queue.shift()??null;
  if(!this.current){this.host.hidden=true;return;}
  if(this.current.observer){
   const notice=this.current;this.host.className=`event-popup event-observer event-${notice.kind}${notice.card?` card-${notice.card.deck}`:''}`;this.host.setAttribute('role','status');this.host.setAttribute('aria-live','polite');this.host.setAttribute('aria-atomic','true');this.host.removeAttribute('aria-labelledby');
   if(this.signature!==notice.key){this.host.innerHTML=`${close}<span class="observer-label">Around the board</span><h2>${escapeHTML(notice.title)}</h2>${notice.card?drawnCardMarkup(notice.card):`${notice.property!==undefined&&BOARD[notice.property].price?`<div class="observer-art">${propertyArtwork(notice.property)}</div>`:''}<p>${escapeHTML(notice.detail)}</p>${notice.price!==undefined?`<div class="observer-price">Purchase price <strong>$${notice.price}</strong></div>`:notice.amount!==undefined?`<strong class="observer-amount ${notice.amount<0?'event-cost':''}">${notice.amount<0?'−':'+'}$${Math.abs(notice.amount).toLocaleString('en-US')}</strong>`:''}`}`;this.signature=notice.key;}
   this.host.hidden=false;if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.current=null;this.present();},notice.card?4200:3000);return;
  }
  const notice=this.current;this.host.className=`event-popup event-notice event-${notice.kind}`;this.host.setAttribute('role','status');this.host.setAttribute('aria-live','polite');this.host.setAttribute('aria-atomic','true');
  if(this.signature!==notice.key){const title=notice.property!==undefined?`${notice.title} · ${BOARD[notice.property].name}`:notice.title;this.host.innerHTML=`<div class="transaction-copy"><strong id="event-title">${escapeHTML(title)}</strong><span class="sr-only">${escapeHTML(notice.detail)}</span></div>${notice.amount!==undefined?`<strong class="transaction-amount ${notice.amount<0?'event-cost':''}">${notice.amount<0?'−':'+'}$${Math.abs(notice.amount).toLocaleString('en-US')}</strong>`:''}${close}`;this.signature=notice.key;}
  this.host.hidden=false;
  if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.current=null;this.present();},3000);
 }
}
