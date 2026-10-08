import { mkdirSync,writeFileSync } from 'node:fs';
import {createGame,validateGame} from '../packages/core/index';
const base=()=>{const g=createGame({players:[{id:'human',name:'Ada',bot:false,token:0},{id:'bot',name:'Ben',bot:true,token:1,difficulty:'medium'}]},42);g.current=0;return g;};
const purchase=base();purchase.phase='purchase';purchase.pendingProperty=1;purchase.players[0].position=1;
const auction=base();auction.phase='purchase';auction.pendingProperty=1;auction.players[0].position=1;auction.players[1].cash=0;
const management=base();management.phase='manage';management.properties[1].owner='human';management.properties[3].owner='human';
const debt=base();debt.phase='debt';debt.debt={player:'human',amount:50,creditor:null};debt.players[0].cash=0;debt.properties[1].owner='human';debt.properties[3].owner='bot';
mkdirSync('test-artifacts',{recursive:true});writeFileSync('test-artifacts/browser-fixtures.json',JSON.stringify(Object.fromEntries(Object.entries({purchase,auction,management,debt}).map(([key,g])=>[key,validateGame(g)]))));
