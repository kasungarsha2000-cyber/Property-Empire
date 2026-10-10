import {createGame,applyAction,validateGame} from '../../packages/core/index';
import type {Game} from '../../packages/core/types';

/** Deterministic saved games for browser tests: Ada (human) against Ben (medium bot), seed 42. */
const base=()=>{const g=createGame({players:[{id:'human',name:'Ada',bot:false,token:0},{id:'bot',name:'Ben',bot:true,token:1,difficulty:'medium'}]},42);g.current=0;return g;};

export const fixtures:Record<string,()=>Game>={
 fresh:()=>base(),
 purchase:()=>{const g=base();g.phase='purchase';g.pendingProperty=1;g.players[0].position=1;return g;},
 /** Ben has no cash, so any bid from Ada wins the auction. */
 auction:()=>{const g=base();g.phase='purchase';g.pendingProperty=1;g.players[0].position=1;g.players[1].cash=0;return g;},
 /** Ada owns the full Old town set and can build. */
 management:()=>{const g=base();g.phase='manage';g.properties[1].owner='human';g.properties[3].owner='human';return g;},
 debt:()=>{const g=base();g.phase='debt';g.debt={player:'human',amount:50,creditor:null};g.players[0].cash=0;g.properties[1].owner='human';g.properties[3].owner='bot';return g;},
 jail:()=>{const g=base();g.players[0].jailed=true;g.players[0].position=10;g.players[0].jailTurns=1;return g;},
 /** Ben offers Copper Lane for $100 during his turn. */
 incomingTrade:()=>{const g=base();g.current=1;g.phase='manage';g.properties[1].owner='bot';return applyAction(g,'bot',{type:'offerTrade',to:'human',give:[1],receive:[],giveCash:0,receiveCash:100,giveCards:0,receiveCards:0});},
 /** The next roll (seed 42) lands on Opportunity at 36; the top Chance card sends Ada to South Station, owned by Ben. */
 chance:()=>{const g=base();g.players[0].position=27;g.decks.chance=[5,...g.decks.chance.filter(i=>i!==5)];g.properties[5].owner='bot';return g;},
 /** The next roll lands on City Fund at 33; the top Community Chest card is a $200 grant. */
 community:()=>{const g=base();g.players[0].position=24;g.decks.community=[2,...g.decks.community.filter(i=>i!==2)];return g;}
};
export function fixture(name:keyof typeof fixtures){return validateGame(JSON.parse(JSON.stringify(fixtures[name]())));}
