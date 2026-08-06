import test from 'node:test';
import assert from 'node:assert/strict';
import { lootLabel, roomMarkers, trapIconFor, trapLabel } from './roomMarkers.js';
import { seededRandom } from './seededRandom.js';
import { fillBudget } from './roomBudget.js';

// The GM reads the marker at the moment the party steps on it. "Trap" sends
// them back to a panel; the numbers do not.
test('a trap marker carries its kind, its DC and its damage', () => {
  assert.equal(trapLabel({ tipo: 'Pit', dc: 13, danno: '2d6 bludgeoning' }), 'Pit · DC 13 · 2d6 bludgeoning');
  assert.equal(trapLabel({ tipo: 'Alarm' }), 'Alarm');
  assert.equal(trapLabel(null), 'Trap');
});

test('loot says what it is, how rare, and what it takes to get it out', () => {
  assert.equal(lootLabel({ tipo: 'Coins', rarita: 'Rare' }, { sum: 14 }), 'Coins · Rare · DC 14');
  // An unrarity is not worth the space on a one-square marker.
  assert.equal(lootLabel({ tipo: 'Coins', rarita: '—' }, null), 'Coins');
});

// A triangle says "something happens here", which the GM already knew.
test('the icon follows the trap, in either language the tables are written in', () => {
  assert.equal(trapIconFor('Hidden pit'), 'chevrons-down');
  assert.equal(trapIconFor('Fossa nascosta'), 'chevrons-down');
  // "Poisoned darts" is both a dart trap and a poison one; either icon says
  // more than a triangle, and the first rule that matches wins.
  assert.equal(trapIconFor('Poisoned darts'), 'move-right');
  assert.equal(trapIconFor('Flame jet'), 'flame');
  assert.equal(trapIconFor('Trappola di veleno'), 'skull');
  assert.equal(trapIconFor('Something unheard of'), 'triangle-alert');
  assert.equal(trapIconFor(null), 'triangle-alert');
});

test('a rolled room offers its trap, its hazard and its hoard, and no empties', () => {
  const markers = roomMarkers({
    slots: [
      { n: 1, type: 'Environment Damage', extra: { kind: 'trap', data: { tipo: 'Pit', dc: 13, danno: '2d6' } } },
      { n: 2, type: 'Environment', extra: { kind: 'env', data: { gravita: 'High' } } },
      { n: 3, type: 'Encounter', extra: { kind: 'enc', data: { diff: 'Hard' } } },
    ],
    loot: { data: { tipo: 'Coins', rarita: 'Rare' } },
    lootDc: { sum: 12 },
  });

  assert.deepEqual(markers.map((marker) => marker.kind), ['trap', 'hazard', 'loot']);
  assert.equal(markers[0].label, 'Pit · DC 13 · 2d6');
  assert.equal(markers[2].label, 'Coins · Rare · DC 12');
  // The encounter is creatures, not a marker.
  assert.ok(markers.every((marker) => marker.kind !== 'enc'));

  // Nothing found is nothing placed.
  assert.deepEqual(roomMarkers({ slots: [], loot: { data: { tipo: 'Nothing found' } } }), []);
  assert.deepEqual(roomMarkers(null), []);
});

// The bug this was written for: the panel showed one set of creatures and the
// button placed another, because the choice was drawn afresh on every render.
test('the same room buys the same creatures every time it is asked', () => {
  const bestiary = [
    { name: 'Goblin', xp: 50 },
    { name: 'Hobgoblin', xp: 100 },
    { name: 'Ogre', xp: 450 },
    { name: 'Wight', xp: 1100 },
  ];
  const forRoom = (room) => fillBudget(bestiary, 2000, seededRandom(`dungeon_abc:${room}`))
    .map((group) => `${group.count}×${group.monster.name}`)
    .join('+');

  assert.equal(forRoom(3), forRoom(3));
  assert.equal(forRoom(3), forRoom(3), 'and again');
  // Different rooms of the same dungeon are not all the same fight, and rooms
  // one and two must not share an answer for having nearly the same seed.
  const answers = new Set([1, 2, 3, 4, 5, 6].map(forRoom));
  assert.ok(answers.size > 1, 'the dungeon is not one fight repeated');
});

test('a different roll of the same dungeon buys different creatures', () => {
  const bestiary = [
    { name: 'Goblin', xp: 50 }, { name: 'Ogre', xp: 450 }, { name: 'Wight', xp: 1100 },
  ];
  const pick = (keyId) => fillBudget(bestiary, 1800, seededRandom(`${keyId}:1`))
    .map((group) => group.monster.name).join('+');

  const answers = new Set(['dungeon_a', 'dungeon_b', 'dungeon_c', 'dungeon_d'].map(pick));
  assert.ok(answers.size > 1, 'rolling again is what changes them');
});
