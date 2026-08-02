import test from 'node:test';
import assert from 'node:assert/strict';
import {
  colorForName,
  combatantLabel,
  combatantToToken,
  importableCombatants,
  layoutTokens,
  monsterGroupTokens,
  monsterSpan,
  monsterToToken,
} from './encounterImport.js';

test('creature size becomes the span in squares', () => {
  assert.equal(monsterSpan({ size: 'M' }), 1);
  assert.equal(monsterSpan({ size: ['L'] }), 2);
  assert.equal(monsterSpan({ size: 'h' }), 3);
  assert.equal(monsterSpan({ size: 'G' }), 4);
  assert.equal(monsterSpan({ size: 'T' }), 1, 'tiny still gets its own square');
  assert.equal(monsterSpan({}), 1, 'an unknown size is one square, never zero');
  assert.equal(monsterSpan(null), 1);
});

test('the same creature name always gets the same colour', () => {
  assert.equal(colorForName('Goblin'), colorForName('Goblin'));
  assert.match(colorForName('Goblin'), /^#[0-9a-f]{6}$/);
  assert.match(colorForName(''), /^#[0-9a-f]{6}$/);
});

test('the encounter letter is kept, because that is how the table refers to them', () => {
  assert.equal(combatantLabel({ name: 'Goblin', label: 'B' }), 'Goblin B');
  assert.equal(combatantLabel({ name: 'Goblin' }), 'Goblin');
  assert.equal(combatantLabel(null), 'Creature');
});

// Players are already on the map as their own pieces, and a monster a player
// could drag would be a bug, so only monsters cross over — with no character_id.
test('only living monsters are imported', () => {
  const combat = {
    combatants: [
      { id: 1, name: 'Goblin', type: 'monster' },
      { id: 2, name: 'Aria', type: 'player' },
      { id: 3, name: 'Ogre', type: 'monster', isDead: true },
    ],
  };
  assert.deepEqual(importableCombatants(combat).map((c) => c.name), ['Goblin']);
  assert.deepEqual(importableCombatants(null), []);

  const token = combatantToToken(combat.combatants[0]);
  assert.equal('characterId' in token, false, 'a monster must not be tied to a sheet');
  assert.equal(token.layer, 'tokens');
  assert.equal(combatantToToken(combat.combatants[0], { layer: 'gm' }).layer, 'gm');
});

test('conditions carried by the combatant come across', () => {
  const token = combatantToToken({ name: 'Goblin', activeConditions: ['prone'] });
  assert.deepEqual(token.conditions, ['prone']);
  assert.deepEqual(combatantToToken({ name: 'Goblin' }).conditions, []);
});

// Recognising a creature at a glance is most of what a piece is for, so the
// bestiary artwork comes across rather than a coloured circle.
test('a monster brings its bestiary token art and its hit points', () => {
  const token = combatantToToken({
    name: 'Goblin',
    hpCurrent: 4,
    hpMax: 7,
    monsterData: { name: 'Goblin', source: 'XMM' },
  });
  assert.match(token.image_url, /bestiary\/tokens\/XMM\/Goblin\.webp$/);
  assert.equal(token.hp_current, 4);
  assert.equal(token.hp_max, 7);
  // The colour survives as the ring, and as the fallback when the fetch fails.
  assert.match(token.color, /^#[0-9a-f]{6}$/);
});

// Dropping a creature on the map is not a combat: there is no fight to stay in
// step with, so no source reference either.
test('a monster can be placed straight from the bestiary', () => {
  const token = monsterToToken({ name: 'Ogre', source: 'XMM', size: 'L', hp: { average: 59 } });
  assert.equal(token.label, 'Ogre');
  assert.equal(token.w, 2);
  assert.equal(token.hp_current, 59);
  assert.equal(token.hp_max, 59);
  assert.match(token.image_url, /Ogre\.webp$/);
  assert.equal(token.source_ref, undefined);
});

test('a group gets the letters that make it usable at the table', () => {
  const monster = { name: 'Goblin', source: 'XMM', hp: { average: 7 } };
  const group = monsterGroupTokens(monster, 3);
  assert.deepEqual(group.map((token) => token.label), ['Goblin A', 'Goblin B', 'Goblin C']);
  // A lone creature keeps its plain name: "Goblin A" on its own reads as a typo.
  assert.deepEqual(monsterGroupTokens(monster, 1).map((token) => token.label), ['Goblin']);
  assert.equal(monsterGroupTokens(monster, 0).length, 1);
  assert.equal(monsterGroupTokens(monster, 999).length, 24, 'a slip on the keyboard cannot flood the scene');
});

// A fight restored without the bestiary has no stat block on its combatants,
// only the name and source it was snapshotted with. Reading the art from the
// stat block alone is what made every imported creature a skeleton.
test('artwork survives an import made without the bestiary', () => {
  const token = combatantToToken({
    name: 'Goblin',
    monsterRef: { name: 'Goblin', source: 'XMM' },
  });
  assert.match(token.image_url, /bestiary\/tokens\/XMM\/Goblin\.webp$/);
  // Size is the one thing that does need the stat block, and one square is the
  // safe guess.
  assert.equal(token.w, 1);
});

test('a creature with no stat block still gets a usable piece', () => {
  const token = combatantToToken({ name: 'Something' });
  assert.ok(token.image_url, 'the fallback token is used rather than nothing');
  assert.equal(token.hp_current, null);
  assert.equal(token.hp_max, null);
});

test('imported pieces are laid out without overlapping each other', () => {
  const tokens = Array.from({ length: 8 }, () => ({ w: 1, h: 1 }));
  const placed = layoutTokens(tokens, [], { columns: 3 });
  const seen = new Set(placed.map((token) => `${token.x}:${token.y}`));
  assert.equal(seen.size, 8);
  assert.deepEqual(placed[0], { w: 1, h: 1, x: 0, y: 0 });
  assert.deepEqual(placed[3], { w: 1, h: 1, x: 0, y: 1 });
});

test('a piece already on the map is not landed on', () => {
  const placed = layoutTokens([{ w: 1, h: 1 }], [{ x: 0, y: 0 }], { columns: 3 });
  assert.notDeepEqual({ x: placed[0].x, y: placed[0].y }, { x: 0, y: 0 });
});

// A 2x2 ogre reserves four squares: counting only its origin would let the next
// creature be dropped inside it.
test('a large creature reserves every square it covers', () => {
  const placed = layoutTokens([{ w: 2, h: 2 }, { w: 1, h: 1 }, { w: 1, h: 1 }], [], { columns: 4 });
  const ogre = placed[0];
  const covered = new Set();
  for (let dy = 0; dy < 2; dy += 1) {
    for (let dx = 0; dx < 2; dx += 1) covered.add(`${ogre.x + dx}:${ogre.y + dy}`);
  }
  for (const token of placed.slice(1)) {
    assert.equal(covered.has(`${token.x}:${token.y}`), false, 'a piece landed inside the ogre');
  }
});
