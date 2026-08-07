import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.store = new Map(); }

  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }

  setItem(key, value) { this.store.set(key, String(value)); }

  removeItem(key) { this.store.delete(key); }

  clear() { this.store.clear(); }

  key(index) { return Array.from(this.store.keys())[index] ?? null; }

  get length() { return this.store.size; }
}

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
}
if (!globalThis.window) {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: () => true, CustomEvent: class {} },
    configurable: true,
  });
}
if (!globalThis.CustomEvent) {
  Object.defineProperty(globalThis, 'CustomEvent', { value: class {}, configurable: true });
}

const { sendEncounterToBuilder, encounterFromGroups, withSheetIdentity } = await import('./handoff.js');
const { readPersistedInstance, persistParty } = await import('./storage.js');

const OGRE = { name: 'Ogre', source: 'MM', cr: '2', xp: 450, hp: { average: 59 } };
const GOBLIN = { name: 'Goblin', source: 'MM', cr: '1/4', xp: 50, hp: { average: 7 } };

test('a room becomes the two records the builder writes for a fight of its own', () => {
  localStorage.clear();
  const instanceId = 'enc-test-1';

  const link = sendEncounterToBuilder(instanceId, {
    name: 'Ebonscar — room 3',
    groups: [{ monster: OGRE, count: 2 }, { monster: GOBLIN, count: 4 }],
  });

  const persisted = readPersistedInstance(instanceId, [OGRE, GOBLIN]);
  // One saved encounter, one fight, and the fight points at the encounter.
  assert.equal(persisted.library.length, 1);
  assert.equal(persisted.library[0].name, 'Ebonscar — room 3');
  assert.equal(persisted.fightsData.items.length, 1);
  assert.equal(persisted.fightsData.items[0].encounterId, link.encounterId);
  assert.equal(persisted.fightsData.items[0].id, link.fightId);
  // Not made active: a GM sending twenty rooms in a row would have the
  // builder's current fight stolen twenty times.
  assert.equal(persisted.fightsData.activeFightId, null);
});

// The players have pieces on the map already. A second set of them, standing in
// the room they are about to walk into, is nobody's intention.
test('only the creatures are offered to the map, though the fight keeps the party', () => {
  localStorage.clear();
  const instanceId = 'enc-test-2';
  persistParty(instanceId, { count: 2, level: 3 }, [
    { name: 'Alba', hpMax: 24, initMod: 2 },
    { name: 'Bruno', hpMax: 31, initMod: 0 },
  ]);

  const link = sendEncounterToBuilder(instanceId, {
    name: 'Room 1',
    groups: [{ monster: OGRE, count: 1 }],
  });

  assert.deepEqual(link.combatants.map((combatant) => combatant.name), ['Ogre']);
  assert.ok(link.combatants.every((combatant) => combatant.type !== 'player'));

  // The saved fight is a combat, and initiative without the characters is not
  // one — so they are in the record even though they are not on the map.
  const persisted = readPersistedInstance(instanceId, [OGRE]);
  const names = persisted.fightsData.items[0].fight.combatants.map((item) => item.name);
  assert.deepEqual(names.sort(), ['Alba', 'Bruno', 'Ogre']);
});

// The reported symptom: a character with a blue icon and an uploaded portrait
// arrived in the fight as the first colour of the palette, with no face.
test('the party arrives wearing what its sheets say, not the palette', () => {
  localStorage.clear();
  const instanceId = 'enc-test-4';
  persistParty(instanceId, { count: 2, level: 3 }, [
    // Linked to a sheet, but holding the copy made the day it was imported.
    { name: 'Adhara', sourceId: 'char-adhara', hpMax: 24, initMod: 2, color: '#e05c5c' },
    // Typed in by hand: nothing to look up, and nothing to overwrite.
    { name: 'Bruno', hpMax: 31, initMod: 0, color: '#5ce07a' },
  ]);

  const link = sendEncounterToBuilder(instanceId, {
    name: 'Room 1',
    groups: [{ monster: OGRE, count: 1 }],
    roster: [{ characterId: 'char-adhara', color: '#5c8fe0', portraitPath: 'faces/adhara.png' }],
  });

  const persisted = readPersistedInstance(instanceId, [OGRE]);
  const stored = persisted.fightsData.items[0].fight.combatants;
  const adhara = stored.find((combatant) => combatant.name === 'Adhara');
  assert.equal(adhara.color, '#5c8fe0');
  // Stored, not merely built: the fight is kept as this snapshot and restored
  // from it, so a face that survives buildCombat and dies here is a face lost.
  assert.equal(adhara.portraitPath, 'faces/adhara.png');
  assert.equal(stored.find((combatant) => combatant.name === 'Bruno').color, '#5ce07a');
  // The party is in the fight; only the creatures go to the map.
  assert.deepEqual(link.combatants.map((combatant) => combatant.name), ['Ogre']);
});

test('a sheet that says nothing overwrites nothing', () => {
  const players = [
    { name: 'Adhara', sourceId: 'char-adhara', color: '#e05c5c', portraitPath: 'old.png' },
    { name: 'Bruno' },
  ];
  // No colour picked on the sheet and no portrait uploaded: the party keeps what
  // it has rather than being handed a pair of nulls.
  assert.deepEqual(
    withSheetIdentity(players, [{ characterId: 'char-adhara', color: null, portraitPath: null }]),
    players,
  );
  assert.equal(withSheetIdentity(players, []), players);
  assert.deepEqual(withSheetIdentity(null, [{ characterId: 'x', color: '#ffffff' }]), []);
});

test('a room with nothing in it is refused rather than written as an empty fight', () => {
  localStorage.clear();
  assert.deepEqual(encounterFromGroups([]), []);
  assert.deepEqual(encounterFromGroups([{ monster: null, count: 3 }]), []);
  assert.throws(() => sendEncounterToBuilder('enc-test-3', { groups: [] }), /no creatures/);
  assert.throws(() => sendEncounterToBuilder('', { groups: [{ monster: OGRE, count: 1 }] }), /no Encounter Builder/);
});
