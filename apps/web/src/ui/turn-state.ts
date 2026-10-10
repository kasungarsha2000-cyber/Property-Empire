import {BOARD,GROUPS} from '../../../../packages/core/board';
import {actionPlayer,playerById} from '../../../../packages/core/index';
import type {Action,Game} from '../../../../packages/core/types';
import {money} from './dom';

/** Decisions that take over the lower part of the screen for this viewer. */
export type DecisionKind='purchase'|'auction'|'jail'|'debt'|'trade';
export interface Decision {kind:DecisionKind;key:string;mine:boolean}

export function viewerDecision(g:Game,viewer:string|null):Decision|null{
 if(!viewer||g.phase==='ended')return null;
 const me=g.players.find(p=>p.id===viewer);if(!me||me.bankrupt)return null;
 const actor=actionPlayer(g);
 if(g.phase==='purchase'&&actor===viewer)return{kind:'purchase',key:`purchase:${g.turn}:${g.pendingProperty}`,mine:true};
 if(g.phase==='auction'&&g.auction){
  // Everyone may follow an auction; it re-opens when the bid comes back to the viewer.
  const mine=g.auction.turn===viewer;
  return{kind:'auction',key:`auction:${g.turn}:${g.auction.property}:${mine?`turn:${g.auction.bid}`:'watch'}`,mine};
 }
 if(g.phase==='roll'&&actor===viewer&&me.jailed)return{kind:'jail',key:`jail:${g.turn}:${me.jailTurns}`,mine:true};
 if(g.phase==='debt'&&g.debt?.player===viewer)return{kind:'debt',key:`debt:${g.turn}:${g.debt.amount}:${g.debt.creditor??'bank'}`,mine:true};
 if(g.phase==='trade'&&g.trade?.to===viewer)return{kind:'trade',key:`trade:${g.turn}:${g.trade.from}:${g.trade.round??0}`,mine:true};
 return null;
}

export type DockCommand='open-decision'|'open-card'|'show-results';
export interface DockButton {label:string;icon:string;action?:Action;command?:DockCommand;disabled?:boolean}
export interface DockModel {actor:string|null;title:string;detail:string;mood:'you'|'other'|'moving'|'ended'|'offline';primary:DockButton|null}
export interface DockContext {
 viewer:string|null;
 moving:boolean;
 online:boolean;
 /** A decision panel or card for the viewer is currently on screen. */
 panelOpen:boolean;
 cardOpen:boolean;
 /** Several humans share this device, so the dock names them instead of saying “you”. */
 hotseat?:boolean;
 allowed:(action:Action)=>boolean;
}

const latestRoll=(g:Game)=>[...g.log].reverse().find(entry=>entry.kind==='roll')?.text.replace(/^.* rolls /,'Rolled ').replace(/\.$/,'');

export function dockModel(g:Game,ctx:DockContext):DockModel{
 const current=g.players[g.current],actorId=actionPlayer(g),actor=actorId?playerById(g,actorId):null,mine=!!actor&&actor.id===ctx.viewer;
 const name=(id:string|null|undefined)=>id?(id===ctx.viewer&&!ctx.hotseat?'You':playerById(g,id).name):'the bank';
 const seat=ctx.hotseat&&ctx.viewer?playerById(g,ctx.viewer).name:null,yourTurn=seat?`${seat}’s turn`:'Your turn';
 const button=(label:string,iconName:string,action:Action):DockButton=>({label,icon:iconName,action,disabled:!ctx.allowed(action)});
 if(g.phase==='ended'){const winner=playerById(g,g.winner!);return{actor:winner.id,title:winner.id===ctx.viewer&&!seat?'You won the empire':`${winner.name} wins`,detail:'The match is over.',mood:'ended',primary:{label:'View results',icon:'trophy',command:'show-results'}};}
 if(!ctx.online)return{actor:actorId,title:'Reconnecting to the host…',detail:'Your seat is kept. Actions resume when the connection returns.',mood:'offline',primary:null};
 if(ctx.moving)return{actor:current.id,title:current.id===ctx.viewer&&!seat?'Moving…':`${current.name} is moving`,detail:latestRoll(g)??'',mood:'moving',primary:null};
 switch(g.phase){
  case'card':{
   const card=g.pendingCard!,deck=card.deck==='chance'?'Chance':'Community Chest';
   if(card.player===ctx.viewer)return{actor:card.player,title:seat?`${seat} · ${deck} card`:`${deck} card`,detail:'Read the card, then continue.',mood:'you',primary:ctx.cardOpen?null:{label:'Read card',icon:'card',command:'open-card'}};
   return{actor:card.player,title:`${name(card.player)} drew ${deck}`,detail:'Reading the card…',mood:'other',primary:ctx.cardOpen?null:{label:'Show card',icon:'card',command:'open-card'}};
  }
  case'roll':{
   if(mine&&actor!.jailed)return{actor:actor!.id,title:seat?`${seat} · in jail`:'In jail',detail:`Attempt ${actor!.jailTurns+1} of 3 · roll doubles, pay $50 or use a card`,mood:'you',primary:ctx.panelOpen?null:{label:'Jail options',icon:'jail',command:'open-decision'}};
   if(mine)return{actor:actor!.id,title:yourTurn,detail:g.doubles?'Doubles — roll again':'Roll the dice to move',mood:'you',primary:button('Roll dice','dice',{type:'roll'})};
   return{actor:actorId,title:`${actor!.name}’s turn`,detail:actor!.jailed?'In jail · deciding how to get out':'Getting ready to roll',mood:'other',primary:null};
  }
  case'purchase':{
   const space=BOARD[g.pendingProperty!];
   if(mine)return{actor:actorId,title:`${space.name} is for sale`,detail:`${money(space.price)} · ${GROUPS[space.group].name}`,mood:'you',primary:ctx.panelOpen?null:{label:'Review purchase',icon:'deeds',command:'open-decision'}};
   return{actor:actorId,title:`${actor!.name} is deciding`,detail:`${space.name} · ${money(space.price)}`,mood:'other',primary:null};
  }
  case'auction':{
   const a=g.auction!,space=BOARD[a.property],status=a.leader?`High bid ${money(a.bid)} · ${name(a.leader)}`:'No bids yet';
   if(a.turn===ctx.viewer)return{actor:a.turn,title:seat?`${seat} bids · ${space.name}`:`Your bid · ${space.name}`,detail:status,mood:'you',primary:ctx.panelOpen?null:{label:'Place a bid',icon:'gavel',command:'open-decision'}};
   return{actor:a.turn,title:`Auction · ${space.name}`,detail:`${name(a.turn)} is bidding · ${status}`,mood:'other',primary:ctx.panelOpen?null:{label:'Watch auction',icon:'gavel',command:'open-decision'}};
  }
  case'debt':{
   const d=g.debt!,debtor=playerById(g,d.player),short=Math.max(0,d.amount-debtor.cash);
   if(d.player===ctx.viewer)return{actor:d.player,title:`Raise ${money(short)}`,detail:`${seat??'You'} owe${seat?'s':''} ${money(d.amount)} to ${name(d.creditor)}`,mood:'you',primary:ctx.panelOpen?null:{label:'Resolve debt',icon:'cash',command:'open-decision'}};
   return{actor:d.player,title:`${debtor.name} is raising funds`,detail:`Owes ${money(d.amount)} to ${name(d.creditor)}`,mood:'other',primary:null};
  }
  case'trade':{
   const t=g.trade!;
   if(t.to===ctx.viewer)return{actor:t.to,title:`Offer from ${name(t.from)}`,detail:(t.round??0)>0?'A counteroffer is waiting for you':'Review the terms before answering',mood:'you',primary:ctx.panelOpen?null:{label:'Review offer',icon:'trade',command:'open-decision'}};
   if(t.from===ctx.viewer)return{actor:t.to,title:'Offer sent',detail:`Waiting for ${name(t.to)} to answer`,mood:'other',primary:null};
   return{actor:t.to,title:`${name(t.to)} is considering an offer`,detail:`From ${name(t.from)}`,mood:'other',primary:null};
  }
  default:{
   if(mine){
    const again=g.extraRoll&&!actor!.jailed;
    return{actor:actorId,title:again?'Doubles!':yourTurn,detail:again?'Build or trade first, then roll again':'Build, trade or end your turn',mood:'you',primary:button(again?'Roll again':'End turn',again?'dice':'chevron',{type:'end'})};
   }
   return{actor:actorId,title:`${actor!.name}’s turn`,detail:latestRoll(g)??'Managing properties',mood:'other',primary:null};
  }
 }
}

/** Whether the viewer may open the trade builder right now (engine rules plus UI state). */
export function tradeOpen(g:Game,viewer:string|null){return !!viewer&&actionPlayer(g)===viewer&&['roll','manage','debt'].includes(g.phase)&&!g.tradeOffered&&!playerById(g,viewer).bankrupt;}
