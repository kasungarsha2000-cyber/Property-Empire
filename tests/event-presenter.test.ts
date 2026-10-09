import {it,expect,vi} from 'vitest';
import {createGame,applyAction} from '../packages/core';
import {EventPresenter} from '../apps/web/src/event-presenter';
const setup=(reduced?:()=>boolean)=>{
 const attributes=new Map<string,string>(),classes=new Set<string>();
 const host={hidden:true,innerHTML:'',className:'',animate:vi.fn(),setAttribute:(k:string,v:string)=>attributes.set(k,v),removeAttribute:(k:string)=>attributes.delete(k)};
 const stage={classList:{add:(k:string)=>classes.add(k),remove:(k:string)=>classes.delete(k),toggle:(k:string,on:boolean)=>on?classes.add(k):classes.delete(k)}};
 return{host,attributes,classes,presenter:new EventPresenter(host as unknown as HTMLElement,stage as unknown as HTMLElement,reduced?{reduced,deckAnchor:()=>null}:undefined)};
};
it('animates a new decision once and keeps live button updates still',()=>{
 const {host,presenter}=setup(()=>false),g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);
 presenter.update(g,'a',{key:'purchase:1',kind:'purchase',title:'Copper Lane',html:'Buy for $60'});expect(host.animate).toHaveBeenCalledTimes(1);
 presenter.update(g,'a',{key:'purchase:1',kind:'purchase',title:'Copper Lane',html:'Updated purchase actions'});expect(host.animate).toHaveBeenCalledTimes(1);presenter.reset();
});
it('keeps reduced-motion decisions immediate without decorative entrance',()=>{
 const {host,presenter}=setup(()=>true),g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);
 presenter.update(g,'a',{key:'purchase:1',kind:'purchase',title:'Copper Lane',html:'Buy for $60'});expect(host.hidden).toBe(false);expect(host.animate).not.toHaveBeenCalled();presenter.reset();
});
it('shows opponent cards only after arrival, auto-dismisses, and never blocks the turn',()=>{
 vi.useFakeTimers();try{
  const {presenter,host,attributes,classes}=setup();const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=1;g.players[1].position=24;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];
  presenter.update(g,'a',null);presenter.setMoving(true);presenter.update(applyAction(g,'b',{type:'roll'}),'a',null);
  expect(host.hidden).toBe(true);expect(presenter.hasBlockingCard).toBe(false);presenter.setMoving(false);
  expect(host.hidden).toBe(false);expect(host.innerHTML).toContain('Ben · Community Chest');expect(host.innerHTML).toContain('+$200');expect(attributes.get('role')).toBe('status');expect(classes.has('decision-open')).toBe(false);
  presenter.setMoving(false);vi.advanceTimersByTime(9100);expect(host.hidden).toBe(true);presenter.reset();
 }finally{vi.useRealTimers();}
});
it('leaves spatial rent and purchase confirmations to one board notification',()=>{
 const {host,presenter}=setup(),g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=0;g.phase='purchase';g.pendingProperty=1;
 presenter.update(g,'a',null);presenter.update(applyAction(g,'a',{type:'buy'}),'a',null);expect(host.hidden).toBe(true);presenter.reset();
 g.phase='roll';g.pendingProperty=null;g.properties[9].owner='b';presenter.update(g,'a',null);presenter.update(applyAction(g,'a',{type:'roll'}),'a',null);expect(host.hidden).toBe(true);presenter.reset();
});
it('keeps a financial receipt readable for eight seconds',()=>{
 vi.useFakeTimers();try{const {host,presenter}=setup(),g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=0;g.players[0].position=39;presenter.update(g,'a',null);presenter.update(applyAction(g,'a',{type:'roll'}),'a',null);expect(host.hidden).toBe(false);vi.advanceTimersByTime(7000);expect(host.hidden).toBe(false);vi.advanceTimersByTime(1100);expect(host.hidden).toBe(true);presenter.reset();}finally{vi.useRealTimers();}
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
