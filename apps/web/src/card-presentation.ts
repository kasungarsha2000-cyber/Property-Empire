import {BOARD,CARDS,type Card} from '../../../packages/core/board';
import {rentFor} from '../../../packages/core/engine';
import type {Game} from '../../../packages/core/types';
import {journey,actorAtEvent} from './animation-plan';
export type CardPresentation={deck:'chance'|'community';id:number;player:string;source:number;title:string;instruction:string;annotations:string[];amount?:number;destination?:number};
export function cardRules(card:Card):string[]{
 switch(card.kind){
  case'money':return[card.amount!>=0?`Collect $${card.amount} from the bank.`:`Pay $${-card.amount!} to the bank. Raise funds first if you cannot pay.`];
  case'move':return[`Advance to ${BOARD[card.to!].name}.`,`Collect $200 if this move takes you past Start, then resolve the destination normally.`];
  case'back':return[`Move backward ${card.amount} spaces without a Start salary. Resolve the new space, including another card if applicable.`];
  case'jail':return['Go directly to Jail. Do not collect $200, and your turn has no extra roll.'];
  case'jailFree':return['Keep this card until you use it to leave jail. You may include it in a trade. It returns to its deck when used.'];
  case'repairs':return[`Pay $${card.houses} for each house and $${card.hotels} for each hotel you own. A hotel counts as one hotel, not four houses.`];
  case'everyone':return[card.amount!>0?`Collect $${card.amount} from each other active player.`:`Pay $${-card.amount!} to each other active player.`,`Resolve payments one at a time; an unpaid amount pauses play for debt.`];
  case'nearest':return[card.category==='transport'?'Advance to the next station. If another player owns it and it is not mortgaged, pay 2× normal station rent.':'Advance to the next utility. Roll fresh dice; if another player owns it and it is not mortgaged, pay 10× that new total.','Collect $200 if you pass Start. An unowned destination is available to buy or auction.'];
 }
}
export function cardPresentation(before:Game,after:Game,entry:Game['log'][number]):CardPresentation|null{
 const deck=(['chance','community'] as const).find(d=>CARDS[d].some(c=>c.text===entry.text));if(!deck)return null;
 const id=CARDS[deck].findIndex(c=>c.text===entry.text),card=CARDS[deck][id],player=before.players.find(p=>p.id===actorAtEvent(before,after,entry.id));if(!player)return null;
 const source=journey(before,after,player.id).cardSources.get(entry.id)??player.position;
 const result:CardPresentation={deck,id,player:player.name,source,title:deck==='chance'?'Chance':'Community Chest',instruction:card.text,annotations:cardRules(card)};
 if(card.kind==='money')result.amount=card.amount;
 if(card.kind==='repairs'){
  const assets=before.properties.filter(p=>p.owner===player.id),houses=assets.reduce((s,p)=>s+(p.level===5?0:p.level),0),hotels=assets.filter(p=>p.level===5).length;
  result.amount=-(houses*card.houses!+hotels*card.hotels!);result.annotations.unshift(`${houses} houses × $${card.houses} + ${hotels} hotel${hotels===1?'':'s'} × $${card.hotels} = $${-result.amount} due.`);
 }
 if(card.kind==='everyone'){const others=before.players.filter(p=>p.id!==player.id&&!p.bankrupt).length;result.amount=card.amount!*others;result.annotations.unshift(`${others} other active player${others===1?'':'s'} × $${Math.abs(card.amount!)} = $${Math.abs(result.amount)} ${result.amount>=0?'to collect':'to pay'}.`);}
 if(card.kind==='move')result.destination=card.to;
 if(card.kind==='jail')result.destination=10;
 if(card.kind==='back')result.destination=(source-card.amount!+40)%40;
 if(card.kind==='nearest'){
  let to=(source+1)%40;while(BOARD[to].type!==card.category)to=(to+1)%40;result.destination=to;
  const property=after.properties[to],owner=after.players.find(p=>p.id===property.owner);
  if(owner&&owner.id!==player.id&&!property.mortgaged){const total=after.dice[0]+after.dice[1],rent=card.category==='transport'?rentFor(after,to,total)*2:total*10;result.annotations.unshift(card.category==='transport'?`2× station rent: $${rent} due to ${owner.name}.`:after.pendingCard?.event===entry.id?`After reading, roll fresh dice and pay ${owner.name} 10× that total.`:`Fresh dice ${after.dice.join(' + ')} = ${total}; 10× rent: $${rent} due to ${owner.name}.`);}
  else result.annotations.unshift(!owner?'Available to buy or auction.':property.mortgaged?'Mortgaged: no rent is due.':'You own this destination: no rent is due.');
 }
 if(result.destination!==undefined)result.annotations.unshift(`Drawn at ${BOARD[source].name} → ${BOARD[result.destination].name}.`);
 return result;
}
export function pendingCardPresentation(game:Game):CardPresentation|null{
 const pending=game.pendingCard;if(!pending)return null;
 return cardPresentation(game,game,{id:pending.event,kind:'card',text:CARDS[pending.deck][pending.id].text});
}
