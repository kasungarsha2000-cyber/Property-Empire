import {it,expect} from 'vitest';
import {createGame,applyAction} from '../packages/core';
import {soundCues} from '../apps/web/src/game-sounds';
import {pawnPose} from '../apps/web/src/pawn-motion';
const base=()=>{const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=0;return g;};
it('does not replay restored game sounds and distinguishes rolling from landing events',()=>{
 const g=base();expect(soundCues(null,g)).toEqual([]);const rolled=applyAction(g,'a',{type:'roll'});
 expect(soundCues(g,rolled)).toContain('dice');expect(soundCues(rolled,rolled)).toEqual([]);
 const p=base();p.phase='purchase';p.pendingProperty=1;
 expect(soundCues(p,applyAction(p,'a',{type:'buy'}))).toContain('purchase');
});
it('plays a card cue and money cue for an actual card payout',()=>{
 const g=base();g.players[0].position=24;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];
 const drawn=applyAction(g,'a',{type:'roll'});expect(soundCues(g,drawn)).toContain('card');expect(soundCues(g,drawn)).not.toContain('money');expect(soundCues(drawn,applyAction(drawn,'a',{type:'resolveCard'}))).toContain('money');
});
it('pawn hops leave and return to the tile with stable scale and a higher midpoint',()=>{
 const start=pawnPose(0),peak=pawnPose(.5),end=pawnPose(1);
 expect(start.height).toBe(0);expect(end.height).toBeCloseTo(0);expect(peak.height).toBeGreaterThan(.3);
 expect(start.scaleY).toBe(1);expect(end.scaleY).toBeCloseTo(1);expect(peak.scaleY).toBeGreaterThan(1);
 expect(peak.progress).toBeCloseTo(.5);
});
