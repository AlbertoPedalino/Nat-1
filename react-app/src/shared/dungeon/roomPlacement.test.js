import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATURE_LAYER, MARKER_LAYER, roomTokens } from './roomPlacement.js';

const ROOM = {
  id: 'room_3', number: 3, x: 8, y: 2, w: 4, h: 6,
};
const OGRE = { name: 'Ogre', cr: '2', hp: { average: 59 } };

// The two layers are the whole point of this module, and they were the wrong
// way round once: creatures belong where every other creature is, and the
// GM's own markers stay off the table's board.
test('creatures go on the piece layer and markers stay on the GM\'s', () => {
  const tokens = roomTokens({
    room: ROOM,
    groups: [{ monster: OGRE, count: 2 }],
    markers: [
      { kind: 'trap', iconKey: 'chevrons-down', label: 'Pit · DC 13 · 2d6' },
      { kind: 'loot', iconKey: 'gem', label: 'Coins · Rare' },
    ],
    origin: { col: 5, row: 4 },
  });

  const creatures = tokens.filter((token) => !token.iconKey);
  const markers = tokens.filter((token) => token.iconKey);

  assert.equal(creatures.length, 2);
  assert.ok(creatures.every((token) => token.layer === CREATURE_LAYER));
  assert.equal(CREATURE_LAYER, 'tokens');

  assert.equal(markers.length, 2);
  assert.ok(markers.every((token) => token.layer === MARKER_LAYER));
  assert.equal(MARKER_LAYER, 'gm');
  assert.equal(markers[0].label, 'Pit · DC 13 · 2d6');
});

// The creature is built from the monster itself, not from a wrapper around it —
// which once produced an ogre with one hit point and a skeleton's portrait.
test('a creature keeps its own hit points and its own name', () => {
  const [token] = roomTokens({ room: ROOM, groups: [{ monster: OGRE, count: 1 }] });
  assert.equal(token.label, 'Ogre');
  assert.equal(token.hp_max, 59);
  assert.equal(token.hp_current, 59);
});

test('everything lands inside the room it was rolled for', () => {
  const origin = { col: 5, row: 4 };
  const tokens = roomTokens({
    room: ROOM,
    groups: [{ monster: OGRE, count: 4 }],
    markers: [{ kind: 'trap', iconKey: 'flame', label: 'Jet' }],
    origin,
  });

  const left = origin.col + ROOM.x;
  const top = origin.row + ROOM.y;
  for (const token of tokens) {
    assert.ok(token.x >= left && token.x + token.w <= left + ROOM.w, `x ${token.x} is inside`);
    assert.ok(token.y >= top && token.y + token.h <= top + ROOM.h, `y ${token.y} is inside`);
  }
  // Two of them are not standing in the same square.
  const squares = new Set(tokens.map((token) => `${token.x}:${token.y}`));
  assert.equal(squares.size, tokens.length);
});

test('a room with nothing in it puts nothing out', () => {
  assert.deepEqual(roomTokens({ room: ROOM, groups: [], markers: [] }), []);
  assert.deepEqual(roomTokens({ room: null, groups: [{ monster: OGRE, count: 1 }] }), []);
});
