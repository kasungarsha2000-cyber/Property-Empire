import type {Game} from '../../../../packages/core/types';
import {tableNotices,type GameNotice} from '../game-events';
import {noticeTone} from '../event-feedback';
import {SMALL_NOTICE_MS} from '../presentation-timing';
import {esc,icon,signed} from './dom';

/**
 * Which receipts deserve a passive notice. Rent, purchases and building are shown on the board itself,
 * cards and decisions have their own layers, and other players' everyday arrivals are left to the dock.
 */
export function shouldNotify(notice:GameNotice){
 if(notice.card||['purchase','build','winner','arrival','card','move'].includes(notice.kind))return false;
 if(notice.kind==='payment'&&notice.property!==undefined)return false;
 if(notice.observer)return['debt','bankruptcy'].includes(notice.kind)||notice.title.endsWith('Sent to jail');
 return true;
}

const ICON:Record<string,string>={salary:'coin',income:'coin',payment:'cash',jail:'jail',debt:'warning',bankruptcy:'flag'};

export function noticeMarkup(notice:GameNotice){
 const tone=noticeTone(notice);
 return `<div class="notice tone-${tone}" role="status"><span class="notice-icon">${icon(ICON[notice.kind]??'info')}</span><span class="notice-text"><b>${esc(notice.title)}</b><small>${esc(notice.detail)}</small></span>${notice.amount!==undefined&&notice.amount!==0?`<b class="notice-amount ${notice.amount<0?'neg':'pos'}">${signed(notice.amount)}</b>`:''}</div>`;
}

/** One short receipt at a time; receipts never block input and are cleared when the next pawn moves. */
export class NoticeFeed{
 private previous:Game|null=null;
 private viewer='';
 private queue:GameNotice[]=[];
 private current:GameNotice|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;
 private moving=false;
 constructor(private host:HTMLElement,private duration=SMALL_NOTICE_MS){}
 get showing(){return this.current;}
 update(game:Game,viewer:string,moving:boolean,animate=true){
  if(this.viewer!==viewer||(this.previous&&game.eventSeq<this.previous.eventSeq))this.reset();
  this.viewer=viewer;
  this.startMoving(moving);
  if(animate)this.queue.push(...tableNotices(this.previous,game,viewer).filter(shouldNotify));
  this.queue=this.queue.slice(-6);this.previous=game;
  this.present();
 }
 setMoving(moving:boolean){this.startMoving(moving);this.present();}
 /** A new move makes earlier receipts stale; receipts produced by the move itself wait for arrival. */
 private startMoving(moving:boolean){if(moving&&!this.moving){this.clearTimer();this.current=null;this.queue=[];}this.moving=moving;}
 reset(){this.clearTimer();this.previous=null;this.viewer='';this.queue=[];this.current=null;this.moving=false;this.host.innerHTML='';}
 dismiss(){this.clearTimer();this.current=null;this.present();}
 private clearTimer(){if(this.timer)clearTimeout(this.timer);this.timer=null;}
 private present(){
  if(this.moving){this.host.innerHTML='';return;}
  if(!this.current)this.current=this.queue.shift()??null;
  if(!this.current){this.host.innerHTML='';return;}
  const html=noticeMarkup(this.current);if(this.host.innerHTML!==html)this.host.innerHTML=html;
  if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.current=null;this.present();},this.duration);
 }
}
