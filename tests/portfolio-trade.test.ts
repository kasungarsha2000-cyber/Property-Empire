import {describe,it,expect} from 'vitest';
import {createGame,applyAction} from '../packages/core/index';
import {tradeSummaryMarkup} from '../apps/web/src/ui-components';
import {portfolioGroups,tradePreview,type TradeDraft} from '../apps/web/src/game-ui';
const base=()=>{const g=createGame({players:[{id:'a',name:'Ada',bot:false},{id:'b',name:'Ben',bot:false}]},42);g.current=0;g.phase='manage';return g;};
const draft=(patch:Partial<TradeDraft>={}):TradeDraft=>({type:'offerTrade',to:'b',give:[],receive:[],giveCash:0,receiveCash:0,giveCards:0,receiveCards:0,...patch});
describe('portfolio and visual trade guidance',()=>{
 it('identifies a missing deed and its actual owner',()=>{const g=base();g.properties[1].owner='a';g.properties[3].owner='b';const groups=portfolioGroups(g,'a');expect(groups).toHaveLength(1);const group=groups[0];expect(group.owned).toEqual([1]);expect(group.missing).toEqual([3]);expect(group.complete).toBe(false);});
 it('shows exact cash after mortgage transfer interest',()=>{const g=base();g.properties[39].owner='b';g.properties[39].mortgaged=true;const preview=tradePreview(g,'a',draft({receive:[39],giveCash:100}));expect(preview.error).toBeNull();expect(preview.giveCashAfter).toBe(1380);expect(preview.receiveCashAfter).toBe(1600);expect(preview.giveInterest).toBe(20);});
 it('finds a color set completed by a property swap',()=>{const g=base();g.properties[1].owner='a';g.properties[3].owner='b';g.properties[6].owner='a';const preview=tradePreview(g,'a',draft({give:[6],receive:[3]}));expect(preview.completedForSender).toEqual(['amber']);});
 it('explains why a developed group cannot be traded',()=>{const g=base();g.properties[1].owner='a';g.properties[3].owner='a';g.properties[3].level=1;expect(tradePreview(g,'a',draft({give:[1]})).error).toBe('Sell group buildings before trading');});
 it('does not claim a complete group after giving away another deed in the same exchange',()=>{const g=base();g.properties[1].owner='a';g.properties[3].owner='b';expect(tradePreview(g,'a',draft({give:[1],receive:[3]})).completedForSender).toEqual([]);});
 it('keeps a cashless debt trade available and accounts for automatic debt payment',()=>{const g=base();g.phase='debt';g.debt={player:'a',amount:50,creditor:null};g.players[0].cash=0;g.properties[1].owner='a';const p=tradePreview(g,'a',draft({give:[1],receiveCash:70}));expect(p.error).toBeNull();expect(p.giveCashAfter).toBe(20);});
 it('explains the debt deduction in an incoming offer without changing state',()=>{const g=base();g.phase='debt';g.debt={player:'a',amount:50,creditor:null};g.players[0].cash=0;g.properties[1].owner='a';const d=draft({give:[1],receiveCash:70}),incoming=applyAction(g,'a',d),before=JSON.stringify(incoming);expect(tradeSummaryMarkup(incoming,'a',d)).toContain('$50 debt payment');expect(tradePreview(incoming,'a',d).giveCashAfter).toBe(20);expect(JSON.stringify(incoming)).toBe(before);});
});
