import {expect, it} from 'vitest';
import {applyAction, createGame} from '../packages/core';
import {propertyMotions, propertyMotionPose, propertyMotionStart} from '../apps/web/src/property-motion';
const base = () => {const game = createGame({players: [{id: 'a', name: 'Ada', bot: false}, {id: 'b', name: 'Ben', bot: false}]}, 42); game.current = 0; return game;};

it('pulses purchases once and does not animate initial, repeated or restored snapshots', () => {
  const before = base(); before.phase = 'purchase'; before.pendingProperty = 1;
  const bought = applyAction(before, 'a', {type: 'buy'});
  expect(propertyMotions(before, bought)).toEqual([expect.objectContaining({kind: 'ownership', property: 1})]);
  expect(propertyMotions(null, bought)).toEqual([]); expect(propertyMotions(bought, bought)).toEqual([]);
  expect(propertyMotions(bought, before)).toEqual([]);
});

it('marks every transferred deed for either player after an accepted trade', () => {
  const before = base(); before.phase = 'manage'; before.properties[1].owner = 'a'; before.properties[3].owner = 'b';
  const offered = applyAction(before, 'a', {type: 'offerTrade', to: 'b', give: [1], receive: [3], giveCash: 0, receiveCash: 0, giveCards: 0, receiveCards: 0});
  expect(propertyMotions(before, offered)).toEqual([]);
  expect(propertyMotions(offered, applyAction(offered, 'b', {type: 'rejectTrade'}))).toEqual([]);
  expect(propertyMotions(offered, applyAction(offered, 'b', {type: 'acceptTrade'})).map(effect => effect.property)).toEqual([1, 3]);
});

it('grows only actual new buildings, and excludes mortgages and selling', () => {
  const before = base(); before.phase = 'manage'; before.properties[1].owner = before.properties[3].owner = 'a';
  const built = applyAction(before, 'a', {type: 'build', property: 1});
  expect(propertyMotions(before, built)).toEqual([expect.objectContaining({kind: 'build', property: 1, previousLevel: 0, level: 1})]);
  expect(propertyMotions(built, applyAction(built, 'a', {type: 'sell', property: 1}))).toEqual([]);
  expect(propertyMotions(before, applyAction(before, 'a', {type: 'mortgage', property: 1}))).toEqual([]);
});

it('animates paid property rent after its payer arrives, but excludes unpaid debt', () => {
  const before = base(); before.properties[9].owner = 'b';
  const paid = applyAction(before, 'a', {type: 'roll'});
  const effects = propertyMotions(before, paid);
  expect(effects).toEqual([expect.objectContaining({kind: 'rent', property: 9, payer: 'a'})]);
  expect(propertyMotionStart(effects[0], 100, 2100)).toBe(2100);
  expect(propertyMotionStart({kind: 'ownership', property: 9, key: 'purchase'}, 100, 2100)).toBe(100);
  before.players[0].cash = 0;
  expect(propertyMotions(before, applyAction(before, 'a', {type: 'roll'}))).toEqual([]);
});

it('finishes rings and growth with stable transforms and honors reduced motion', () => {
  expect(propertyMotionPose('build', 0).growth).toBe(.001);
  expect(propertyMotionPose('build', 650).growth).toBeGreaterThan(.9);
  expect(propertyMotionPose('build', 1000).growth).toBe(1);
  expect(propertyMotionPose('rent', -100).visible).toBe(false);
  expect(propertyMotionPose('rent', 300).opacity).toBeGreaterThan(0);
  expect(propertyMotionPose('rent', 1200)).toMatchObject({done: true, visible: false, opacity: 0, ringScale: 1, growth: 1});
  expect(propertyMotionPose('build', 300, true)).toMatchObject({done: true, visible: false, opacity: 0, growth: 1});
});
