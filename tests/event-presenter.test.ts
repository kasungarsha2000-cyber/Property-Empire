import {it,expect,vi} from 'vitest';
import {createGame,applyAction} from '../packages/core';
import {EventPresenter} from '../apps/web/src/event-presenter';
const setup=()=>{
 const attributes=new Map<string,string>(),classes=new Set<string>();
 const host={hidden:true,innerHTML:'',className:'',setAttribute:(k:string,v:string)=>attributes.set(k,v),removeAttribute:(k:string)=>attributes.delete(k)};
 const stage={classList:{add:(k:string)=>classes.add(k),remove:(k:string)=>classes.delete(k),toggle:(k:string,on:boolean)=>on?classes.add(k):classes.delete(k)}};
 return{host,attributes,classes,presenter:new EventPresenter(host as unknown as HTMLElement,stage as unknown as HTMLElement)};
};
it('shows opponent cards only after arrival, auto-dismisses, and never blocks the turn',()=>{
 vi.useFakeTimers();try{
  const {presenter,host,attributes,classes}=setup();const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=1;g.players[1].position=24;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];
  presenter.update(g,'a',null);presenter.setMoving(true);presenter.update(applyAction(g,'b',{type:'roll'}),'a',null);
  expect(host.hidden).toBe(true);expect(presenter.hasBlockingCard).toBe(false);presenter.setMoving(false);
  expect(host.hidden).toBe(false);expect(host.innerHTML).toContain('Ben · Community Chest');expect(host.innerHTML).toContain('+$200');expect(attributes.get('role')).toBe('status');expect(classes.has('decision-open')).toBe(false);
  presenter.setMoving(false);vi.advanceTimersByTime(5300);expect(host.hidden).toBe(true);presenter.reset();
 }finally{vi.useRealTimers();}
});
it('lets the viewer decision take priority over an opponent card',()=>{
 vi.useFakeTimers();try{
  const {presenter,host}=setup();const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=1;g.players[1].position=24;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];
  presenter.update(g,'a',null);const next=applyAction(g,'b',{type:'roll'});presenter.update(next,'a',null);
  expect(host.innerHTML).toContain('Community Chest');
  presenter.update(next,'a',{key:'my-buy',kind:'purchase',title:'Your purchase',html:'<button>Buy for $60</button>'});
  expect(host.innerHTML).toContain('Your purchase');expect(host.innerHTML).not.toContain('card-instruction');presenter.reset();
 }finally{vi.useRealTimers();}
});
it('discards an opponent card when restoring an earlier save in the same match',()=>{
 vi.useFakeTimers();try{
  const {presenter,host}=setup();const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=1;g.players[1].position=24;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];
  presenter.update(g,'a',null);presenter.update(applyAction(g,'b',{type:'roll'}),'a',null);expect(host.hidden).toBe(false);
  presenter.update(g,'a',null);expect(host.hidden).toBe(true);expect(presenter.hasBlockingCard).toBe(false);presenter.reset();
 }finally{vi.useRealTimers();}
});
