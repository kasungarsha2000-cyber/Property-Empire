import {it,expect,vi} from 'vitest';
import {createGame,applyAction} from '../packages/core';
import {EventFeedback,feedbackNotices,noticeTone} from '../apps/web/src/event-feedback';
const base=()=>{const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:true}]},42);g.current=0;return g;};
it('classifies acquisitions as positive while cash deductions and jail are negative',()=>{
 expect(noticeTone({key:'1',kind:'purchase',title:'Property purchased',detail:'',amount:-60})).toBe('positive');
 expect(noticeTone({key:'2',kind:'payment',title:'Rent paid',detail:'',amount:-8})).toBe('negative');
 expect(noticeTone({key:'3',kind:'jail',title:'Sent to jail',detail:''})).toBe('negative');
 expect(noticeTone({key:'4',kind:'jail',title:'Out of jail',detail:''})).toBe('positive');
});
it('only celebrates rent that was actually paid and does not replay restored events',()=>{
 const g=base();g.current=1;g.properties[9].owner='a';const next=applyAction(g,'b',{type:'roll'});
 expect(feedbackNotices(g,next,'a')).toContainEqual(expect.objectContaining({title:'Rent collected',amount:8}));
 expect(feedbackNotices(null,next,'a')).toEqual([]);expect(feedbackNotices(next,next,'a')).toEqual([]);
 g.players[1].cash=0;const unpaid=applyAction(g,'b',{type:'roll'});
 expect(feedbackNotices(g,unpaid,'a').some(n=>n.title==='Rent collected')).toBe(false);
 expect(feedbackNotices(g,unpaid,'b')).toContainEqual(expect.objectContaining({kind:'debt',title:'Payment due',amount:undefined}));
});
it('celebrates a built house and suppresses duplicate card cash effects',()=>{
 const g=base();g.phase='manage';g.properties[1].owner='a';g.properties[3].owner='a';
 expect(feedbackNotices(g,applyAction(g,'a',{type:'build',property:1}),'a')).toContainEqual(expect.objectContaining({kind:'build',title:'House built',property:1}));
 const c=base();c.players[0].position=24;c.decks.community=[1,...c.decks.community.filter(i=>i!==1)];
 const next=applyAction(c,'a',{type:'roll'}),notices=feedbackNotices(c,next,'a');
 const amounts=notices.map(n=>n.amount??n.card?.amount).filter(v=>v!==undefined);expect(new Set(amounts).size).toBe(amounts.length);
});
it('does not celebrate unpaid birthday collections as cash received',()=>{
 const g=base();g.players[0].position=24;g.players[1].cash=0;g.decks.community=[8,...g.decks.community.filter(i=>i!==8)];
 const next=applyAction(g,'a',{type:'roll'});expect(next.players[0].cash).toBe(1500);expect(next.debt?.player).toBe('b');
 expect(feedbackNotices(g,next,'a').some(n=>n.amount!==undefined||n.card?.amount!==undefined)).toBe(false);
});
it('discards queued feedback when a saved snapshot replaces a moving turn',()=>{
 vi.useFakeTimers();
 const layer={className:'',innerHTML:'',setAttribute(){},replaceChildren(){this.innerHTML='';},querySelector(){return null;}};
 vi.stubGlobal('document',{createElement:()=>layer,querySelector:()=>null,querySelectorAll:()=>[]});
 try{
  const stage={append(){}} as unknown as HTMLElement,feedback=new EventFeedback(stage,false);
  const g=base();g.players[0].position=24;g.decks.community=[1,...g.decks.community.filter(i=>i!==1)];
  const next=applyAction(g,'a',{type:'roll'});expect(next.players[0].cash).toBe(1700);
  feedback.observe(g,'a',false,false);feedback.observe(next,'a',true);expect(layer.innerHTML).toBe('');
  feedback.observe(g,'a',false,false);feedback.settle();expect(layer.innerHTML).toBe('');
  // A subsequent real grant must still animate.
  feedback.observe(next,'a',false);expect(layer.innerHTML).toContain('+$200');feedback.reset();
 }finally{vi.unstubAllGlobals();vi.useRealTimers();}
});
