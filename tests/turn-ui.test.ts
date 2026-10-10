import {describe,it,expect} from 'vitest';
import {createGame,applyAction} from '../packages/core/index';
import type {Action,Game} from '../packages/core/types';
import {viewerDecision,dockModel,tradeOpen,type DockContext} from '../apps/web/src/ui/turn-state';
import {purchasePanel,auctionPanel,jailPanel,debtPanel,incomingTradePanel,liquidationValue,tradeSentence,bidSteps} from '../apps/web/src/ui/decisions';
import {cardReveal} from '../apps/web/src/ui/card-reveal';
import {emptyDraft,togglePick,setAmount,changePartner,tradeIssue,tradeBuilderSheet} from '../apps/web/src/ui/trade-builder';
import {portfolioSheet} from '../apps/web/src/ui/portfolio';
import {bankSheet,moneyHistory} from '../apps/web/src/ui/sheets';

const base=()=>{const g=createGame({players:[{id:'a',name:'Ada',bot:false,token:0},{id:'b',name:'Ben',bot:true,token:1},{id:'c',name:'Cleo',bot:true,token:2}]},42);g.current=0;return g;};
const checkFor=(g:Game,id='a')=>(action:Action)=>{try{applyAction(g,id,action);return null;}catch(e){return e instanceof Error?e.message:'Unavailable';}};
const ctx=(g:Game,patch:Partial<DockContext>={}):DockContext=>({viewer:'a',moving:false,online:true,panelOpen:false,cardOpen:false,allowed:action=>!checkFor(g)(action),...patch});

describe('decisions for the viewer',()=>{
 it('identifies purchase, jail, debt, trade and auction decisions with stable keys',()=>{
  const g=base();expect(viewerDecision(g,'a')).toBeNull();
  g.phase='purchase';g.pendingProperty=1;expect(viewerDecision(g,'a')).toMatchObject({kind:'purchase',mine:true});expect(viewerDecision(g,'b')).toBeNull();
  const auction=applyAction(g,'a',{type:'decline'});expect(viewerDecision(auction,'a')).toMatchObject({kind:'auction',mine:true});expect(viewerDecision(auction,'b')).toMatchObject({kind:'auction',mine:false});
  const bid=applyAction(auction,'a',{type:'bid',amount:10});expect(viewerDecision(bid,'a')!.key).not.toBe(viewerDecision(auction,'a')!.key);
  const jail=base();jail.players[0].jailed=true;jail.players[0].position=10;expect(viewerDecision(jail,'a')?.kind).toBe('jail');
  const debt=base();debt.phase='debt';debt.debt={player:'a',amount:50,creditor:'b'};expect(viewerDecision(debt,'a')?.kind).toBe('debt');expect(viewerDecision(debt,'b')).toBeNull();
  const trade=base();trade.phase='manage';trade.properties[1].owner='b';const offered=applyAction(trade,'a',{type:'offerTrade',to:'b',give:[],receive:[1],giveCash:80,receiveCash:0,giveCards:0,receiveCards:0});expect(viewerDecision(offered,'b')?.kind).toBe('trade');expect(viewerDecision(offered,'a')).toBeNull();
 });
 it('never presents a decision to a bankrupt viewer or after the match',()=>{const g=base();g.players[0].bankrupt=true;g.current=1;expect(viewerDecision(g,'a')).toBeNull();g.phase='ended';g.winner='b';expect(viewerDecision(g,'b')).toBeNull();});
});

describe('action dock',()=>{
 it('offers exactly the valid primary action',()=>{
  const g=base();expect(dockModel(g,ctx(g)).primary).toMatchObject({label:'Roll dice',action:{type:'roll'},disabled:false});
  const manage=base();manage.phase='manage';expect(dockModel(manage,ctx(manage)).primary?.label).toBe('End turn');manage.extraRoll=true;expect(dockModel(manage,ctx(manage)).primary?.label).toBe('Roll again');
  const other=base();other.current=1;const model=dockModel(other,ctx(other));expect(model.primary).toBeNull();expect(model.title).toBe('Ben’s turn');
 });
 it('defers to an open decision panel and re-opens a minimised one',()=>{
  const g=base();g.phase='purchase';g.pendingProperty=1;
  expect(dockModel(g,ctx(g,{panelOpen:true})).primary).toBeNull();expect(dockModel(g,ctx(g)).primary).toMatchObject({command:'open-decision',label:'Review purchase'});
 });
 it('shows movement, reconnecting and results states',()=>{
  const g=base();expect(dockModel(g,ctx(g,{moving:true})).mood).toBe('moving');expect(dockModel(g,ctx(g,{online:false})).primary).toBeNull();
  g.phase='ended';g.winner='a';expect(dockModel(g,ctx(g)).primary?.command).toBe('show-results');
 });
 it('lets the viewer reopen their own card and see who drew one',()=>{
  const g=base();g.players[0].position=4;const drawn=applyAction((()=>{let s=0;for(;s<5000;s++){const t=structuredClone(g);t.rng=s;const r=applyAction(t,'a',{type:'roll'});if(r.phase==='card')return t;}return g;})(),'a',{type:'roll'});
  expect(drawn.phase).toBe('card');expect(dockModel(drawn,ctx(drawn)).primary?.label).toBe('Read card');expect(dockModel(drawn,ctx(drawn,{cardOpen:true})).primary).toBeNull();
  expect(dockModel(drawn,ctx(drawn,{viewer:'b'})).title).toMatch(/^Ada drew/);
 });
 it('names the seated player instead of “you” when several humans share the device',()=>{
  const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'c',name:'Cleo',bot:false}]},42);g.current=1;
  expect(dockModel(g,ctx(g,{viewer:'c',hotseat:true,allowed:()=>true})).title).toBe('Cleo’s turn');
  expect(dockModel(g,ctx(g,{viewer:'c',allowed:()=>true})).title).toBe('Your turn');
 });
 it('opens trading only to the acting player once per turn',()=>{const g=base();expect(tradeOpen(g,'a')).toBe(true);expect(tradeOpen(g,'b')).toBe(false);g.tradeOffered=true;expect(tradeOpen(g,'a')).toBe(false);});
});

describe('decision panels',()=>{
 it('purchase shows price, cash after and a raise-cash path when short',()=>{
  const g=base();g.phase='purchase';g.pendingProperty=39;g.players[0].position=39;
  const html=purchasePanel(g,'a',checkFor(g));expect(html).toContain('Buy for $400');expect(html).toContain('$1,100');expect(html).not.toContain('Raise cash');
  g.players[0].cash=300;g.properties[1].owner='a';const short=purchasePanel(g,'a',checkFor(g));expect(short).toContain('Short $100');expect(short).toContain('Raise cash');expect(short).toMatch(/data-action="[^"]*buy[^"]*" disabled/);
 });
 it('auction gives the bidder a clamped stepper and others a waiting state',()=>{
  const g=base();g.phase='purchase';g.pendingProperty=6;const auction=applyAction(applyAction(g,'a',{type:'decline'}),'a',{type:'bid',amount:30});
  const watching=auctionPanel(auction,'a',checkFor(auction,'a'),null);expect(watching).toContain('Ben');expect(watching).toContain('is bidding');expect(watching).not.toContain('bid-amount');
  const bidding=auctionPanel(auction,'b',checkFor(auction,'b'),5);expect(bidding).toContain('value="31"');expect(bidding).toContain('Bid $31');expect(bidding).toContain('Minimum $31');
  expect(bidSteps(400)).toEqual([10,25,50,100]);
 });
 it('jail explains the last attempt and unavailable options',()=>{
  const g=base();g.players[0].jailed=true;g.players[0].position=10;g.players[0].jailTurns=2;g.players[0].cash=20;
  const html=jailPanel(g,'a',checkFor(g));expect(html).toContain('Attempt 3 of 3');expect(html).toContain('last attempt');expect(html).toContain('You need $30 more');expect(html).toContain('do not hold');
 });
 it('debt shows the shortfall, what can be raised and a confirmed bankruptcy path',()=>{
  const g=base();g.phase='debt';g.debt={player:'a',amount:300,creditor:'b',rentProperty:9};g.players[0].cash=100;g.properties[1].owner='a';g.properties[3].owner='a';g.properties[1].level=1;g.houses=31;
  expect(liquidationValue(g,'a')).toBe(25+30+30);
  const html=debtPanel(g,'a',checkFor(g),true);expect(html).toContain('Raise $200');expect(html).toContain('Rent at Pier Avenue');expect(html).toContain('at most $85');expect(html).toContain('confirm-bankrupt');
 });
 it('incoming trades read from the recipient’s point of view',()=>{
  const g=base();g.phase='manage';g.properties[1].owner='b';const offered=applyAction(g,'a',{type:'offerTrade',to:'b',give:[],receive:[1],giveCash:80,receiveCash:0,giveCards:0,receiveCards:0});
  const html=incomingTradePanel(offered,'b',checkFor(offered,'b'),true);expect(html).toContain('Ada proposes');expect(html).toContain('You give');
  expect(tradeSentence(offered,'b',offered.trade!)).toBe('You give Copper Lane. You receive $80.');expect(tradeSentence(offered,'a',offered.trade!)).toBe('You give $80. You receive Copper Lane.');
 });
});

describe('card reveal',()=>{
 it('shows the drawer’s card with Continue and an observer copy with a bot shortcut',()=>{
  const g=base();g.current=1;g.players[1].position=21;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];
  let s=0;for(;s<5000;s++){const t=structuredClone(g);t.rng=s;if(applyAction(t,'b',{type:'roll'}).players[1].position===24)break;}
  g.players[1].position=24-3;g.rng=s;let drawn:Game|null=null;for(let seed=0;seed<5000&&!drawn;seed++){const t=structuredClone(g);t.rng=seed;const r=applyAction(t,'b',{type:'roll'});if(r.phase==='card'&&r.pendingCard?.deck==='community')drawn=r;}
  expect(drawn).not.toBeNull();
  const observer=cardReveal(drawn!,{viewer:'a',canResolve:false,canContinueBot:true,reduced:true});expect(observer).toContain('observer');expect(observer).toContain('continue-observer-card');
  const own=cardReveal(drawn!,{viewer:'b',canResolve:true,canContinueBot:false,reduced:false});expect(own).toContain('resolveCard');expect(own).toContain('Community Chest');
 });
});

describe('trade builder',()=>{
 it('toggles deeds, clamps cash to what each side holds and resets the ask on partner change',()=>{
  const g=base();g.phase='manage';g.properties[1].owner='a';g.properties[3].owner='b';
  let d=togglePick(emptyDraft('b'),'give',1);expect(d.give).toEqual([1]);d=togglePick(d,'give',1);expect(d.give).toEqual([]);
  d=setAmount(g,'a',d,'giveCash',99999);expect(d.giveCash).toBe(1500);d=setAmount(g,'a',d,'receiveCards',3);expect(d.receiveCards).toBe(0);
  d=togglePick(d,'receive',3);expect(changePartner(d,'c')).toMatchObject({to:'c',receive:[],giveCash:1500});
 });
 it('explains empty or invalid offers before review',()=>{
  const g=base();g.phase='manage';g.properties[1].owner='a';g.properties[3].owner='a';g.properties[3].level=1;g.houses=31;
  expect(tradeIssue(g,'a',emptyDraft('b'))).toMatch(/Add a property/);expect(tradeIssue(g,'a',{...emptyDraft('b'),give:[1]})).toMatch(/Sell group buildings/);
  expect(tradeIssue(g,'a',{...emptyDraft('b'),giveCash:100})).toBeNull();
  const sheet=tradeBuilderSheet(g,'a',{draft:{...emptyDraft('b'),giveCash:100},side:'give',step:'build'});expect(sheet).toContain('You give $100. You receive nothing.');expect(sheet).toContain('Sell group buildings first');
 });
});

describe('properties and history',()=>{
 it('groups owned deeds by set with inline engine-checked actions',()=>{
  const g=base();g.phase='manage';g.properties[1].owner='a';g.properties[3].owner='a';g.properties[5].owner='a';
  const html=portfolioSheet(g,{viewer:'a',filter:'mine',raise:false,check:checkFor(g)});
  expect(html).toContain('Old town');expect(html).toContain('2/2');expect(html).toContain('Transit');expect(html).toContain('Build a house on Copper Lane');expect(html).not.toContain('Harbor Walk');
  expect(portfolioSheet(g,{viewer:'a',filter:'bank',raise:false,check:checkFor(g)})).toContain('Harbor Walk');
 });
 it('summarises money movements with signed amounts for the viewer',()=>{
  let g=base();g.phase='purchase';g.pendingProperty=1;g=applyAction(g,'a',{type:'buy'});
  const items=moneyHistory(g,'a','mine');expect(items[0]).toMatchObject({kind:'purchase',amount:-60});
  expect(bankSheet(g,'a','mine')).toContain('−$60');
 });
});
