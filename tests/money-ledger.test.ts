import {it,expect,vi} from 'vitest';
import {createGame,applyAction} from '../packages/core';
import {cashDeltas,MoneyLedger} from '../apps/web/src/money-ledger';
type EffectNode={innerHTML:string;className:string;attributes:Map<string,string>;classes:Set<string>;parentElement:PlayerRow|null;setParent:(parent:PlayerRow|null)=>void;setAttribute:(key:string,value:string)=>void;classList:{toggle:(key:string,on:boolean)=>unknown};remove:()=>void};
type PlayerRow={dataset:{player:string};clientWidth:number;nodes:EffectNode[];style:{setProperty:()=>void};ownerDocument:{createElement:()=>EffectNode};querySelector:()=>null;append:(node:EffectNode)=>void};
const base=()=>{const game=createGame({players:['a','b','c'].map(id=>({id,name:id.toUpperCase(),bot:false}))},42);game.current=0;return game;};
it('shows the buyer actual purchase cost and both sides of paid rent',()=>{
 const game=base();game.phase='purchase';game.pendingProperty=1;
 expect(cashDeltas(game,applyAction(game,'a',{type:'buy'}))).toEqual([{player:'a',name:'A',amount:-60}]);
 game.phase='roll';game.pendingProperty=null;game.properties[9].owner='b';
 expect(cashDeltas(game,applyAction(game,'a',{type:'roll'}))).toEqual([{player:'a',name:'A',amount:-8},{player:'b',name:'B',amount:8}]);
});
it('shows net cash after trade interest instead of the promised offer amounts',()=>{
 const game=base();game.phase='manage';game.properties[1]={owner:'a',level:0,mortgaged:true};game.properties[3].owner='b';
 const offer=applyAction(game,'a',{type:'offerTrade',to:'b',give:[1],receive:[3],giveCash:100,receiveCash:25,giveCards:0,receiveCards:0});
 expect(cashDeltas(game,offer)).toEqual([]);
 expect(cashDeltas(offer,applyAction(offer,'b',{type:'acceptTrade'}))).toEqual([{player:'a',name:'A',amount:-75},{player:'b',name:'B',amount:72}]);
 expect(cashDeltas(offer,applyAction(offer,'b',{type:'rejectTrade'}))).toEqual([]);
});
it('credits birthday recipients and every actual contributor after resolving the card',()=>{
 const game=base();game.players[0].position=24;game.decks.community=[8,...game.decks.community.filter(id=>id!==8)];
 const drawn=applyAction(game,'a',{type:'roll'});expect(cashDeltas(game,drawn)).toEqual([]);
 expect(cashDeltas(drawn,applyAction(drawn,'a',{type:'resolveCard'}))).toEqual([{player:'a',name:'A',amount:20},{player:'b',name:'B',amount:-10},{player:'c',name:'C',amount:-10}]);
});
it('does not display unpaid debt and credits only actual cash inherited at bankruptcy',()=>{
 const game=base();game.players[0].cash=5;game.properties[9].owner='b';
 const debt=applyAction(game,'a',{type:'roll'});expect(cashDeltas(game,debt)).toEqual([]);
 expect(cashDeltas(debt,applyAction(debt,'a',{type:'bankrupt'}))).toEqual([{player:'a',name:'A',amount:-5},{player:'b',name:'B',amount:5}]);
});
it('suppresses first load, identical snapshots, restored saves and different matches',()=>{
 const game=base();game.phase='purchase';game.pendingProperty=1;const bought=applyAction(game,'a',{type:'buy'});
 expect(cashDeltas(null,bought)).toEqual([]);expect(cashDeltas(bought,bought)).toEqual([]);expect(cashDeltas(bought,game)).toEqual([]);
 const other=base();other.players[0].id='new';other.eventSeq=bought.eventSeq+1;other.players[1].cash=50;expect(cashDeltas(bought,other)).toEqual([]);
});
it('accumulates cash during travel, flushes on arrival, and resets without stale effects',()=>{
 const ledger=new MoneyLedger(),game=base();game.phase='purchase';game.pendingProperty=1;
 ledger.observe(game,false);const bought=applyAction(game,'a',{type:'buy'});ledger.observe(bought,true);
 expect(ledger.changes).toEqual([]);ledger.settle();expect(ledger.changes).toEqual([{player:'a',name:'A',amount:-60}]);
 ledger.observe(bought,false);expect(ledger.changes).toEqual([{player:'a',name:'A',amount:-60}]);
 ledger.observe(game,false,false);expect(ledger.changes).toEqual([]);ledger.reset();
});
it('combines quick settlements once per player and clears them after their readable interval',()=>{
 vi.useFakeTimers();try{
  const ledger=new MoneyLedger(),game=base();game.phase='purchase';game.pendingProperty=1;ledger.observe(game,false);
  const bought=applyAction(game,'a',{type:'buy'}),mortgaged=applyAction(bought,'a',{type:'mortgage',property:1});ledger.observe(bought,true);ledger.observe(mortgaged,true);expect(ledger.changes).toEqual([]);ledger.settle();expect(ledger.changes).toEqual([{player:'a',name:'A',amount:-30}]);
  ledger.observe(mortgaged,false);vi.advanceTimersByTime(2000);expect(ledger.changes).toHaveLength(1);vi.advanceTimersByTime(801);expect(ledger.changes).toEqual([]);ledger.reset();
 }finally{vi.useRealTimers();}
});
it('shows a new gain as a gain when it follows a recently displayed payment',()=>{
 const ledger=new MoneyLedger(),game=base();game.phase='purchase';game.pendingProperty=1;ledger.observe(game,false);const bought=applyAction(game,'a',{type:'buy'});ledger.observe(bought,false);expect(ledger.changes[0].amount).toBe(-60);
 ledger.observe(applyAction(bought,'a',{type:'mortgage',property:1}),false);expect(ledger.changes).toEqual([{player:'a',name:'A',amount:30}]);ledger.reset();
});
it('records actual birthday cash received after a contributor can settle only part of the obligation',()=>{
 const game=base();game.players[0].position=24;game.players[1].cash=5;game.decks.community=[8,...game.decks.community.filter(id=>id!==8)];
 const drawn=applyAction(game,'a',{type:'roll'}),debt=applyAction(drawn,'a',{type:'resolveCard'});expect(cashDeltas(drawn,debt)).toEqual([]);
 expect(cashDeltas(debt,applyAction(debt,'b',{type:'bankrupt'}))).toEqual([{player:'a',name:'A',amount:15},{player:'b',name:'B',amount:-5},{player:'c',name:'C',amount:-10}]);
});
it('reattaches the same readable player delta after rows are rerendered, without duplicating it',()=>{
 vi.useFakeTimers();try{
  const element=():EffectNode=>{const attributes=new Map<string,string>(),classes=new Set<string>();let parent:PlayerRow|null=null;
   const node:EffectNode={innerHTML:'',className:'',attributes,classes,get parentElement(){return parent;},setParent:(next:PlayerRow|null)=>{parent=next;},setAttribute:(key:string,value:string)=>{attributes.set(key,value);},classList:{toggle:(key:string,on:boolean)=>on?classes.add(key):classes.delete(key)},remove:()=>{if(parent){parent.nodes.splice(parent.nodes.indexOf(node),1);parent=null;}}};return node;
  };
  const row=(player:string):PlayerRow=>({dataset:{player},clientWidth:220,nodes:[],style:{setProperty:()=>{}},ownerDocument:{createElement:element},querySelector:()=>null,append:function(child:EffectNode){child.remove();child.setParent(this);this.nodes.push(child);}});
  let rows=[row('a'),row('b'),row('c')];const host={querySelectorAll:()=>rows};let reduced=false;const ledger=new MoneyLedger(host as unknown as HTMLElement,()=>reduced),game=base();game.phase='purchase';game.pendingProperty=1;
  ledger.observe(game,false);ledger.observe(applyAction(game,'a',{type:'buy'}),false);expect(rows[0].nodes).toHaveLength(1);expect(rows[1].nodes).toHaveLength(0);const effect=rows[0].nodes[0];expect(effect.innerHTML).toContain('−$60');expect(effect.attributes.get('aria-label')).toBe('A paid $60');
  rows=[row('a'),row('b'),row('c')];ledger.refresh();ledger.refresh();expect(rows[0].nodes).toEqual([effect]);reduced=true;ledger.configure();expect(effect.classes.has('ledger-reduced')).toBe(true);ledger.reset();expect(rows[0].nodes).toEqual([]);
 }finally{vi.useRealTimers();}
});
