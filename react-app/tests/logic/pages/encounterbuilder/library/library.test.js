import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cardTime,
  dedupeFightsByEncounter,
  fightForEncounter,
  groupLibraryByQuest,
  isFightSuperseded,
  listQuestNames,
  mergeLibrary,
} from '../../../../../src/pages/encounterbuilder/library/library.js';

const fight = (id, encounterId, savedAt) => ({ id, encounterId, savedAt, fight: { combatants: [] } });

// The bug this exists for: the battle map's import dialog offered "Wolves"
// three times over. Every launch supersedes the fight before it, but the rows
// of those earlier launches came back from the cloud and were merged in as
// fights the device had never seen, because only their ids were compared.
test('an encounter keeps its newest fight and no other', () => {
  const kept = dedupeFightsByEncounter([
    fight('f3', 'e1', 30),
    fight('f1', 'e1', 10),
    fight('f2', 'e2', 20),
  ]);
  assert.deepEqual(kept.map((entry) => entry.id), ['f3', 'f2']);
  // Order is the caller's, not ours: only the superseded fights go.
  assert.deepEqual(
    dedupeFightsByEncounter([fight('f1', 'e1', 10), fight('f3', 'e1', 30)]).map((e) => e.id),
    ['f3'],
  );
});

// The reducer is running that one. Dropping it would take the combat on screen
// away from under the GM in the middle of a turn.
test('the fight in play survives a newer one for the same encounter', () => {
  const kept = dedupeFightsByEncounter([fight('f1', 'e1', 10), fight('f2', 'e1', 99)], 'f1');
  assert.deepEqual(kept.map((entry) => entry.id), ['f1']);
});

test('a fight launched from an unsaved draft belongs to no encounter, so it always stays', () => {
  const kept = dedupeFightsByEncounter([fight('f1', null, 10), fight('f2', null, 20)]);
  assert.deepEqual(kept.map((entry) => entry.id), ['f1', 'f2']);
  assert.deepEqual(dedupeFightsByEncounter(null), []);
});

test('ids are compared as text, so a number and its string are one encounter', () => {
  const kept = dedupeFightsByEncounter([fight('f1', 1786095432000, 10), fight('f2', '1786095432000', 20)]);
  assert.deepEqual(kept.map((entry) => entry.id), ['f2']);
});

test('a card is as new as the last of its two stamps', () => {
  assert.equal(cardTime({ createdAt: '2026-08-07T10:00:00.000Z' }), Date.parse('2026-08-07T10:00:00.000Z'));
  assert.ok(cardTime({ createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '2026-08-07T10:00:00.000Z' })
    > cardTime({ createdAt: '2026-08-01T10:00:00.000Z' }));
  assert.equal(cardTime(null), 0);
  assert.equal(cardTime({ updatedAt: 'not a date' }), 0);
});

test('a card carries its fight, and a quest groups the cards', () => {
  const encounters = [
    { id: 'e1', name: 'Wolves', quest: 'The Long Winter', updatedAt: 20 },
    { id: 'e2', name: 'Bandits', updatedAt: 10 },
  ];
  const merged = mergeLibrary(encounters, [fight('f1', 'e1', 30)]);
  assert.equal(merged[0].enc.id, 'e1');
  assert.equal(merged[0].fight.id, 'f1');
  assert.equal(fightForEncounter([fight('f1', 'e1', 30)], 'e2'), null);
  assert.deepEqual(listQuestNames(encounters), ['The Long Winter']);
  assert.deepEqual(groupLibraryByQuest(merged).map((group) => group.quest), ['The Long Winter', '']);
});

// The bug: an encounter saved again after its fight was launched still placed
// the old creatures on the battle map, under the new name.
test('a fight launched before its card was last saved is superseded', () => {
  const card = { id: 1, createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-30T10:00:00Z' };
  const launchedBefore = Date.parse('2026-09-29T10:00:00Z');
  const launchedAfter = Date.parse('2026-09-30T11:00:00Z');
  assert.equal(isFightSuperseded(card, fight(launchedBefore, 1, launchedAfter)), true);
  assert.equal(isFightSuperseded(card, fight(launchedAfter, 1, launchedAfter)), false);
  // The card copy a fight carries says which version it was launched from.
  assert.equal(isFightSuperseded(card, { ...fight('f1', 1, 0), encounter: { ...card, updatedAt: '2026-09-29T10:00:00Z' } }), true);
  assert.equal(isFightSuperseded(card, { ...fight(launchedBefore, 1, 0), encounter: card }), false);
  // No way to tell when it was launched: left alone.
  assert.equal(isFightSuperseded(card, fight('f1', 1, 0)), false);
  assert.equal(isFightSuperseded(null, fight(launchedBefore, 1, 0)), false);
});

// The builder's Library and the map's import dialog both read the card's fight
// from here: a superseded one is not offered to resume.
test('a card does not carry the fight of its previous version', () => {
  const card = { id: 1, updatedAt: '2026-09-30T10:00:00Z' };
  const before = Date.parse('2026-09-29T10:00:00Z');
  const after = Date.parse('2026-09-30T11:00:00Z');
  assert.equal(mergeLibrary([card], [fight(before, 1, before)])[0].fight, null);
  assert.equal(mergeLibrary([card], [fight(before, 1, before), fight(after, 1, after)])[0].fight.id, after);
});
