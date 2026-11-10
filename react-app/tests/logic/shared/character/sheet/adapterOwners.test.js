import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installDance from '../../../../../src/adapters/classes/bard/dance.js';
import installOrc from '../../../../../src/adapters/species/orc.js';
import { registerSpeciesCopies } from '../../../../../src/shared/character/sheet/recordInheritance.js';
import {
  characterOwners,
  collectOwnerEntries,
  entryApplies,
  ownerEntries,
  speciesOwner,
} from '../../../../../src/shared/character/sheet/adapterOwners.js';
import { collectAcFormulas } from '../../../../../src/shared/character/combat/ac.js';
import { getUnarmedStrike } from '../../../../../src/shared/character/sheet/effectBonuses.js';

installDance(adapterRegistry);

const bard = (fields = {}) => ({
  className: 'Bard', subclassShortName: 'Dance', level: 5, inventory: [], choices: {}, ...fields,
});

test('the owners of a character: classes with their subclasses, then species', () => {
  const owners = characterOwners({
    ...bard(),
    extraClasses: [{ name: 'Rogue', level: 2 }],
    speciesName: 'Elf',
    speciesSource: 'XPHB',
  });
  assert.deepEqual(owners.map((o) => [o.kind, o.name, o.label, o.choicePrefix]), [
    ['class', 'Bard', 'Bard', ''],
    ['subclass', 'Dance', 'Dance (Bard)', ''],
    ['class', 'Rogue', 'Rogue', 'mc0_'],
    ['species', 'Elf', 'Elf', ''],
  ]);
});

test('one gate for every spelling of a requirement', () => {
  const C = { level: 3, choices: { mc0_order: ['Thaumaturge'], model: ['Guardian'] }, inventory: [{ flags: ['focus'], equipped: true }] };
  const owner = { kind: 'class', name: 'Cleric', level: 3, choicePrefix: 'mc0_' };
  assert.equal(entryApplies({ requiredChoice: { key: 'order', value: 'Thaumaturge' } }, C, { owner }), true);
  assert.equal(entryApplies({ requiresChoice: { key: 'order', value: 'Protector' } }, C, { owner }), false);
  assert.equal(entryApplies({ choiceKey: 'model', model: ['guardian'] }, C, { owner }), true);
  assert.equal(entryApplies({ requiresInventoryFlag: 'focus' }, C, { owner }), true);
  assert.equal(entryApplies({ requiredItemFlag: 'wand' }, C, { owner }), false);
  assert.equal(entryApplies({ minLevel: 5 }, C, { owner }), false);
  assert.equal(entryApplies({ condition: () => { throw new Error('x'); } }, C, { owner }), false);
});

test('Dazzling Footwork: Unarmored Defense and the Bardic die on unarmed strikes, unarmored only', () => {
  assert.ok(collectOwnerEntries(bard(), 'SheetEffects').length > 0);
  const ac = collectAcFormulas(bard());
  assert.deepEqual(ac.map((f) => [f.label, f.abilities, f.allowShield]), [['Dazzling Footwork', ['dex', 'cha'], false]]);
  assert.deepEqual(getUnarmedStrike(bard()), { face: 8, dexterity: true });
  assert.equal(getUnarmedStrike(bard({ level: 15 })).face, 12);
  const shielded = bard({ inventory: [{ type: 'S', equipped: true }] });
  assert.deepEqual(getUnarmedStrike(shielded), { face: 1, dexterity: false });
});

test('speed effects: bonuses per mode, "walking" modes, situational ones only listed', async () => {
  const { getSpeedEffects } = await import('../../../../../src/shared/character/sheet/effectBonuses.js');
  const { default: installSea } = await import('../../../../../src/adapters/classes/druid/sea.js');
  installSea(adapterRegistry);
  const druid = { className: 'Druid', subclassShortName: 'Sea', level: 10, inventory: [], choices: {} };
  const { bonus, walkingModes } = getSpeedEffects(druid);
  assert.deepEqual(bonus, {});
  // Aquatic Affinity swims at walking speed; Stormborn's flight is only while Wrath is active.
  assert.deepEqual([...walkingModes], ['swim']);
});

test('a reprinted species reads the entries of the species it copies', () => {
  installOrc(adapterRegistry);
  const owner = speciesOwner({ speciesName: 'Orc', speciesSource: 'WoW' });
  assert.deepEqual(ownerEntries(owner, 'SheetResources'), []);
  registerSpeciesCopies([{ name: 'Orc', source: 'WoW', copiedFrom: { name: 'Orc', source: 'XPHB' } }]);
  const keys = ownerEntries(owner, 'SheetResources').map((resource) => resource.key);
  assert.ok(keys.includes('orc_relentless_endurance'));
});
