import {describe,it,expect} from 'vitest';
import {createGame} from '../packages/core/index';
import {deedFinancials} from '../apps/web/src/property-art';

const game = () => createGame({players:[{id:'a',name:'Ada',bot:false,token:0},{id:'b',name:'Ben',bot:false,token:1}]},42);
describe('title deed financial display',()=>{
 it('shows doubled unimproved rent for a complete color group',()=>{
  const g=game(); g.properties[1].owner='a'; g.properties[3].owner='a';
  const deed=deedFinancials(g,1);
  expect(deed.rent).toBe('$4');
  expect(deed.rows.find(row=>row.active)?.label).toBe('Full color group');
 });
 it('shows no collected rent while a property is mortgaged',()=>{
  const g=game();g.properties[1].owner='a';g.properties[1].mortgaged=true;
  expect(deedFinancials(g,1).rent).toBe('$0');
  expect(deedFinancials(g,1).rows.some(row=>row.active)).toBe(false);
 });
 it('shows station rent based on the actual number owned',()=>{
  const g=game(); for(const index of [5,15,25])g.properties[index].owner='a';
  const deed=deedFinancials(g,5);expect(deed.rent).toBe('$100');
  expect(deed.rows.find(row=>row.active)?.label).toBe('3 stations');
 });
 it('shows a utility multiplier instead of a stale dice-based cash amount',()=>{
  const g=game();g.properties[12].owner='a';g.properties[28].owner='a';g.dice=[1,1];
  expect(deedFinancials(g,12).rent).toBe('10×');
  expect(deedFinancials(g,12).rows.find(row=>row.active)?.label).toBe('Both utilities');
 });
 it('shows hotel rent as the active development tier',()=>{
  const g=game();g.properties[39].owner='a';g.properties[39].level=5;
  const deed=deedFinancials(g,39);expect(deed.rent).toBe('$2,000');
  expect(deed.rows.find(row=>row.active)?.label).toBe('Hotel');
 });
});
