import {it,expect} from 'vitest';
import {createGame,applyAction,validateGame,botDecision} from '../packages/core';
const game=(deck:'chance'|'community',card:number)=>{const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=0;g.players[0].position=deck==='chance'?27:24;g.decks[deck]=[card,...g.decks[deck].filter(i=>i!==card)];return g;};
it('holds a money card until its player reads it, and round-trips the saved card',()=>{
 const before=game('community',2),drawn=applyAction(before,'a',{type:'roll'});
 expect(drawn.phase).toBe('card');expect(drawn.players[0].cash).toBe(1500);expect(drawn.players[0].position).toBe(33);
 expect(validateGame(JSON.parse(JSON.stringify(drawn)))).toEqual(drawn);
 expect(()=>applyAction(drawn,'b',{type:'resolveCard'})).toThrow();expect(()=>applyAction(drawn,'a',{type:'end'})).toThrow();
 const resolved=applyAction(drawn,'a',{type:'resolveCard'});expect(resolved.players[0].cash).toBe(1700);expect(resolved.phase).toBe('manage');expect(resolved.pendingCard).toBeNull();expect(before.players[0].cash).toBe(1500);
});
it('leaves a pawn on Chance until Continue, then moves and offers the destination',()=>{
 const drawn=applyAction(game('chance',2),'a',{type:'roll'});expect(drawn.players[0].position).toBe(36);expect(drawn.pendingCard?.source).toBe(36);
 const resolved=applyAction(drawn,'a',{type:'resolveCard'});expect(resolved.players[0].position).toBe(39);expect(resolved.phase).toBe('purchase');expect(resolved.pendingProperty).toBe(39);
});
it('reads chained cards one at a time and resolves jail only after reading',()=>{
 let g=game('chance',8);g.decks.community=[5,...g.decks.community.filter(i=>i!==5)];g=applyAction(g,'a',{type:'roll'});
 expect(g.players[0].position).toBe(36);g=applyAction(g,'a',{type:'resolveCard'});expect(g.phase).toBe('card');expect(g.players[0].position).toBe(33);expect(g.players[0].jailed).toBe(false);
 g=applyAction(g,'a',{type:'resolveCard'});expect(g.players[0].jailed).toBe(true);expect(g.players[0].position).toBe(10);expect(validateGame(g)).toEqual(g);
});
it('keeps a jail-free card out of circulation until read, and bots can read',()=>{
 let g=game('community',0);g.current=1;g.players[1].position=24;g=applyAction(g,'b',{type:'roll'});expect(g.players[1].cards).toEqual([]);expect(validateGame(g)).toEqual(g);
 expect(botDecision(g)?.action).toEqual({type:'resolveCard'});g=applyAction(g,'b',{type:'resolveCard'});expect(g.players[1].cards).toEqual(['community']);expect(validateGame(g)).toEqual(g);
});
it('tags only actual paid rent with payer, recipient and property',()=>{
 const g=game('community',2);g.players[0].position=0;g.properties[9].owner='b';const paid=applyAction(g,'a',{type:'roll'});
 expect(paid.log.find(e=>e.kind==='payment')?.payment).toEqual({from:'a',to:'b',amount:8,property:9});
 g.players[0].cash=0;const due=applyAction(g,'a',{type:'roll'});expect(due.log.filter(e=>e.kind==='payment')).toHaveLength(0);expect(due.debt?.rentProperty).toBe(9);
});
it('rejects a pending jail-free card that is already held by another player',()=>{
 const drawn=applyAction(game('chance',0),'a',{type:'roll'});drawn.players[1].cards=['chance'];drawn.decks.chance=drawn.decks.chance.filter(i=>i!==1);expect(()=>validateGame(drawn)).toThrow('Invalid event deck');
});
