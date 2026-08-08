import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FEED,
  MAX_ROLL_ID_LENGTH,
  ROLL_TTL_MS,
  addRoll,
  currentBubbles,
  currentThrows,
  queueRollToast,
  rollAuthor,
  normalizeRoll,
} from './rollFeed.js';

const roll = (patch = {}) => ({
  characterId: 'char-1',
  actorName: 'Aria',
  label: 'Attack',
  detail: '1d20 [14] + 4',
  total: 18,
  rolls: [{ v: 14, faces: 20, kept: true }],
  timestamp: 1000,
  ...patch,
});

test('a roll keeps what the sheet showed', () => {
  const entry = normalizeRoll(roll({ meta: { mode: 'advantage', bonus: 4 } }));
  assert.equal(entry.label, 'Attack');
  assert.equal(entry.detail, '1d20 [14] + 4');
  assert.equal(entry.total, 18);
  assert.equal(entry.mode, 'advantage');
  assert.equal(entry.bonus, 4, 'the flat modifier travels too, so the bubble can lay it out');
  assert.equal(entry.at, 1000);
});

test('a normalized roll can pass through the feed again without losing its metadata', () => {
  const normalized = normalizeRoll(roll({ meta: { mode: 'disadvantage', bonus: -2 } }));
  const again = normalizeRoll(normalized);
  assert.equal(again.at, 1000);
  assert.equal(again.mode, 'disadvantage');
  assert.equal(again.bonus, -2);
});

// A rest or a death-save guard has no total; it is still worth showing.
test('an entry without a total survives, one without words does not', () => {
  assert.equal(normalizeRoll(roll({ total: null })).total, null);
  assert.equal(normalizeRoll({ label: '', detail: '' }), null);
  assert.equal(normalizeRoll(null), null);
});

// Two identical rolls a second apart are two events and both belong in the feed,
// so the id cannot be derived from the contents alone.
test('rolls with the same numbers are still separate events', () => {
  let feed = addRoll([], roll());
  feed = addRoll(feed, roll({ timestamp: 2000 }));
  assert.equal(feed.length, 2);
  assert.equal(feed[0].at, 2000, 'newest first');
});

test('the same roll arriving twice is only counted once', () => {
  const entry = normalizeRoll(roll());
  const feed = addRoll(addRoll([], entry), entry);
  assert.equal(feed.length, 1);
});

test('the feed is capped so a long session cannot grow it without bound', () => {
  let feed = [];
  for (let index = 0; index < MAX_FEED + 15; index += 1) {
    feed = addRoll(feed, roll({ timestamp: index + 1 }));
  }
  assert.equal(feed.length, MAX_FEED);
  assert.equal(feed[0].at, MAX_FEED + 15, 'the newest survived');
});

// A bubble is a thing just said. After that it is history, and history lives in
// the log rather than floating over the board.
test('only fresh rolls float over a piece', () => {
  const feed = [normalizeRoll(roll({ timestamp: 1000 }))];
  assert.equal(currentBubbles(feed, 1000 + ROLL_TTL_MS - 1).length, 1);
  assert.equal(currentBubbles(feed, 1000 + ROLL_TTL_MS + 1).length, 0);
});

test('a flurry from one character shows one bubble, not a stack', () => {
  const feed = [
    normalizeRoll(roll({ timestamp: 3000, label: 'Damage', total: 9 })),
    normalizeRoll(roll({ timestamp: 2000 })),
    normalizeRoll(roll({ timestamp: 2500, characterId: 'char-2', actorName: 'Brom' })),
  ];
  const bubbles = currentBubbles(feed, 3000);
  assert.equal(bubbles.length, 2);
  assert.equal(bubbles[0].label, 'Damage', 'the latest wins for that character');
  assert.deepEqual(bubbles.map((item) => item.characterId), ['char-1', 'char-2']);
});

test('a roll from nobody in particular never floats over a piece', () => {
  const feed = [normalizeRoll(roll({ characterId: null, timestamp: 1000 }))];
  assert.deepEqual(currentBubbles(feed, 1000), []);
});

test('the screen that made a roll does not show its own bubble', () => {
  const localFeed = addRoll([], roll(), { local: true });
  const remoteFeed = addRoll([], roll());

  assert.equal(currentBubbles(localFeed, 1000).length, 0);
  assert.equal(currentThrows(localFeed, 1000).length, 0, 'only the bubble is suppressed');
  assert.equal(localFeed.length, 1, 'the local roll remains in the log');
  assert.equal(currentBubbles(remoteFeed, 1000).length, 1, 'other screens still show it');
});

test('a local physical roll still throws its dice without a bubble', () => {
  const feed = addRoll([], roll({ thrown: true }), { local: true });
  assert.equal(currentBubbles(feed, 1000).length, 0);
  assert.equal(currentThrows(feed, 1000).length, 1);
});

// A roll made from the map's own roller has to be attributed to somebody before
// it can float over a piece.
test('a player rolling from the map rolls as their piece', () => {
  const author = rollAuthor({
    isGm: false,
    ownedCharacterIds: ['char-1'],
    tokens: [{ characterId: 'char-9' }, { characterId: 'char-1' }],
    roster: [{ characterId: 'char-1', name: 'Aria' }],
  });
  assert.deepEqual(author, { characterId: 'char-1', actorName: 'Aria' });
});

// The GM has no sheet and no piece: the roll belongs in the log, over nobody.
test('the GM rolls as the GM', () => {
  assert.deepEqual(
    rollAuthor({ isGm: true, ownedCharacterIds: [], tokens: [], roster: [] }),
    { characterId: null, actorName: 'GM' },
  );
});

test('a player whose piece is not on this scene still owns the roll', () => {
  const author = rollAuthor({ isGm: false, ownedCharacterIds: ['char-2'], tokens: [], roster: [] });
  assert.equal(author.characterId, 'char-2');
  assert.equal(author.actorName, 'Player');
});

// Dice belong to whoever threw them, so the GM's roll — which has no character
// and therefore no bubble — still lands on the table.
test('a roll with no character still throws dice', () => {
  const feed = [normalizeRoll(roll({ characterId: null, actorName: 'GM', thrown: true, timestamp: Date.now() }))];
  assert.equal(currentBubbles(feed).length, 0, 'nowhere to put a bubble');
  assert.equal(currentThrows(feed).length, 1);
});

test('a roll with no dice throws none', () => {
  const feed = [normalizeRoll(roll({ thrown: true, rolls: [], timestamp: Date.now() }))];
  assert.equal(currentThrows(feed).length, 0);
});

// A sheet roll happened somewhere else and is only being reported here; dice
// that turned up already at rest looked like a bug rather than a roll.
test('a roll made on a sheet reaches the log but not the table', () => {
  const feed = [normalizeRoll(roll({ timestamp: Date.now() }))];
  assert.equal(currentThrows(feed).length, 0);
  assert.equal(currentBubbles(feed).length, 1, 'it still gets a bubble');
});

test('a synced sheet roll can request physical dice on the map', () => {
  const feed = [normalizeRoll(roll({ thrown: true, timestamp: Date.now() }))];
  assert.equal(currentThrows(feed).length, 1);
  assert.equal(currentBubbles(feed).length, 1);
});

test('the shared toast waits for dice but shows notices immediately', () => {
  const pending = new Map();
  const dice = roll({ id: 'sheet-roll', thrown: true });
  assert.equal(queueRollToast(dice, pending), null);
  assert.equal(pending.get('sheet-roll'), dice);

  const notice = roll({ id: 'notice', rolls: [], total: null });
  assert.equal(queueRollToast(notice, pending), notice);
});

test('shared roll payloads bound identifiers and discard impossible dice and numbers', () => {
  const before = Date.now();
  const entry = normalizeRoll({
    id: 'x'.repeat(MAX_ROLL_ID_LENGTH + 40),
    characterId: 'c'.repeat(200),
    actorName: 'Aria',
    label: 'Hostile payload',
    detail: 'Still safe to display',
    total: Infinity,
    rolls: [
      { faces: 6, v: 4, kept: true },
      { faces: 6, v: 900 },
      { faces: 1, v: 1 },
      { faces: '8', v: '2', kept: false },
      null,
    ],
    meta: { mode: 'secret', bonus: Infinity },
    thrown: true,
    timestamp: Infinity,
  });

  assert.equal(entry.id.length, MAX_ROLL_ID_LENGTH);
  assert.equal(entry.characterId.length, 120);
  assert.equal(entry.total, null);
  assert.deepEqual(entry.rolls, [
    { faces: 6, v: 4, kept: true },
    { faces: 8, v: 2, kept: false },
  ]);
  assert.equal(entry.mode, null);
  assert.equal(entry.bonus, null);
  assert.equal(entry.thrown, true);
  assert.ok(entry.at >= before && entry.at <= Date.now());
});

test('a shared roll preserves every valid die and never throws an invalid set', () => {
  const many = Array.from({ length: 125 }, () => ({ faces: 6, v: 3 }));
  const normalized = normalizeRoll(roll({ rolls: many, thrown: true }));
  const invalid = normalizeRoll(roll({ rolls: [{ faces: 6, v: 7 }], thrown: true }));

  assert.equal(normalized.rolls.length, many.length);
  assert.equal(normalized.thrown, true);
  assert.deepEqual(invalid.rolls, []);
  assert.equal(invalid.thrown, false);
});

test('a newer physical roll surfaces the superseded toast and replaces its pending slot', () => {
  const pending = new Map();
  const first = roll({ id: 'sheet-roll-1', thrown: true });
  const second = roll({ id: 'sheet-roll-2', thrown: true, timestamp: 1001 });

  assert.equal(queueRollToast(first, pending), null);
  assert.equal(queueRollToast(second, pending), first);
  assert.deepEqual([...pending.keys()], ['sheet-roll-2']);
});

test('physical toast queues stay independent for different rollers', () => {
  const pending = new Map();
  const aria = roll({ id: 'aria-roll', thrown: true });
  const brom = roll({
    id: 'brom-roll',
    characterId: 'char-2',
    actorName: 'Brom',
    thrown: true,
  });

  assert.equal(queueRollToast(aria, pending), null);
  assert.equal(queueRollToast(brom, pending), null);
  assert.deepEqual([...pending.keys()], ['aria-roll', 'brom-roll']);
});

test('dice are cleared once the roll is history', () => {
  const now = Date.now();
  const feed = [normalizeRoll(roll({ thrown: true, timestamp: now - ROLL_TTL_MS - 1 }))];
  assert.equal(currentThrows(feed, now).length, 0);
});
