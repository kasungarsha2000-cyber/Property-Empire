import {readFileSync} from 'node:fs';
import {transpileModule} from 'typescript';
import {describe,it,expect} from 'vitest';
import {createGame,BOARD,GROUPS,PLAYER_COLORS,playerById} from '../packages/core/index';
import {deedFinancials,propertyArtwork} from '../apps/web/src/property-art';

// Exercise the production renderer without starting the WebGL board or browser.
const main=readFileSync(new URL('../apps/web/src/main.ts',import.meta.url),'utf8');
const source=transpileModule(main.slice(main.indexOf('function propertyPanel('),main.indexOf('function selectSpace(')),{compilerOptions:{target:99}}).outputText;
function render(index:number,game=fixture()){
 const actionButton=(label:string,action:unknown)=>`<button data-action='${JSON.stringify(action)}'>${label}</button>`;
 return new Function('game','BOARD','GROUPS','PLAYER_COLORS','playerById','viewer','deedFinancials','propertyArtwork','e','money','icon','actionButton','canStartTrade','tradable',`${source};return propertyPanel(${index});`)(game,BOARD,GROUPS,PLAYER_COLORS,playerById,()=>game.players[0],deedFinancials,propertyArtwork,String,(n:number)=>`$${n.toLocaleString('en-US')}`,()=>'<svg></svg>',actionButton,()=>true,()=>true) as string;
}
function fixture(){return createGame({players:[{id:'human',name:'Ada',bot:false,token:0},{id:'bot',name:'Milo',bot:true,token:1}]},42);}
describe('complete property popup',()=>{
 it('shows full finances and one property heading without a redundant open-deed action',()=>{
  const html=render(1);
  expect(html.match(/<h2>/g)).toHaveLength(1);
  expect(html).toContain('deed-rents');
  expect(html).toContain('Mortgage value');
  expect(html).toContain('Each house / hotel');
  expect(html).not.toContain('View full deed');
 });
 it('offers the active purchase directly in the complete deed',()=>{
  const g=fixture();g.phase='purchase';g.pendingProperty=1;
  const html=render(1,g);
  expect(html).toContain('Buy for $60');
  expect(html).toContain('Send to auction');
  expect(render(3,g)).not.toContain('Buy for');
 });
 it('keeps owner management and trade actions live as ownership changes',()=>{
  const g=fixture();g.properties[1].owner='human';
  expect(render(1,g)).toContain('Sell group buildings');
  expect(render(1,g)).toContain('Mortgage');
  g.properties[1].mortgaged=true;
  expect(render(1,g)).toContain('Lift mortgage ($33)');
  g.properties[1].owner='bot';
  expect(render(1,g)).toContain('Trade for this property');
 });
});
