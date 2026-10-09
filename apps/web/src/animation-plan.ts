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
export type DiceLanding={x:number;z:number;yaw:number};
export function diceLanding(random= Math.random):[DiceLanding,DiceLanding]{
 // Leave room for the full cube footprint even at a 45° resting angle.
 return [{x:-1.08+random()*.43,z:3.15+random()*.60,yaw:random()*Math.PI*2},{x:.95+random()*.40,z:3.15+random()*.60,yaw:random()*Math.PI*2}];
}
/** Independent lanes leave clearance for the entire cube, at every tumble angle. */
export function dicePose(from:DiceLanding,to:DiceLanding,t:number,spin:number,index:number){
 t=Math.max(0,Math.min(1,t));if(t===1)return{x:to.x,y:1.07,z:to.z,rotation:[0,to.yaw,0] as [number,number,number]};
 const eased=1-(1-t)**2,turn=spin*Math.sin(t*Math.PI),yaw=from.yaw+Math.atan2(Math.sin(to.yaw-from.yaw),Math.cos(to.yaw-from.yaw))*eased+turn*.6;
 const rotation:[number,number,number]=[turn,yaw,turn*.8],cx=Math.cos(turn),sx=Math.sin(turn),cy=Math.cos(yaw),sy=Math.sin(yaw),cz=Math.cos(turn*.8),sz=Math.sin(turn*.8);
 const halfX=.375*(Math.abs(cy*cz)+Math.abs(cy*sz)+Math.abs(sy)),halfY=.375*(Math.abs(cx*sz+sx*sy*cz)+Math.abs(cx*cz-sx*sy*sz)+Math.abs(sx*cy)),halfZ=.375*(Math.abs(sx*sz-cx*sy*cz)+Math.abs(sx*cz+cx*sy*sz)+Math.abs(cx*cy));
 const x=from.x+(to.x-from.x)*eased,z=from.z+(to.z-from.z)*eased;
 return{x:Math.max(index===0?-1.655+halfX:.95,Math.min(index===0?-.65:1.955-halfX,x)),y:.695+halfY+Math.sin(t*Math.PI)*(.26+Math.abs(Math.sin(t*Math.PI*4+index))*.48),z:Math.max(2.61+halfZ,Math.min(4.29-halfZ,z)),rotation};
}
