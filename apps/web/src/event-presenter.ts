import type {Game} from '../../../packages/core/types';
import {tableNotices,type GameNotice} from './game-events';
import {escapeHTML} from './ui-components';
import {BOARD} from '../../../packages/core/board';
import {drawnCardMarkup} from './card-ui';
import {pendingCardPresentation,type CardPresentation} from './card-presentation';
import {propertyArtwork} from './property-art';

export type DecisionPopup={key:string;kind:string;title:string;html:string;card?:CardPresentation};
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
 private animationKey='';
 private timer:ReturnType<typeof setTimeout>|null=null;
 private reading=false;
 constructor(private host:HTMLElement,private stage:HTMLElement,private options?:{deckAnchor:(deck:'chance'|'community')=>{x:number;y:number}|null;reduced:()=>boolean}){
  host.addEventListener?.('pointerenter',()=>{this.reading=true;this.clearTimer();});host.addEventListener?.('pointerleave',()=>{this.reading=false;this.present();});
  host.addEventListener?.('focusin',()=>{this.reading=true;this.clearTimer();});host.addEventListener?.('focusout',event=>{if(!host.contains(event.relatedTarget as Node)){this.reading=false;this.present();}});
 }
 get hasDecision(){return !!this.decision;}
 get hasBlockingCard(){return this.decision?.kind==='card'||!!this.current?.card&&!this.current.observer||this.queue.some(notice=>!!notice.card&&!notice.observer);}
 setMoving(value:boolean){if(this.moving!==value){this.moving=value;this.clearTimer();}this.present();}
 update(game:Game,id:string,decision:DecisionPopup|null,moving?:boolean){
  if((this.viewer&&this.viewer!==id)||(this.previous&&game.eventSeq<this.previous.eventSeq))this.reset();this.viewer=id;
  if(moving!==undefined&&this.moving!==moving){this.moving=moving;this.clearTimer();}
  const incoming=tableNotices(this.previous,game,id).filter(n=>!(n.card&&!n.observer&&game.pendingCard)&&n.kind!=='purchase'&&n.kind!=='build'&&n.kind!=='winner'&&!(n.kind==='payment'&&n.property!==undefined)&&!(n.kind==='arrival'&&n.price!==undefined));
  if(!this.previous&&game.pendingCard?.player!==id){const card=pendingCardPresentation(game);if(card)incoming.push({key:`pending:${game.pendingCard!.event}`,kind:'card',observer:true,title:`${card.player} · ${card.title}`,detail:card.instruction,card});}
  if(incoming.length)this.queue=this.queue.filter(n=>!n.observer);
  this.queue.push(...incoming);this.queue=this.queue.slice(-20);this.previous=game;
  this.decision=decision?.key===this.closedKey?null:decision;this.present();
 }
 dismiss(){
  if(this.current?.card)this.current=null;
  else if(this.decision){this.closedKey=this.decision.key;this.decision=null;}
  else this.current=null;
  this.clearTimer();this.present();
 }
 suspend(value:boolean){if(value!==this.suspended){this.suspended=value;this.clearTimer();}this.present();}
 reset(){this.clearTimer();this.previous=null;this.viewer='';this.queue=[];this.current=null;this.decision=null;this.closedKey='';this.suspended=false;this.moving=false;this.signature='';this.animationKey='';this.reading=false;this.host.hidden=true;this.stage.classList.remove('decision-open');}
 private clearTimer(){if(this.timer)clearTimeout(this.timer);this.timer=null;}
 private present(){
  const motionClass=this.options?.reduced()?' event-reduced':'';if(motionClass)this.host.getAnimations?.().forEach(animation=>animation.cancel());
  this.stage.classList.toggle('decision-open',!!this.decision||this.hasBlockingCard);
  if(this.suspended||this.moving){this.host.hidden=true;return;}
  const close='<button class="event-close" data-do="dismiss-event" aria-label="Close event popup">×</button>';
  if(this.decision&&this.current?.observer){this.current=null;this.clearTimer();}
  const nextCard=this.queue.findIndex(notice=>!!notice.card&&!notice.observer);
  if(!this.current?.card&&nextCard>=0){const notice=this.queue.splice(nextCard,1)[0];if(this.current)this.queue.unshift(this.current);this.current=notice;}
  if(this.current?.card&&!this.current.observer){
   this.clearTimer();const notice=this.current;this.host.className=`event-popup event-card card-${notice.card!.deck}${motionClass}`;this.host.setAttribute('role','dialog');this.host.setAttribute('aria-labelledby','event-title');this.host.removeAttribute('aria-live');
   if(this.signature!==notice.key){this.host.innerHTML=`${close}<h2 id="event-title">${escapeHTML(notice.title)}</h2>${drawnCardMarkup(notice.card!)}<div class="event-actions card-continue"><button class="primary" data-do="dismiss-event">Continue</button></div>`;this.signature=notice.key;}
   this.host.hidden=false;return;
  }
  if(this.decision){
   this.clearTimer();this.host.className=`event-popup event-decision event-${this.decision.kind}${this.decision.card?` card-${this.decision.card.deck}`:''}${motionClass}`;this.host.setAttribute('role','dialog');this.host.setAttribute('aria-labelledby','event-title');this.host.removeAttribute('aria-live');
   const signature=`decision:${this.decision.key}:${this.decision.html}:${this.decision.title}`;
   const changed=this.signature!==signature;if(changed){this.host.innerHTML=`${close}<h2 id="event-title">${escapeHTML(this.decision.title)}</h2>${this.decision.html}`;this.signature=signature;}
   this.host.hidden=false;this.reveal(`decision:${this.decision.key}`,this.decision.card?.deck);return;
  }
  this.current??=this.queue.shift()??null;
  if(!this.current){this.host.hidden=true;return;}
  if(this.current.observer){
   const notice=this.current;this.host.className=`event-popup event-observer event-${notice.kind}${notice.card?` card-${notice.card.deck}`:''}${motionClass}`;this.host.setAttribute('role','status');this.host.setAttribute('aria-live','polite');this.host.setAttribute('aria-atomic','true');this.host.removeAttribute('aria-labelledby');
   if(this.signature!==notice.key){this.host.innerHTML=`${close}<span class="observer-label">Around the board</span><h2>${escapeHTML(notice.title)}</h2>${notice.card?drawnCardMarkup(notice.card):`${notice.property!==undefined&&BOARD[notice.property].price?`<div class="observer-art">${propertyArtwork(notice.property)}</div>`:''}<p>${escapeHTML(notice.detail)}</p>${notice.price!==undefined?`<div class="observer-price">Purchase price <strong>$${notice.price}</strong></div>`:notice.amount!==undefined?`<strong class="observer-amount ${notice.amount<0?'event-cost':''}">${notice.amount<0?'−':'+'}$${Math.abs(notice.amount).toLocaleString('en-US')}</strong>`:''}`}`;this.signature=notice.key;}
   this.host.hidden=false;this.reveal(notice.key,notice.card?.deck);if(!this.timer&&!this.reading)this.timer=setTimeout(()=>{this.timer=null;this.current=null;this.present();},notice.card?9000:8000);return;
  }
  const notice=this.current;this.host.className=`event-popup event-notice event-${notice.kind}`;this.host.setAttribute('role','status');this.host.setAttribute('aria-live','polite');this.host.setAttribute('aria-atomic','true');
  if(this.signature!==notice.key){const title=notice.property!==undefined?`${notice.title} · ${BOARD[notice.property].name}`:notice.title;this.host.innerHTML=`<div class="transaction-copy"><strong id="event-title">${escapeHTML(title)}</strong><span class="receipt-detail">${escapeHTML(notice.detail)}</span></div>${notice.amount!==undefined?`<strong class="transaction-amount ${notice.amount<0?'event-cost':''}">${notice.amount<0?'−':'+'}$${Math.abs(notice.amount).toLocaleString('en-US')}</strong>`:''}${close}`;this.signature=notice.key;}
  this.host.hidden=false;
  this.reveal(notice.key);
  if(!this.timer&&!this.reading)this.timer=setTimeout(()=>{this.timer=null;this.current=null;this.present();},8000);
 }
 private reveal(key:string,deck?:'chance'|'community'){
  if(this.animationKey===key)return;this.animationKey=key;
  if(this.options?.reduced()||!this.host.animate)return;
  this.host.getAnimations?.().forEach(animation=>animation.cancel());
  if(deck&&this.options?.deckAnchor(deck)){this.flyFromDeck(deck);return;}
  this.host.animate([{opacity:0,translate:'0 16px',scale:'.94'},{opacity:1,translate:'0 -2px',scale:'1.01',offset:.78},{opacity:1,translate:'0 0',scale:'1'}],{duration:360,easing:'cubic-bezier(.18,.8,.25,1)'});
 }
 private flyFromDeck(deck:'chance'|'community'){
  if(!this.options||this.options.reduced())return;const anchor=this.options.deckAnchor(deck);if(!anchor||!this.host.animate)return;
  const rect=this.host.getBoundingClientRect(),stage=this.stage.getBoundingClientRect(),dx=anchor.x-(rect.left-stage.left+rect.width/2),dy=anchor.y-(rect.top-stage.top+rect.height/2);
  const tilt=deck==='chance'?-1:1;
  this.host.animate([{opacity:0,transform:`translate(${dx}px,${dy}px) scale(.12) rotate(${tilt*22}deg)`},{opacity:1,transform:`translate(${dx*.22}px,${dy*.22-20}px) scale(.72) rotate(${tilt*6}deg)`,offset:.55},{opacity:1,transform:'translate(0,-3px) scale(1.018) rotate(0deg)',offset:.85},{opacity:1,transform:'translate(0,0) scale(1) rotate(0deg)'}],{duration:720,easing:'cubic-bezier(.16,.72,.24,1)'});
 }
}
