import {it,expect,vi} from 'vitest';
import {createGame,applyAction,validateGame} from '../packages/core';
import {CARDS} from '../packages/core/board';
import {boardMoments,boardMomentMarkup,BoardMoments} from '../apps/web/src/board-moments';
import {cardDesign,cardIllustration} from '../apps/web/src/card-designs';
import {matchStandings} from '../apps/web/src/match-finale';
const base=()=>{const g=createGame({players:['a','b','c'].map(id=>({id,name:id.toUpperCase(),bot:false}))},42);g.current=0;return g;};
it('gives all32cards distinct artwork and motion with a saved read step',()=>{
 const motions=new Set(),art=new Set();for(const deck of ['chance','community'] as const)for(let id=0;id<CARDS[deck].length;id++){
  const g=base();g.players[0].position=deck==='chance'?27:24;g.decks[deck]=[id,...g.decks[deck].filter(i=>i!==id)];let drawn=applyAction(g,'a',{type:'roll'});expect(drawn.phase).toBe('card');validateGame(drawn);expect(drawn.players[0].cash).toBe(1500);
  const design=cardDesign(deck,id);motions.add(design.motion);art.add(design.art);expect(cardIllustration(deck,id)).toContain(design.motion);expect(boardMoments(g,drawn,'a').some(m=>m.kind==='card')).toBe(false);
  const after=applyAction(drawn,'a',{type:'resolveCard'});validateGame(after);expect(boardMoments(drawn,after,'a')).toContainEqual(expect.objectContaining({kind:'card',deck,card:id}));
 }
 expect(motions.size).toBe(32);expect(art.size).toBe(32);
});
it('announces third-party paid rent and excludes unpaid obligations',()=>{
 const g=base();g.properties[9].owner='b';const paid=applyAction(g,'a',{type:'roll'});expect(boardMoments(g,paid,'c')).toContainEqual(expect.objectContaining({kind:'rent',property:9,title:'B receives rent',detail:'A → B',amount:8}));
 expect(boardMoments(g,paid,'a').some(m=>m.kind==='rent')).toBe(false);g.players[0].cash=0;expect(boardMoments(g,applyAction(g,'a',{type:'roll'}),'c').some(m=>m.kind==='rent')).toBe(false);expect(boardMoments(null,paid,'c')).toEqual([]);
});
it('animates accepted trades once with actual transferred deeds, never refusals',()=>{
 const g=base();g.phase='manage';g.properties[1].owner='a';g.properties[3].owner='b';const offered=applyAction(g,'a',{type:'offerTrade',to:'b',give:[1],receive:[3],giveCash:0,receiveCash:0,giveCards:0,receiveCards:0});
 expect(boardMoments(g,offered,'a').some(m=>m.kind==='trade')).toBe(false);const accepted=applyAction(offered,'b',{type:'acceptTrade'});expect(boardMoments(offered,accepted,'a')).toContainEqual(expect.objectContaining({kind:'trade',detail:'Copper Lane → B · Cedar Row → A'}));
 expect(boardMoments(offered,applyAction(offered,'b',{type:'rejectTrade'}),'a').some(m=>m.kind==='trade')).toBe(false);expect(boardMoments(accepted,accepted,'a')).toEqual([]);
});
it('lists the declared winner first and eliminated players after live players',()=>{
 const g=base();g.players[0].cash=10000;g.players[0].bankrupt=true;g.phase='ended';g.winner='b';const result=matchStandings(g);expect(result.map(p=>p.id)).toEqual(['b','c','a']);expect(result[0].rank).toBe(1);
});
it('renders actual named illustrated deeds, cash, and jail cards in the accepted exchange',()=>{
 const g=base();g.phase='manage';g.players[0].name='A & Co';g.properties[1]={owner:'a',level:0,mortgaged:true};g.properties[3].owner='b';g.players[0].cards=['community'];g.players[1].cards=['chance'];
 const offer=applyAction(g,'a',{type:'offerTrade',to:'b',give:[1],receive:[3],giveCash:100,receiveCash:25,giveCards:1,receiveCards:1});const accepted=applyAction(offer,'b',{type:'acceptTrade'});
 const moment=boardMoments(offer,accepted,'a').find(m=>m.kind==='trade')!;const html=boardMomentMarkup(moment,false);
 expect(html).toContain('Copper Lane');expect(html).toContain('Cedar Row');expect(html).toContain('property-art');expect(html).toContain('$100');expect(html).toContain('$25');expect(html).toContain('Community Chest');expect(html).toContain('Chance');expect(html).toContain('A &amp; Co');expect(html).toContain('Mortgaged');expect(html).toContain('trade-settled');expect(html).not.toContain('>DEED<');
});
it('renders a cash-only accepted trade without invented properties and honors reduced motion',()=>{
 const g=base();g.phase='manage';const offer=applyAction(g,'a',{type:'offerTrade',to:'b',give:[],receive:[],giveCash:10,receiveCash:0,giveCards:0,receiveCards:0});const accepted=applyAction(offer,'b',{type:'acceptTrade'});
 const html=boardMomentMarkup(boardMoments(offer,accepted,'a').find(m=>m.kind==='trade')!,true);expect(html).toContain('$10');expect(html).not.toContain('property-art');expect(html).toContain('moment-reduced');expect(html).toContain('Nothing returned');
});
it('dismisses the single accepted trade confirmation after 2.8 seconds after arrival',()=>{
 vi.useFakeTimers();try{
  const layer={innerHTML:'',className:'',get childElementCount(){return this.innerHTML?1:0;},parentElement:{clientWidth:800,clientHeight:600},setAttribute:()=>{},querySelectorAll:()=>[],replaceChildren(){this.innerHTML='';}};
  vi.stubGlobal('document',{createElement:()=>layer});const moments=new BoardMoments({append:()=>{}} as unknown as HTMLElement,()=>null,()=>false),g=base();g.phase='manage';g.properties[1].owner='a';
  const offer=applyAction(g,'a',{type:'offerTrade',to:'b',give:[1],receive:[],giveCash:0,receiveCash:10,giveCards:0,receiveCards:0}),accepted=applyAction(offer,'b',{type:'acceptTrade'});
  moments.observe(offer,'a',false);moments.observe(accepted,'a',true);expect(layer.innerHTML).toBe('');moments.settle();expect(layer.innerHTML).toContain('Copper Lane');moments.observe(accepted,'a',false);expect((layer.innerHTML.match(/trade-confirmation/g)??[]).length).toBe(1);vi.advanceTimersByTime(2799);expect(layer.innerHTML).toContain('Copper Lane');vi.advanceTimersByTime(1);expect(layer.innerHTML).toBe('');moments.reset();
 }finally{vi.unstubAllGlobals();vi.useRealTimers();}
});
