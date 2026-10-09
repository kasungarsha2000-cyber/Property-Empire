import {describe,it,expect} from 'vitest';
import {createGame,applyAction,record} from '../packages/core/engine';
import {gameNotices,tableNotices,decisionFor} from '../apps/web/src/game-events';
const base=()=>{const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=0;g.phase='roll';return g;};
describe('game event popups',()=>{
 it('does not replay a restored save or repeated snapshot',()=>{const g=base();record(g,'Ben pays Ada $20.','payment');expect(gameNotices(null,g,'a')).toEqual([]);expect(gameNotices(g,g,'a')).toEqual([]);});
 it('shows actual rent received with the property and amount',()=>{const g=base();g.current=1;g.players[1].position=0;g.properties[9].owner='a';const next=applyAction(g,'b',{type:'roll'});const notices=gameNotices(g,next,'a');expect(notices).toContainEqual(expect.objectContaining({title:'Rent collected',amount:8,property:9}));});
 it('does not announce unpaid rent as collected',()=>{const g=base();g.current=1;g.players[1].position=0;g.players[1].cash=0;g.properties[9].owner='a';const next=applyAction(g,'b',{type:'roll'});expect(next.phase).toBe('debt');expect(gameNotices(g,next,'a').some(n=>n.title==='Rent collected')).toBe(false);});
 it('shows rent paid as a deduction',()=>{const g=base();g.players[0].position=0;g.properties[9].owner='b';const next=applyAction(g,'a',{type:'roll'});expect(gameNotices(g,next,'a')).toContainEqual(expect.objectContaining({title:'Rent paid',amount:-8}));});
 it('identifies rent triggered by a movement card for both players',()=>{const g=base();g.players[0].position=27;g.properties[5].owner='b';g.decks.chance=[5,...g.decks.chance.filter(i=>i!==5)];const next=applyAction(g,'a',{type:'roll'});expect(gameNotices(g,next,'a')).toContainEqual(expect.objectContaining({title:'Rent paid',amount:-50,property:5}));expect(gameNotices(g,next,'b')).toContainEqual(expect.objectContaining({title:'Rent collected',amount:50,property:5}));});
 it('keeps card payments distinct from rent',()=>{const g=base();g.players[1].position=1;g.properties[1].owner='a';const next=structuredClone(g);record(next,'Collect $10 from everyone.','card');record(next,'Ben pays Ada $10.','payment');expect(gameNotices(g,next,'a')).toContainEqual(expect.objectContaining({title:'Money received',amount:10}));expect(gameNotices(g,next,'a').some(n=>n.title==='Rent collected')).toBe(false);});
 it('does not label a deferred off-turn card payment as rent',()=>{const g=base();g.phase='debt';g.debt={player:'b',amount:10,creditor:'a'};g.players[1].position=1;g.properties[1].owner='a';const next=structuredClone(g);record(next,'Ben pays Ada $10.','payment');expect(gameNotices(g,next,'a')).toContainEqual(expect.objectContaining({title:'Money received',amount:10}));});
 it('handles duplicate player names without guessing the payer from text',()=>{const g=base();g.players[1].name='Ada';g.current=1;g.properties[9].owner='a';const next=applyAction(g,'b',{type:'roll'});const notices=gameNotices(g,next,'a');expect(notices).toHaveLength(1);expect(notices[0]).toEqual(expect.objectContaining({title:'Cash updated',amount:8}));});
 it('confirms a purchased deed',()=>{const g=base();g.phase='purchase';g.pendingProperty=1;const next=applyAction(g,'a',{type:'buy'});expect(gameNotices(g,next,'a')).toContainEqual(expect.objectContaining({title:'Property purchased',property:1,amount:-60}));});
 it('includes personal salary and jail notices, ignoring another player salary',()=>{const g=base(),next=structuredClone(g);record(next,'Ada passes Start and collects $200.','salary');record(next,'Ben passes Start and collects $200.','salary');record(next,'Ada goes directly to jail.','jail');const notices=gameNotices(g,next,'a');expect(notices).toHaveLength(2);expect(notices[0].amount).toBe(200);expect(notices[1].kind).toBe('jail');});
 it('offers a purchase decision only to the authorized player',()=>{const g=base();g.phase='purchase';g.pendingProperty=1;expect(decisionFor(g,'a')).toEqual(expect.objectContaining({kind:'purchase',property:1}));expect(decisionFor(g,'b')).toBeNull();});
 it('opens a fresh decision for revised terms after the earlier offer was dismissed',()=>{const g=base();g.phase='manage';let offer=applyAction(g,'a',{type:'offerTrade',to:'b',give:[],receive:[],giveCash:100,receiveCash:20,giveCards:0,receiveCards:0});const first=decisionFor(offer,'b')!.key;offer=applyAction(offer,'b',{type:'counterTrade',to:'a',give:[],receive:[],giveCash:20,receiveCash:90,giveCards:0,receiveCards:0});offer=applyAction(offer,'a',{type:'counterTrade',to:'b',give:[],receive:[],giveCash:95,receiveCash:20,giveCards:0,receiveCards:0});expect(decisionFor(offer,'b')!.key).not.toBe(first);});
 it('keeps a dismissed decision key stable across unrelated revisions',()=>{const g=base();g.phase='purchase';g.pendingProperty=1;const next={...g,revision:g.revision+1};expect(decisionFor(g,'a')?.key).toBeTruthy();expect(decisionFor(g,'a')?.key).toBe(decisionFor(next,'a')?.key);});
 it('shows a named community card and its exact money effect',()=>{const g=base();g.players[0].position=24;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];const next=applyAction(g,'a',{type:'roll'});expect(gameNotices(g,next,'a')).toContainEqual(expect.objectContaining({title:'Community Chest',card:expect.objectContaining({deck:'community',amount:200,source:33})}));});
 it('does not attribute an opponent card to me across a reconnect gap',()=>{const g=base();g.phase='manage';g.players[1].position=27;g.properties[5].owner='a';g.decks.chance=[5,...g.decks.chance.filter(i=>i!==5)];const next=applyAction(applyAction(g,'a',{type:'end'}),'b',{type:'roll'});expect(gameNotices(g,next,'a').some(n=>n.card)).toBe(false);expect(gameNotices(g,next,'b')).toContainEqual(expect.objectContaining({card:expect.objectContaining({player:'Ben',source:36})}));});
});
describe('opponent activity popups',()=>{
 it('shows an opponent arrival and purchase without exposing their actions',()=>{
  const g=base();g.current=1;const landed=applyAction(g,'b',{type:'roll'});
  expect(tableNotices(g,landed,'a')).toContainEqual(expect.objectContaining({kind:'arrival',observer:true,property:9,title:'Ben · Property available'}));
  const bought=applyAction(landed,'b',{type:'buy'});
  expect(tableNotices(landed,bought,'a')).toContainEqual(expect.objectContaining({kind:'purchase',observer:true,property:9,amount:-120,title:'Ben · Property purchased'}));
 });
 it('shows the actual opponent card while keeping personal cash attribution unchanged',()=>{
  const g=base();g.current=1;g.players[1].position=24;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];
  const next=applyAction(g,'b',{type:'roll'});
  expect(tableNotices(g,next,'a')).toContainEqual(expect.objectContaining({observer:true,card:expect.objectContaining({player:'Ben',deck:'community',source:33,amount:200})}));
  expect(gameNotices(g,next,'a')).toEqual([]);
 });
 it('deduplicates payments involving the viewer and observes other players build/debt',()=>{
  const g=base();g.current=1;g.properties[9].owner='a';const paid=applyAction(g,'b',{type:'roll'});
  expect(tableNotices(g,paid,'a').filter(n=>n.kind==='payment')).toHaveLength(1);
  expect(tableNotices(g,paid,'a')).toContainEqual(expect.objectContaining({title:'Rent collected',amount:8}));
  g.players[1].cash=0;const debt=applyAction(g,'b',{type:'roll'});
  expect(tableNotices(g,debt,'a')).toContainEqual(expect.objectContaining({kind:'debt',observer:true,title:'Ben · Payment due'}));
  expect(tableNotices(g,debt,'a').some(n=>n.title==='Rent collected')).toBe(false);
  const m=base();m.current=1;m.phase='manage';m.properties[1].owner='b';m.properties[3].owner='b';
  expect(tableNotices(m,applyAction(m,'b',{type:'build',property:1}),'a')).toContainEqual(expect.objectContaining({kind:'build',observer:true,property:1,title:'Ben · House built'}));
 });
 it('does not replay activity from restored or repeated snapshots',()=>{
  const g=base();expect(tableNotices(null,g,'a')).toEqual([]);expect(tableNotices(g,g,'a')).toEqual([]);
 });
 it('includes bank payments by later actors across a reconnect gap',()=>{
  const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true},{id:'c',name:'Cleo',bot:true}]},42);g.current=0;g.phase='manage';g.players[1].position=31;g.players[2].position=33;
  let next=applyAction(g,'a',{type:'end'});next=applyAction(next,'b',{type:'roll'});next=applyAction(next,'b',{type:'end'});next=applyAction(next,'c',{type:'roll'});
  expect(next.players[2].cash).toBe(1500);
  expect(tableNotices(g,next,'a')).toContainEqual(expect.objectContaining({title:'Cleo · Payment to the bank',observer:true,amount:-200}));
 });
});
