import {it,expect} from 'vitest';
import * as physics from '../apps/web/src/dice-physics';
function random(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
it('rolls across the wide felt with gravity, rebounds and no crossed dice',()=>{
 const positions:number[]=[],depths:number[]=[];
 for(let seed=1;seed<=60;seed++){
  const plan=physics.planDiceRoll(physics.INITIAL_DICE,random(seed));
  for(const frame of plan.frames){const [a,b]=frame;
   expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeGreaterThanOrEqual(1.299);
   for(const die of frame){expect(die.x).toBeGreaterThanOrEqual(physics.DICE_FIELD.minX+.64);expect(die.x).toBeLessThanOrEqual(physics.DICE_FIELD.maxX-.64);expect(die.z).toBeGreaterThanOrEqual(physics.DICE_FIELD.minZ+.64);expect(die.z).toBeLessThanOrEqual(physics.DICE_FIELD.maxZ-.64);expect(die.y).toBeGreaterThanOrEqual(physics.DICE_FIELD.floor+.374);expect(physics.dicePlaceClear(die.x,die.z)).toBe(true);positions.push(die.x);depths.push(die.z);}
  }
  for(const die of plan.frames.at(-1)!){expect(Math.sin(die.rotation[0])).toBeCloseTo(0);expect(Math.cos(die.rotation[0])).toBeCloseTo(1);expect(Math.sin(die.rotation[2])).toBeCloseTo(0);expect(die.y).toBeCloseTo(physics.DICE_FIELD.floor+.375);}
 }
 expect(Math.min(...positions)).toBeLessThan(-3.7);expect(Math.max(...positions)).toBeGreaterThan(3.7);expect(Math.max(...depths)-Math.min(...depths)).toBeGreaterThan(.65);
});
it('starts where the dice rested and keeps tumble direction through settling',()=>{
 const plan=physics.planDiceRoll(physics.INITIAL_DICE,random(41));
 for(let i=0;i<2;i++){
  expect(plan.frames[0][i].x).toBe(physics.INITIAL_DICE[i].x);expect(plan.frames[0][i].z).toBe(physics.INITIAL_DICE[i].z);
  const turns=plan.frames.map(frame=>frame[i].rotation[0]),direction=Math.sign(turns[1]-turns[0]);
  for(let n=1;n<turns.length;n++)expect((turns[n]-turns[n-1])*direction).toBeGreaterThanOrEqual(-.000001);
 }
 const next=physics.planDiceRoll(plan.rest,random(78));expect(next.frames[0].map(d=>[d.x,d.z])).toEqual(plan.rest.map(d=>[d.x,d.z]));
});
it('samples the same physical path at any display frame rate',()=>{
 const plan=physics.planDiceRoll(physics.INITIAL_DICE,random(19));
 const p=physics.sampleDiceRoll(plan,.5),again=physics.sampleDiceRoll(plan,.5);expect(p).toEqual(again);
 expect(physics.sampleDiceRoll(plan,1)).toEqual(plan.frames.at(-1));
 expect(plan.frames.some(frame=>frame.some(d=>d.y>1.3))).toBe(true);
 expect(new Set(Array.from({length:8},(_,n)=>JSON.stringify(physics.planDiceRoll(physics.INITIAL_DICE,random(n+1)).rest))).size).toBe(8);
});
it('keeps interpolated poses clear through repeated rolls and rebounds',()=>{
 let rest=physics.INITIAL_DICE,totalReversals=0;
 for(let seed=1;seed<=16;seed++){
  const plan=physics.planDiceRoll(rest,random(seed*991));
  let reversals=0;
  for(let i=2;i<plan.frames.length;i++){
   for(let die=0;die<2;die++){
    const previous=plan.frames[i-1][die].x-plan.frames[i-2][die].x,next=plan.frames[i][die].x-plan.frames[i-1][die].x;
    if(previous*next<0)reversals++;
   }
  }
  totalReversals+=reversals;
  for(let n=0;n<90;n++){
   const pair=physics.sampleDiceRoll(plan,(n+.37)/90);
   expect(Math.hypot(pair[0].x-pair[1].x,pair[0].z-pair[1].z)).toBeGreaterThanOrEqual(1.299);
   for(const die of pair){expect(physics.dicePlaceClear(die.x,die.z)).toBe(true);expect(die.y).toBeGreaterThanOrEqual(physics.DICE_FIELD.floor+.374);}
  }
  rest=plan.rest;
 }
 expect(totalReversals).toBeGreaterThan(0);
});
