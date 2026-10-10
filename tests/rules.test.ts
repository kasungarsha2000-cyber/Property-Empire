import {describe,it,expect} from 'vitest';
import {createGame,applyAction,validateGame,actionPlayer,rentFor} from '../packages/core/index';
import {BOARD,CARDS} from '../packages/core/board';
import type {Game,Action} from '../packages/core/types';

// Deterministic dice: find the RNG state whose next two draws produce the wanted faces.
const step=(r:number)=>(Math.imul(1664525,r)+1013904223)>>>0;
function seedFor(a:number,b:number){
 for(let s=0;s<2e6;s++){const r1=step(s),r2=step(r1);if(1+Math.floor(r1/4294967296*6)===a&&1+Math.floor(r2/4294967296*6)===b)return s;}
 throw new Error('No seed');
}
function roll(g:Game,id:string,a:number,b:number){const next=structuredClone(g);next.rng=seedFor(a,b);return applyAction(next,id,{type:'roll'});}
function base(){const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:false},{id:'c',name:'Cleo',bot:false}]},7);g.current=0;return g;}
function own(g:Game,ids:number[],who='b',level=0){for(const i of ids)g.properties[i]={owner:who,level,mortgaged:false};}
const act=(g:Game,id:string,action:Action)=>applyAction(g,id,action);

describe('dice and doubles',()=>{
 it('moves by the dice total and waits for the turn to end',()=>{
  const g=roll(base(),'a',2,3);
  expect(g.players[0].position).toBe(5);expect(g.dice).toEqual([2,3]);expect(g.extraRoll).toBe(false);expect(g.phase).toBe('purchase');
 });
 it('grants another roll after doubles and keeps the doubles count',()=>{
  let g=roll(base(),'a',3,3);
  expect(g.extraRoll).toBe(true);expect(g.doubles).toBe(1);expect(g.phase).toBe('purchase');
  g=act(g,'a',{type:'decline'});while(g.phase==='auction')g=act(g,g.auction!.turn,{type:'pass'});
  g=act(g,'a',{type:'end'});
  expect(g.phase).toBe('roll');expect(g.players[g.current].id).toBe('a');expect(g.doubles).toBe(1);
  g=roll(g,'a',1,3);expect(g.players[0].position).toBe(10);expect(g.doubles).toBe(0);g=act(g,'a',{type:'end'});expect(g.players[g.current].id).toBe('b');
 });
 it('sends a third consecutive double straight to jail without moving or salary',()=>{
  const start=base();start.doubles=2;start.players[0].position=38;
  const g=roll(start,'a',1,1);
  expect(g.players[0].position).toBe(10);expect(g.players[0].jailed).toBe(true);expect(g.players[0].cash).toBe(1500);
  expect(g.extraRoll).toBe(false);expect(g.doubles).toBe(0);
  expect(act(g,'a',{type:'end'}).players[1].id).toBe('b');
 });
 it('rejects rolling while a decision, card or debt is pending',()=>{
  for(const phase of ['purchase','card','auction','debt','manage'] as const){const g=base();g.phase=phase;expect(()=>act(g,'a',{type:'roll'})).toThrow();}
  expect(()=>act(base(),'b',{type:'roll'})).toThrow();
 });
});

describe('Start salary and jail space',()=>{
 it('pays $200 once when passing Start',()=>{const s=base();s.players[0].position=37;const g=roll(s,'a',1,3);expect(g.players[0].position).toBe(1);expect(g.players[0].cash).toBe(1700);});
 it('pays $200 once when landing exactly on Start',()=>{const s=base();s.players[0].position=33;const g=roll(s,'a',3,4);expect(g.players[0].position).toBe(0);expect(g.players[0].cash).toBe(1700);expect(g.phase).toBe('manage');});
 it('Go to Jail sends the pawn to jail, cancels doubles and pays nothing',()=>{
  const s=base();s.players[0].position=26;const g=roll(s,'a',2,2);
  expect(g.players[0].position).toBe(10);expect(g.players[0].jailed).toBe(true);expect(g.extraRoll).toBe(false);expect(g.players[0].cash).toBe(1500);
 });
});

describe('jail',()=>{
 const jailed=(turns=0)=>{const g=base();g.players[0].position=10;g.players[0].jailed=true;g.players[0].jailTurns=turns;return g;};
 it('stays in jail after a missed attempt and passes the turn',()=>{
  let g=roll(jailed(),'a',1,2);
  expect(g.players[0].jailed).toBe(true);expect(g.players[0].jailTurns).toBe(1);expect(g.players[0].position).toBe(10);expect(g.phase).toBe('manage');
  g=act(g,'a',{type:'end'});expect(g.players[g.current].id).toBe('b');
 });
 it('leaves on doubles, moves by that roll and does not roll again',()=>{
  let g=roll(jailed(1),'a',2,2);
  expect(g.players[0].jailed).toBe(false);expect(g.players[0].position).toBe(14);expect(g.extraRoll).toBe(false);
  g=act(g,'a',{type:'buy'});g=act(g,'a',{type:'end'});expect(g.players[g.current].id).toBe('b');
 });
 it('pays the fine and moves after the third missed attempt',()=>{
  const g=roll(jailed(2),'a',1,2);
  expect(g.players[0].jailed).toBe(false);expect(g.players[0].cash).toBe(1450);expect(g.players[0].position).toBe(13);expect(g.phase).toBe('purchase');
 });
 it('raises a debt for the third-attempt fine, then completes the move',()=>{
  const s=jailed(2);s.players[0].cash=20;own(s,[39],'a');
  let g=roll(s,'a',1,2);
  expect(g.phase).toBe('debt');expect(g.debt).toMatchObject({player:'a',amount:50,creditor:null});expect(g.players[0].position).toBe(10);
  g=act(g,'a',{type:'mortgage',property:39});
  expect(g.players[0].cash).toBe(170);expect(g.players[0].position).toBe(13);expect(g.phase).toBe('purchase');
 });
 it('lets the player pay $50 before rolling, but not without the cash',()=>{
  const g=act(jailed(),'a',{type:'bail'});expect(g.players[0].jailed).toBe(false);expect(g.players[0].cash).toBe(1450);expect(g.phase).toBe('roll');
  const poor=jailed();poor.players[0].cash=49;expect(()=>act(poor,'a',{type:'bail'})).toThrow();
 });
 it('uses a held jail card and returns it to the bottom of its deck',()=>{
  const s=jailed();s.players[0].cards=['chance'];s.decks.chance=s.decks.chance.filter(i=>i!==0);
  const g=act(s,'a',{type:'jailCard'});
  expect(g.players[0].jailed).toBe(false);expect(g.players[0].cards).toEqual([]);expect(g.decks.chance.at(-1)).toBe(0);expect(g.decks.chance).toHaveLength(16);
  expect(()=>act(jailed(),'a',{type:'jailCard'})).toThrow('No jail card');
 });
 it('still collects rent while in jail',()=>{const s=jailed();s.current=1;own(s,[1],'a');s.players[1].position=39;const g=roll(s,'b',1,1);expect(g.players[0].cash).toBe(1502);});
});

describe('Chance and Community Chest',()=>{
 // Draw a chosen card by rolling 1+2 onto the deck space from three spaces before it.
 function draw(deck:'chance'|'community',id:number,space:number,setup?:(g:Game)=>void){
  const g=base();g.players[0].position=space-3;g.decks[deck]=[id,...g.decks[deck].filter(i=>i!==id)];setup?.(g);
  const drawn=roll(g,'a',1,2);
  expect(drawn.phase).toBe('card');expect(drawn.pendingCard).toMatchObject({deck,id,player:'a',source:space});
  return drawn;
 }
 const resolve=(g:Game)=>act(g,'a',{type:'resolveCard'});
 it('only the drawing player can resolve a card, exactly once',()=>{
  const g=draw('chance',11,7);expect(()=>act(g,'b',{type:'resolveCard'})).toThrow();const done=resolve(g);expect(()=>resolve(done)).toThrow();
 });
 it('pays every money card from or to the bank',()=>{
  for(const deck of ['chance','community'] as const)CARDS[deck].forEach((card,id)=>{
   if(card.kind!=='money')return;const g=resolve(draw(deck,id,deck==='chance'?7:17));
   expect(g.players[0].cash,`${deck} ${id}`).toBe(1500+card.amount!);expect(g.decks[deck].at(-1)).toBe(id);
  });
 });
 it('keeps a jail card out of the deck until it is used',()=>{
  for(const deck of ['chance','community'] as const){const g=resolve(draw(deck,0,deck==='chance'?7:17));expect(g.players[0].cards).toEqual([deck]);expect(g.decks[deck]).not.toContain(0);expect(g.decks[deck]).toHaveLength(15);expect(()=>validateGame(g)).not.toThrow();}
 });
 it('advances to named spaces with salary only when passing Start',()=>{
  const cases:[number,number,number,number][]= [[1,7,0,1700],[2,7,39,1500],[3,7,11,1500],[3,36,11,1700],[4,36,24,1700],[15,7,5,1700],[15,22,5,1700]];
  for(const [id,space,to,cash] of cases){const g=resolve(draw('chance',id,space));expect(g.players[0].position,`card ${id} from ${space}`).toBe(to);expect(g.players[0].cash).toBe(cash);}
  expect(resolve(draw('chance',2,7)).phase).toBe('purchase');
  const home=resolve(draw('community',1,17));expect(home.players[0].position).toBe(0);expect(home.players[0].cash).toBe(1700);
 });
 it('moves to the nearest station and charges double rent',()=>{
  for(const [id,space,to] of [[5,7,15],[6,22,25],[5,36,5]]){const g=resolve(draw('chance',id,space));expect(g.players[0].position).toBe(to);expect(g.phase).toBe('purchase');}
  const owned=resolve(draw('chance',5,7,g=>own(g,[15,25])));
  expect(owned.players[0].cash).toBe(1500-100);expect(owned.players[1].cash).toBe(1600);
 });
 it('moves to the nearest utility and charges ten times a fresh roll',()=>{
  for(const [space,to] of [[7,12],[22,28],[36,12]]){const g=resolve(draw('chance',7,space));expect(g.players[0].position).toBe(to);}
  const drawn=draw('chance',7,22,g=>own(g,[28]));drawn.rng=seedFor(6,5);const g=resolve(drawn);
  expect(g.dice).toEqual([6,5]);expect(g.players[0].cash).toBe(1500-110);expect(g.players[1].cash).toBe(1610);
 });
 it('moves back three spaces without salary and resolves the new space, including another card',()=>{
  const tax=resolve(draw('chance',8,7));expect(tax.players[0].position).toBe(4);expect(tax.players[0].cash).toBe(1300);
  const chained=resolve(draw('chance',8,36));expect(chained.players[0].position).toBe(33);expect(chained.phase).toBe('card');expect(chained.pendingCard?.deck).toBe('community');
 });
 it('sends the player directly to jail without salary',()=>{
  for(const [deck,id,space] of [['chance',9,36],['community',5,33]] as const){const g=resolve(draw(deck,id,space));expect(g.players[0].position).toBe(10);expect(g.players[0].jailed).toBe(true);expect(g.players[0].cash).toBe(1500);expect(g.extraRoll).toBe(false);}
 });
 it('charges repairs per house and per hotel',()=>{
  const holdings=(g:Game)=>{own(g,[1],'a',4);own(g,[3],'a',5);g.houses=28;g.hotels=11;};
  expect(resolve(draw('chance',10,7,holdings)).players[0].cash).toBe(1500-(4*25+100));
  expect(resolve(draw('community',13,17,holdings)).players[0].cash).toBe(1500-(4*40+115));
  expect(resolve(draw('chance',10,7)).players[0].cash).toBe(1500);
 });
 it('settles payments with every other active player',()=>{
  const paid=resolve(draw('chance',13,7));expect(paid.players.map(p=>p.cash)).toEqual([1400,1550,1550]);
  const birthday=resolve(draw('community',8,17));expect(birthday.players.map(p=>p.cash)).toEqual([1520,1490,1490]);
  const skip=resolve(draw('community',8,17,g=>{g.players[2].bankrupt=true;}));expect(skip.players[0].cash).toBe(1510);
 });
 it('pauses a card payment for debt and continues the chain after funds are raised',()=>{
  let g=resolve(draw('community',8,17,g=>{g.players[1].cash=4;own(g,[1]);}));
  expect(g.phase).toBe('debt');expect(actionPlayer(g)).toBe('b');expect(g.debt).toMatchObject({player:'b',amount:10,creditor:'a'});
  g=act(g,'b',{type:'mortgage',property:1});
  expect(g.debt).toBeNull();expect(g.players.map(p=>p.cash)).toEqual([1520,24,1490]);expect(g.phase).toBe('manage');expect(actionPlayer(g)).toBe('a');
 });
 it('cycles resolved cards to the bottom of the deck',()=>{const g=resolve(draw('community',2,17));expect(g.decks.community).toHaveLength(16);expect(g.decks.community.at(-1)).toBe(2);expect(g.decks.community[0]).not.toBe(2);});
});

describe('auctions',()=>{
 const opening=()=>{const g=base();g.phase='purchase';g.pendingProperty=6;g.players[0].position=6;return act(g,'a',{type:'decline'});};
 it('opens to every active player, starting with the player who declined',()=>{
  const g=opening();expect(g.phase).toBe('auction');expect(g.auction).toMatchObject({property:6,bid:0,leader:null,active:['a','b','c'],turn:'a'});expect(g.properties[6].owner).toBeNull();
 });
 it('requires each bid to exceed the last and fit the bidder cash',()=>{
  let g=opening();g=act(g,'a',{type:'bid',amount:10});
  expect(()=>act(g,'b',{type:'bid',amount:10})).toThrow();expect(()=>act(g,'b',{type:'bid',amount:1501})).toThrow();
  g=act(g,'b',{type:'bid',amount:40});expect(g.auction).toMatchObject({bid:40,leader:'b',turn:'c'});
 });
 it('awards the property to the last remaining bidder at their bid',()=>{
  let g=opening();g=act(g,'a',{type:'bid',amount:10});g=act(g,'b',{type:'bid',amount:60});g=act(g,'c',{type:'pass'});g=act(g,'a',{type:'pass'});
  expect(g.phase).toBe('manage');expect(g.properties[6].owner).toBe('b');expect(g.players[1].cash).toBe(1440);expect(g.auction).toBeNull();
 });
 it('keeps the property with the bank when nobody bids',()=>{let g=opening();for(const id of ['a','b','c'])g=act(g,id,{type:'pass'});expect(g.properties[6].owner).toBeNull();expect(g.phase).toBe('manage');});
 it('cannot be bid on out of turn',()=>{expect(()=>act(opening(),'b',{type:'bid',amount:5})).toThrow();});
});

describe('rent',()=>{
 it('follows the street schedule from base rent to hotel',()=>{
  const g=base();own(g,[1]);expect(rentFor(g,1,7)).toBe(2);own(g,[3]);expect(rentFor(g,1,7)).toBe(4);
  BOARD[1].rents.slice(1).forEach((rent,i)=>{g.properties[1].level=i+1;expect(rentFor(g,1,7)).toBe(rent);});
 });
 it('doubles base rent on a complete group even when another deed is mortgaged',()=>{const g=base();own(g,[1,3]);g.properties[3].mortgaged=true;expect(rentFor(g,1,7)).toBe(4);expect(rentFor(g,3,7)).toBe(0);});
 it('scales stations and utilities by ownership count',()=>{
  const g=base();[5,15,25,35].forEach((i,n)=>{own(g,[i]);expect(rentFor(g,5,7)).toBe(25*2**n);});
  own(g,[12]);expect(rentFor(g,12,7)).toBe(28);own(g,[28]);expect(rentFor(g,12,7)).toBe(70);
 });
 it('charges the landing player and pays the owner',()=>{const s=base();own(s,[6,8,9]);s.properties[6].level=2;s.houses=30;const g=roll(s,'a',2,4);expect(g.players[0].cash).toBe(1410);expect(g.players[1].cash).toBe(1590);expect(g.players[0].rentPaid).toBe(90);expect(g.players[1].rentEarned).toBe(90);});
 it('turns unpaid rent into a debt to the owner',()=>{const s=base();own(s,[6]);s.players[0].cash=3;const g=roll(s,'a',2,4);expect(g.phase).toBe('debt');expect(g.debt).toEqual({player:'a',amount:6,creditor:'b',tax:false,rentProperty:6});});
});

describe('buildings and mortgages',()=>{
 const manage=()=>{const g=base();g.phase='manage';own(g,[1,3],'a');return g;};
 it('requires the full group, no group mortgages and even building',()=>{
  const partial=base();partial.phase='manage';own(partial,[1],'a');expect(()=>act(partial,'a',{type:'build',property:1})).toThrow('entire street group');
  const mortgaged=manage();mortgaged.properties[3].mortgaged=true;expect(()=>act(mortgaged,'a',{type:'build',property:1})).toThrow('mortgages');
  let g=act(manage(),'a',{type:'build',property:1});expect(()=>act(g,'a',{type:'build',property:1})).toThrow('evenly');
  g=act(g,'a',{type:'build',property:3});expect(g.players[0].cash).toBe(1400);expect(g.houses).toBe(30);
 });
 it('exchanges four houses for a hotel and enforces bank stock',()=>{
  const g=manage();g.properties[1].level=4;g.properties[3].level=4;g.houses=24;
  const hotel=act(g,'a',{type:'build',property:1});expect(hotel.properties[1].level).toBe(5);expect(hotel.hotels).toBe(11);expect(hotel.houses).toBe(28);
  expect(()=>act(hotel,'a',{type:'build',property:1})).toThrow();
  const empty=manage();empty.houses=0;expect(()=>act(empty,'a',{type:'build',property:1})).toThrow('no houses');
 });
 it('sells buildings evenly at half price and blocks building during debt',()=>{
  let g=manage();g.properties[1].level=2;g.properties[3].level=1;g.houses=29;
  expect(()=>act(g,'a',{type:'sell',property:3})).toThrow('evenly');
  g=act(g,'a',{type:'sell',property:1});expect(g.players[0].cash).toBe(1525);expect(g.houses).toBe(30);
  const debt=manage();debt.phase='debt';debt.debt={player:'a',amount:2000,creditor:null};expect(()=>act(debt,'a',{type:'build',property:1})).toThrow('debt');
 });
 it('mortgages for half price and lifts for the value plus rounded-up 10%',()=>{
  const g=base();g.phase='manage';own(g,[12],'a');const m=act(g,'a',{type:'mortgage',property:12});
  expect(m.players[0].cash).toBe(1575);expect(()=>act(m,'a',{type:'mortgage',property:12})).toThrow();
  const lifted=act(m,'a',{type:'unmortgage',property:12});expect(lifted.players[0].cash).toBe(1575-83);expect(lifted.properties[12].mortgaged).toBe(false);
 });
 it('lets the current player raise funds during a purchase decision, then buy',()=>{
  const g=base();g.phase='purchase';g.pendingProperty=6;g.players[0].position=6;g.players[0].cash=50;own(g,[39],'a');
  expect(()=>act(g,'a',{type:'buy'})).toThrow();
  let next=act(g,'a',{type:'mortgage',property:39});expect(next.phase).toBe('purchase');expect(next.players[0].cash).toBe(250);
  next=act(next,'a',{type:'buy'});expect(next.properties[6].owner).toBe('a');expect(next.players[0].cash).toBe(150);
  expect(()=>act(g,'b',{type:'mortgage',property:39})).toThrow();
  expect(()=>act(g,'a',{type:'offerTrade',to:'b',give:[39],receive:[],giveCash:0,receiveCash:100,giveCards:0,receiveCards:0})).toThrow();
  expect(()=>validateGame(next)).not.toThrow();
 });
});

describe('trades',()=>{
 const manage=()=>{const g=base();g.phase='manage';own(g,[1],'a');own(g,[3],'b');return g;};
 const offer=(g:Game,patch:Partial<Extract<Action,{type:'offerTrade'}>>)=>act(g,'a',{type:'offerTrade',to:'b',give:[],receive:[],giveCash:0,receiveCash:0,giveCards:0,receiveCards:0,...patch});
 it('transfers nothing when declined and keeps the one-offer limit',()=>{
  const before=manage(),g=act(offer(before,{give:[1],receive:[3],giveCash:100}),'b',{type:'rejectTrade'});
  expect(g.properties[1].owner).toBe('a');expect(g.properties[3].owner).toBe('b');expect(g.players.map(p=>p.cash)).toEqual([1500,1500,1500]);expect(g.phase).toBe('manage');
  expect(()=>offer(g,{giveCash:1})).toThrow('One trade offer');
 });
 it('rejects deeds the offering player does not own, duplicates and empty offers',()=>{
  expect(()=>offer(manage(),{give:[3]})).toThrow();expect(()=>offer(manage(),{give:[1],receive:[1]})).toThrow();expect(()=>offer(manage(),{})).toThrow('at least one');expect(()=>offer(manage(),{giveCards:1})).toThrow('jail cards');
 });
 it('moves jail cards and charges transfer interest on mortgaged deeds',()=>{
  const s=manage();s.players[0].cards=['chance'];s.decks.chance=s.decks.chance.filter(i=>i!==0);own(s,[39],'a');s.properties[39].mortgaged=true;
  const g=act(offer(s,{give:[39],giveCards:1}),'b',{type:'acceptTrade'});
  expect(g.players[1].cards).toEqual(['chance']);expect(g.players[0].cards).toEqual([]);expect(g.properties[39]).toMatchObject({owner:'b',mortgaged:true});expect(g.players[1].cash).toBe(1480);
  expect(()=>validateGame(g)).not.toThrow();
 });
 it('only lets the recipient answer',()=>{const g=offer(manage(),{giveCash:10});expect(()=>act(g,'a',{type:'acceptTrade'})).toThrow();expect(()=>act(g,'c',{type:'acceptTrade'})).toThrow();});
});

describe('bankruptcy',()=>{
 it('returns everything to the bank and auctions the deeds',()=>{
  let g=base();g.phase='debt';g.debt={player:'a',amount:500,creditor:null};g.players[0].cash=10;own(g,[1,3],'a',1);g.houses=30;g.players[0].cards=['community'];g.decks.community=g.decks.community.filter(i=>i!==0);
  g=act(g,'a',{type:'bankrupt'});
  expect(g.players[0].bankrupt).toBe(true);expect(g.players[0].cash).toBe(0);expect(g.houses).toBe(32);expect(g.decks.community).toContain(0);
  expect(g.phase).toBe('auction');expect(g.auction?.property).toBe(1);expect(g.auctionQueue).toEqual([3]);expect(g.auction?.active).toEqual(['b','c']);
  expect(()=>validateGame(g)).not.toThrow();
  while(g.phase==='auction')g=act(g,g.auction!.turn,{type:'pass'});
  expect(g.players[g.current].id).toBe('b');expect(g.phase).toBe('roll');
 });
 it('gives cash, cards, deeds and building value to a creditor, who pays mortgage interest',()=>{
  let g=base();g.phase='debt';g.debt={player:'a',amount:500,creditor:'b'};g.players[0].cash=10;own(g,[1,3],'a',1);g.houses=30;own(g,[39],'a');g.properties[39].mortgaged=true;
  g=act(g,'a',{type:'bankrupt'});
  expect(g.properties[1].owner).toBe('b');expect(g.properties[1].level).toBe(0);expect(g.properties[39]).toMatchObject({owner:'b',mortgaged:true});
  expect(g.players[1].cash).toBe(1500+10+25+25-20);expect(g.houses).toBe(32);expect(g.players[g.current].id).toBe('b');
 });
});

describe('saved games',()=>{
 it('round-trips every pending phase through validation',()=>{
  const card=roll((()=>{const g=base();g.players[0].position=4;return g;})(),'a',1,2);
  const auction=(()=>{const g=base();g.phase='purchase';g.pendingProperty=6;return act(g,'a',{type:'decline'});})();
  const trade=(()=>{const g=base();g.phase='manage';own(g,[1],'a');return act(g,'a',{type:'offerTrade',to:'b',give:[1],receive:[],giveCash:0,receiveCash:30,giveCards:0,receiveCards:0});})();
  const debt=(()=>{const g=base();own(g,[6]);g.players[0].cash=3;return roll(g,'a',2,4);})();
  for(const g of [card,auction,trade,debt])expect(validateGame(JSON.parse(JSON.stringify(g)))).toEqual(g);
 });
});
