import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fightSignature,
  missingLibraryCards,
  toFightEntry,
  toFightRow,
} from './fightRecord.js';

const CARD = { id: 1786095432000, name: 'Ebonscar — room 3', encounter: [] };
const ROW = {
  id: '1786095432787',
  instance_id: 'enc_a',
  name: 'Ebonscar — room 3',
  encounter_id: '1786095432000',
  encounter: CARD,
  fight: { combatants: [{ id: 0, name: 'Ogre' }], currentTurn: 0, round: 1 },
  updated_at: '2026-08-07T10:00:00.000Z',
};

// The row drops straight into the builder's own `fights` array: a shape that
// needed translating would be a third spelling of the same record.
test('a row is already the shape the builder holds', () => {
  const entry = toFightEntry(ROW);
  assert.equal(entry.name, 'Ebonscar — room 3');
  assert.equal(entry.savedAt, Date.parse('2026-08-07T10:00:00.000Z'));
  assert.deepEqual(entry.fight, ROW.fight);
  assert.deepEqual(entry.encounter, CARD);
});

// Half the reducer finds a fight with `===`. The builder mints ids as numbers
// and the column is text, so a row read back as a string would be a fight that
// cannot supersede its own previous entry — two cards for one room — and a
// library card that no longer opens the fight under it.
test('an id comes back the shape it was written', () => {
  const entry = toFightEntry(ROW);
  assert.equal(entry.id, 1786095432787);
  assert.equal(entry.encounterId, 1786095432000);
  assert.equal(entry.encounterId, CARD.id, 'the card must still match its fight');

  // Anything that is not a plain number stays exactly as it came.
  assert.equal(toFightEntry({ ...ROW, id: 'fight-abc' }).id, 'fight-abc');
  assert.equal(toFightEntry({ ...ROW, encounter_id: null }).encounterId, null);
  // Past what a Number can hold without rounding, the text is the truth.
  const huge = '90071992547409911';
  assert.equal(toFightEntry({ ...ROW, id: huge }).id, huge);
});

test('a row with no snapshot is not a fight', () => {
  assert.equal(toFightEntry({ ...ROW, fight: null }), null);
  assert.equal(toFightEntry({ ...ROW, id: null }), null);
  assert.equal(toFightEntry(null), null);
});

test('a missing card is null rather than a shape nothing can read', () => {
  assert.equal(toFightEntry({ ...ROW, encounter: null }).encounter, null);
  assert.equal(toFightEntry({ ...ROW, encounter: 'nonsense' }).encounter, null);
  assert.equal(toFightEntry({ ...ROW, name: null }).name, 'Fight');
  assert.equal(toFightEntry({ ...ROW, updated_at: 'not a date' }).savedAt, 0);
});

test('an entry becomes a row, and a row with nothing to say becomes nothing', () => {
  const at = new Date('2026-08-07T11:00:00.000Z');
  const row = toFightRow('enc_a', 'owner-1', {
    id: 1786095432787,
    name: 'Room 3',
    encounterId: 1786095432000,
    encounter: CARD,
    fight: ROW.fight,
  }, at);
  assert.equal(row.id, '1786095432787');
  assert.equal(row.instance_id, 'enc_a');
  assert.equal(row.owner, 'owner-1');
  // Text on both sides of the wire: the id is a number in the builder and a
  // text column here, and a mismatch would upsert a second row every save.
  assert.equal(row.encounter_id, '1786095432000');
  assert.equal(row.updated_at, at.toISOString());

  assert.equal(toFightRow('enc_a', 'owner-1', { id: 'f1' }), null);
  assert.equal(toFightRow('', 'owner-1', { id: 'f1', fight: {} }), null);
  assert.equal(toFightRow('enc_a', null, { id: 'f1', fight: {} }), null);
});

// The timestamp moves on every save. In the signature it would make every fight
// look changed, and the builder would rewrite twenty rooms to run one.
test('the signature ignores when it was saved', () => {
  const entry = toFightEntry(ROW);
  assert.equal(fightSignature(entry), fightSignature({ ...entry, savedAt: 999 }));
  assert.notEqual(fightSignature(entry), fightSignature({ ...entry, name: 'Renamed' }));
  assert.notEqual(
    fightSignature(entry),
    fightSignature({ ...entry, fight: { ...entry.fight, round: 2 } }),
  );
});

test('only the cards this device is missing are handed over', () => {
  const rows = [toFightEntry(ROW), toFightEntry({ ...ROW, id: 'f2' })];
  // Both rows carry the same card: it is offered once.
  assert.deepEqual(missingLibraryCards(rows, []), [CARD]);
  assert.deepEqual(missingLibraryCards(rows, [{ id: 1786095432000 }]), []);
  assert.deepEqual(missingLibraryCards([toFightEntry({ ...ROW, encounter: null })], []), []);
  assert.deepEqual(missingLibraryCards(null, null), []);
});
