import {it,expect} from 'vitest';
import * as animation from '../apps/web/src/animation-plan';
type Pose={x:number;y:number;z:number;rotation:[number,number,number]};
const pose=(animation as unknown as {dicePose?:(from:animation.DiceLanding,to:animation.DiceLanding,t:number,spin:number,index:number)=>Pose}).dicePose;
it('keeps fully rotating dice separated throughout successive random rolls',()=>{
 expect(typeof pose).toBe('function');if(!pose)return;
 let prior=animation.diceLanding();
 for(let roll=0;roll<100;roll++){
  const next=animation.diceLanding();
  for(let sample=0;sample<=100;sample++){
   const t=sample/100,a=pose(prior[0],next[0],t,27,0),b=pose(prior[1],next[1],t,19,1);
   expect(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)).toBeGreaterThan(.75*Math.sqrt(3));
   expect(a.x).toBeLessThan(0);expect(b.x).toBeGreaterThan(0);
  }
  prior=next;
 }
});
it('settles exactly on authoritative faces and varies within each lane',()=>{
 expect(typeof pose).toBe('function');if(!pose)return;
 const rests=Array.from({length:20},()=>animation.diceLanding());expect(new Set(rests.map(pair=>JSON.stringify(pair))).size).toBeGreaterThan(1);
 for(const pair of rests)for(let i=0;i<2;i++){
  const result=pose(pair[i],pair[i],1,23,i);expect(result.x).toBe(pair[i].x);expect(result.z).toBe(pair[i].z);expect(result.y).toBeCloseTo(1.07);expect(result.rotation).toEqual([0,pair[i].yaw,0]);
 }
});
