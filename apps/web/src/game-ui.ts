import type {Game,Action} from '../../../packages/core/types';
import {BOARD,GROUPS,groupSpaces} from '../../../packages/core/board';
import {applyAction,playerById} from '../../../packages/core/engine';
export type TradeDraft=Extract<Action,{type:'offerTrade'|'counterTrade'}>;
export function portfolioGroups(game:Game,id:string){
 return Object.keys(GROUPS).flatMap(key=>{
  const members=BOARD.filter(s=>s.group===key),owned=members.filter(s=>game.properties[s.index].owner===id).map(s=>s.index);
  return owned.length?[{key,owned,missing:members.filter(s=>game.properties[s.index].owner!==id).map(s=>s.index),complete:owned.length===members.length}]:[];
 });
}
export function tradable(game:Game,index:number){return groupSpaces(index).every(space=>game.properties[space.index].level===0);}
export function tradePreview(game:Game,id:string,draft:TradeDraft){
 const actor=playerById(game,id),partner=game.players.find(player=>player.id===draft.to);
 const interest=(indices:number[])=>indices.reduce((sum,index)=>sum+(game.properties[index]?.mortgaged?Math.ceil(BOARD[index].mortgage*.1):0),0);
 const giveInterest=interest(draft.receive),receiveInterest=interest(draft.give);
 const result={error:null as string|null,giveCashAfter:actor.cash-draft.giveCash+draft.receiveCash-giveInterest,receiveCashAfter:(partner?.cash??0)-draft.receiveCash+draft.giveCash-receiveInterest,giveInterest,receiveInterest,completedForSender:[] as string[],completedForReceiver:[] as string[]};
 try{
  // Reuse the authoritative engine, including debt payments and transfer fees.
  const offered=game.phase==='trade'&&game.trade?.from===id&&draft.type==='offerTrade'?{...game,trade:{...game.trade,...draft,from:id}}:applyAction(game,id,draft),accepted=applyAction(offered,draft.to,{type:'acceptTrade'});
  result.giveCashAfter=playerById(accepted,id).cash;result.receiveCashAfter=playerById(accepted,draft.to).cash;
  const completed=(owner:string)=>Object.keys(GROUPS).filter(key=>!['transport','utility'].includes(key)&&BOARD.filter(s=>s.group===key).every(s=>accepted.properties[s.index].owner===owner)&&!BOARD.filter(s=>s.group===key).every(s=>game.properties[s.index].owner===owner));
  result.completedForSender=completed(id);result.completedForReceiver=completed(draft.to);
 }catch(error){result.error=error instanceof Error?error.message:'This trade is unavailable';}
 return result;
}
