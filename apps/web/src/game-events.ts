import type {Game} from '../../../packages/core/types';
import {BOARD} from '../../../packages/core/board';
import {actionPlayer} from '../../../packages/core/index';
import {cardPresentation,type CardPresentation} from './card-presentation';
import {actorAtEvent} from './animation-plan';
export type GameNotice={key:string;kind:string;title:string;detail:string;amount?:number;property?:number;card?:CardPresentation};
export function gameNotices(before:Game|null,after:Game,id:string):GameNotice[]{
 if(!before||after.eventSeq<=before.eventSeq)return [];
 const me=after.players.find(p=>p.id===id);if(!me)return [];
 const fresh=after.log.filter(entry=>entry.id>before.eventSeq),notices:GameNotice[]=[];
 for(const entry of fresh){
  const own=entry.text.startsWith(`${me.name} `),notice:GameNotice={key:`event:${entry.id}`,kind:entry.kind,title:'City event',detail:entry.text};
  if(entry.kind==='payment'){
   const amount=Number(entry.text.match(/\$(\d+)\.$/)?.[1]);if(!amount)continue;
   const matches=after.players.flatMap(payer=>after.players.filter(receiver=>payer.id!==receiver.id&&[payer.id,receiver.id].includes(id)&&entry.text===`${payer.name} pays ${receiver.name} $${amount}.`).map(receiver=>({payer,receiver})));
   if(matches.length>1){
    const delta=me.cash-(before.players.find(p=>p.id===id)?.cash??me.cash),key=`cash:${after.eventSeq}`;
    if(delta&&!notices.some(n=>n.key===key))notices.push({key,kind:'payment',title:'Cash updated',detail:'Your cash balance changed during this event.',amount:delta});
    continue;
   }
   let found=false;
   for(const {payer,receiver} of matches){
    // Card moves can create rent too; counters classify only an actual payment log.
    const bookedRent=payer.rentPaid-(before.players.find(p=>p.id===payer.id)?.rentPaid??payer.rentPaid);
    const property=payer.position,rent=payer.id===actorAtEvent(before,after,entry.id)&&after.properties[property].owner===receiver.id&&(!fresh.some(e=>e.kind==='card')||bookedRent>=amount);
    notice.title=rent?(receiver.id===id?'Rent collected':'Rent paid'):(receiver.id===id?'Money received':'Payment sent');notice.amount=receiver.id===id?amount:-amount;
    if(rent)notice.property=property;found=true;
   }
   if(!found&&entry.text===`${me.name} pays the bank $${amount}.`&&(before.players[before.current].id===id||before.debt?.player===id)){notice.title='Payment to the bank';notice.amount=-amount;found=true;}
   if(!found)continue;
  }else if(entry.kind==='purchase'&&own){
   const property=BOARD.find(s=>s.price&&after.properties[s.index].owner===id&&before.properties[s.index].owner!==id&&entry.text.includes(s.name));
   if(!property)continue;notice.title='Property purchased';notice.property=property.index;notice.amount=-Number(entry.text.match(/\$(\d+)\.$/)?.[1]??property.price);
  }else if(entry.kind==='salary'&&own&&actorAtEvent(before,after,entry.id)===id){notice.title='Passed Start';notice.amount=200;}
  else if(entry.kind==='jail'&&own&&actorAtEvent(before,after,entry.id)===id){notice.title=me.jailed?'Sent to jail':'Out of jail';}
  else if(entry.kind==='card'&&actorAtEvent(before,after,entry.id)===id){const card=cardPresentation(before,after,entry);notice.title=card?.title??'City card';if(card)notice.card=card;}
  else if(entry.kind==='winner'){notice.title=after.winner===id?'You built an empire!':'Match finished';}
  else continue;
  notices.push(notice);
 }
 return notices;
}
export function decisionFor(game:Game,id:string):{key:string;kind:string;property?:number}|null{
 const actor=actionPlayer(game),me=game.players.find(p=>p.id===id);if(!me)return null;
 const kind=game.phase==='ended'?'ended':actor===id&&['purchase','auction','debt','trade'].includes(game.phase)?game.phase:actor===id&&game.phase==='roll'&&me.jailed?'jail':null;
 if(!kind)return null;
 const property=game.pendingProperty??game.auction?.property??undefined;
 return{kind,property,key:`${kind}:${game.turn}:${id}:${property??''}:${game.auction?.bid??''}:${kind==='jail'?me.jailTurns:''}:${kind==='trade'?`${game.trade!.from}:${game.trade!.round??0}`:''}`};
}
