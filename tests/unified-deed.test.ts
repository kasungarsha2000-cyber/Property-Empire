import {describe,it,expect} from 'vitest';
import {createGame,applyAction} from '../packages/core/index';
import type {Action,Game} from '../packages/core/types';
import {deedSheet,deedPreview,friendlyReason} from '../apps/web/src/ui/deed';

function fixture(){const g=createGame({players:[{id:'human',name:'Ada',bot:false,token:0},{id:'bot',name:'Milo',bot:true,token:1}]},42);g.current=0;g.phase='manage';return g;}
// The same verdict the app uses: the engine decides, the UI only reports.
const checkFor=(g:Game,id='human')=>(action:Action)=>{try{applyAction(g,id,action);return null;}catch(e){return e instanceof Error?e.message:'Unavailable';}};
const sheet=(g:Game,index:number,canTrade=true)=>deedSheet(g,index,{viewer:'human',check:checkFor(g),canTrade});

describe('title deed',()=>{
 it('shows one heading, the full rent schedule, mortgage value and building costs',()=>{
  const html=sheet(fixture(),1);
  expect(html.match(/<h2>/g)).toHaveLength(1);
  expect(html).toContain('rent-table');expect(html).toContain('Mortgage value');expect(html).toContain('Each house');expect(html).toContain('Hotel');
  for(const label of ['Base rent','Full color group','1 house','4 houses'])expect(html).toContain(label);
 });
 it('uses station and utility rent tables instead of houses',()=>{
  const g=fixture();expect(sheet(g,5)).toContain('4 stations');expect(sheet(g,5)).not.toContain('Each house');
  expect(sheet(g,12)).toContain('Both utilities');expect(sheet(g,12)).toContain('dice total');
 });
 it('offers the active purchase directly in the deed of the pending property only',()=>{
  const g=fixture();g.phase='purchase';g.pendingProperty=1;
  expect(sheet(g,1)).toContain('Buy for $60');expect(sheet(g,1)).toContain('Auction');expect(sheet(g,3)).not.toContain('Buy for');
 });
 it('lists owner actions with engine reasons and live mortgage costs',()=>{
  const g=fixture();g.properties[1].owner='human';
  const html=sheet(g,1);expect(html).toContain('Build house');expect(html).toContain('Mortgage · +$30');expect(html).toContain('entire street group');
  g.properties[1].mortgaged=true;expect(sheet(g,1)).toContain('Lift mortgage · $33');
  g.properties[3].owner='human';g.properties[1].mortgaged=false;g.properties[1].level=1;g.houses=31;expect(sheet(g,1)).toContain('Sell all group buildings');
 });
 it('lets a viewer ask to trade for another player’s deed unless the set is developed',()=>{
  const g=fixture();g.properties[1].owner='bot';expect(sheet(g,1)).toContain('Trade for this property');expect(sheet(g,1)).not.toMatch(/data-trade-for="1" disabled/);
  g.properties[3].owner='bot';g.properties[3].level=1;g.houses=31;expect(sheet(g,1)).toMatch(/data-trade-for="1" disabled/);expect(sheet(g,1)).toContain('sell this group');
  g.properties[3].level=0;g.houses=32;expect(sheet(g,1,false)).toContain('on your turn');
 });
 it('explains city spaces and keeps the preview compact',()=>{
  const g=fixture();expect(sheet(g,30)).toContain('Go directly to jail');
  const preview=deedPreview(g,1,'human');expect(preview).toContain('Copper Lane');expect(preview).toContain('For sale');expect(preview).toContain('Details');expect(preview).not.toContain('rent-table');
  g.properties[1].owner='human';expect(deedPreview(g,1,'human')).toContain('Yours');
 });
 it('rewrites generic engine messages for players',()=>{expect(friendlyReason('Insufficient cash or currency limit')).toBe('Not enough cash.');expect(friendlyReason('Build evenly across the group')).toBe('Build evenly across the group.');});
});
