import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installGreatWeaponMaster from '../../../../../src/adapters/feats/great-weapon-master.js';
import installFightingStyles from '../../../../../src/adapters/feats/fighting-styles.js';
import { getWeaponEffectBonuses, getWeaponNotes } from '../../../../../src/pages/charsheet/state/sheetEffects.js';
import { isHeavyWeapon } from '../../../../../src/pages/charsheet/inventory/equipmentSlots.js';
import { WEAPON_FILTERS, weaponFilterMatches } from '../../../../../src/shared/character/inventory/weaponFilters.js';

installGreatWeaponMaster(adapterRegistry);
installFightingStyles(adapterRegistry);

const HEAVY_TEXT = 'When you hit a creature with a weapon that has the {@itemProperty H|XPHB|Heavy} property as part of the {@action Attack|XPHB} action on your turn, you can cause the weapon to deal extra damage to the target. The extra damage equals your {@variantrule Proficiency|XPHB|Proficiency Bonus}.';
const gwmSnapshot = {
  name: 'Great Weapon Master',
  source: 'XPHB',
  entries: [
    'You gain the following benefits.',
    { type: 'entries', name: 'Heavy Weapon Mastery', entries: [HEAVY_TEXT] },
    { type: 'entries', name: 'Hew', entries: ['Immediately after you score a Critical Hit…'] },
  ],
};

const greatsword = { name: 'Greatsword', type: 'M', property: ['H', '2H'] };
const longsword = { name: 'Longsword', type: 'M', property: ['V'] };
const meleeInfo = (item) => ({ melee: true, heavy: isHeavyWeapon(item), twoHanded: true, oneHanded: false });

const withGwm = { level: 4, choices: { feat_asi_lv4: 'Great Weapon Master' }, allFeatSnapshots: [gwmSnapshot] };

test('the heavy filter matches only weapons with the Heavy property', () => {
  assert.equal(isHeavyWeapon(greatsword), true);
  assert.equal(isHeavyWeapon({ property: ['heavy'] }), true);
  assert.equal(isHeavyWeapon(longsword), false);
  assert.equal(weaponFilterMatches(WEAPON_FILTERS.HEAVY, { heavy: true }), true);
  assert.equal(weaponFilterMatches(WEAPON_FILTERS.HEAVY, { melee: true }), false);
});

test('Great Weapon Master adds a Heavy Weapon Mastery note to Heavy weapons with the official text', () => {
  const notes = getWeaponNotes(withGwm, meleeInfo(greatsword));

  assert.equal(notes.length, 1);
  assert.equal(notes[0].tag, 'GWM');
  assert.equal(notes[0].title, 'Heavy Weapon Mastery');
  assert.equal(notes[0].source, 'Great Weapon Master');
  assert.deepEqual(notes[0].entries, [HEAVY_TEXT]);
});

test('the note falls back to the adapter text when no feat snapshot carries the entry', () => {
  const notes = getWeaponNotes({ ...withGwm, allFeatSnapshots: [] }, meleeInfo(greatsword));

  assert.equal(notes.length, 1);
  assert.match(notes[0].entries[0], /extra damage equals your Proficiency Bonus/);
});

test('no note on non-Heavy weapons or without the feat', () => {
  assert.deepEqual(getWeaponNotes(withGwm, meleeInfo(longsword)), []);
  assert.deepEqual(getWeaponNotes({ level: 4 }, meleeInfo(greatsword)), []);
});

test('the reminder never changes weapon attack or damage numbers', () => {
  assert.deepEqual(getWeaponEffectBonuses(withGwm, meleeInfo(greatsword)), { attack: 0, damage: 0 });
});

test('Dueling still adds +2 to a lone one-handed melee weapon', () => {
  const dueling = { level: 1, choices: { fighter_fighting_style: 'Dueling' } };
  const info = { melee: true, oneHanded: true, twoHanded: false, soloWeapon: true };

  assert.deepEqual(getWeaponEffectBonuses(dueling, info), { attack: 0, damage: 2 });
  assert.deepEqual(getWeaponNotes(dueling, info), []);
});

test('the Hew card is a Bonus Action that shows only the Hew benefit', () => {
  const [hew, ...others] = adapterRegistry.getFeatSheetActions('Great Weapon Master');

  assert.equal(others.length, 0);
  assert.equal(hew.name, 'Hew');
  assert.equal(hew.cat, 'bonus');
  assert.equal(hew.entryName, 'Hew');
});
