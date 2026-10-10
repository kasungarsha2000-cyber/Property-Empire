import {BOARD,CARDS} from '../../../packages/core/board';
import type {Game} from '../../../packages/core/types';

/** Turn logs may span several actors after reconnect. Ambiguous names are not guessed. */
export function actorAtEvent(before:Game,after:Game,eventId:number):string|null{
 let actor:string|null=before.players[before.current].id;
 for(const entry of after.log.filter(e=>e.id>before.eventSeq&&e.id<=eventId&&e.kind==='turn')){
  const matches=after.players.filter(p=>entry.text===`${p.name}'s turn.`);actor=matches.length===1?matches[0].id:null;
 }
 return actor;
}

/** Reconstruct visual arrivals from authoritative events, including chained cards. */
export function journey(before:Game,after:Game,id:string){
 const route:number[]=[],cardSources=new Map<number,number>(),player=before.players.find(p=>p.id===id);
 if(!player||after.eventSeq<=before.eventSeq)return{route,cardSources};
 let position=player.position;
 const advance=(to:number,back=false)=>{const count=back?(position-to+40)%40:(to-position+40)%40;for(let n=0;n<count;n++){position=(position+(back?39:1))%40;route.push(position);}};
 for(const entry of after.log.filter(e=>e.id>before.eventSeq)){
  if(actorAtEvent(before,after,entry.id)!==id)continue;
  if(entry.kind==='move'){const space=BOARD.filter(s=>entry.text===`${player.name} arrives at ${s.name}.`).sort((a,b)=>(a.index-position+40)%40-(b.index-position+40)%40)[0];if(space)advance(space.index);}
  if(entry.kind==='card')cardSources.set(entry.id,position);
  if(entry.kind==='back'){const steps=Number(entry.text.match(/moves back (\d+) spaces/)?.[1]);if(steps)advance((position-steps+40)%40,true);}
  if(entry.kind==='jail'&&entry.text===`${player.name} goes directly to jail.`){position=10;route.push(10);}
 }
 const end=after.players.find(p=>p.id===id);if(end&&position!==end.position){if(route.length)advance(end.position);else route.push(end.position);}
 return{route,cardSources};
}
export function movementRoute(before:Game,after:Game,id:string){return journey(before,after,id).route;}
