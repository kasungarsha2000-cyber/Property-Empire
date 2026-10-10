import {it,expect,vi} from 'vitest';
import {createGame,applyAction} from '../packages/core';
import {NoticeFeed,shouldNotify} from '../apps/web/src/ui/notices';

const base=()=>{const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=0;return g;};
const host=()=>({innerHTML:''}) as unknown as HTMLElement;

it('shows a passing-Start receipt for 2.2 seconds without blocking play',()=>{
 vi.useFakeTimers();try{
  const el=host(),feed=new NoticeFeed(el),g=base();g.players[0].position=39;feed.update(g,'a',false);feed.update(applyAction(g,'a',{type:'roll'}),'a',false);
  expect(el.innerHTML).toContain('Passed Start');expect(el.innerHTML).toContain('+$200');
  vi.advanceTimersByTime(2199);expect(el.innerHTML).not.toBe('');vi.advanceTimersByTime(1);expect(el.innerHTML).toBe('');
 }finally{vi.useRealTimers();}
});
it('waits for the pawn to arrive and discards stale receipts when the next move starts',()=>{
 vi.useFakeTimers();try{
  const el=host(),feed=new NoticeFeed(el),g=base();g.players[0].position=39;feed.update(g,'a',false);
  const moved=applyAction(g,'a',{type:'roll'});feed.update(moved,'a',true);expect(el.innerHTML).toBe('');
  feed.setMoving(false);expect(el.innerHTML).toContain('Passed Start');
  feed.setMoving(true);expect(el.innerHTML).toBe('');feed.setMoving(false);expect(el.innerHTML).toBe('');
 }finally{vi.useRealTimers();}
});
it('leaves rent, purchases and cards to the board and card layers',()=>{
 const el=host(),feed=new NoticeFeed(el),g=base();g.phase='purchase';g.pendingProperty=1;
 feed.update(g,'a',false);feed.update(applyAction(g,'a',{type:'buy'}),'a',false);expect(el.innerHTML).toBe('');feed.reset();
 const rent=base();rent.properties[9].owner='b';rent.players[0].position=9-7;feed.update(rent,'a',false);
 let seed=0;for(;seed<5000;seed++){const t=structuredClone(rent);t.rng=seed;if(applyAction(t,'a',{type:'roll'}).players[0].position===9)break;}
 rent.rng=seed;feed.update(applyAction(rent,'a',{type:'roll'}),'a',false);expect(el.innerHTML).not.toContain('Rent');feed.reset();
 const card=base();card.current=1;card.players[1].position=24;card.decks.community=[2,...card.decks.community.filter(i=>i!==2)];
 feed.update(card,'a',false);feed.update(applyAction(card,'b',{type:'roll'}),'a',false);expect(el.innerHTML).toBe('');
});
it('reports other players only for debt, bankruptcy and jail',()=>{
 expect(shouldNotify({key:'1',kind:'salary',title:'Ben · Passed Start',detail:'',observer:true,amount:200})).toBe(false);
 expect(shouldNotify({key:'2',kind:'debt',title:'Ben · Payment due',detail:'',observer:true})).toBe(true);
 expect(shouldNotify({key:'3',kind:'jail',title:'Ben · Sent to jail',detail:'',observer:true})).toBe(true);
 expect(shouldNotify({key:'4',kind:'arrival',title:'Ben · Arrived',detail:'',observer:true})).toBe(false);
});
it('clears everything when an earlier save is restored',()=>{
 const el=host(),feed=new NoticeFeed(el),g=base();g.players[0].position=39;feed.update(g,'a',false);const moved=applyAction(g,'a',{type:'roll'});feed.update(moved,'a',false);expect(el.innerHTML).not.toBe('');
 feed.update(g,'a',false);expect(el.innerHTML).toBe('');
});
