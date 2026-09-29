import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installGreatWeaponMaster from '../../../../../src/adapters/feats/great-weapon-master.js';
import installFightingStyles from '../../../../../src/adapters/feats/fighting-styles.js';
import installPolearmMaster from '../../../../../src/adapters/feats/polearm-master.js';
import installCrossbowExpert from '../../../../../src/adapters/feats/crossbow-expert.js';
import installShieldMaster from '../../../../../src/adapters/feats/shield-master.js';
import installTavernBrawler from '../../../../../src/adapters/feats/tavern-brawler.js';
import installCharger from '../../../../../src/adapters/feats/charger.js';
import installDefensiveDuelist from '../../../../../src/adapters/feats/defensive-duelist.js';
import { getWeaponEffectBonuses, getWeaponNotes } from '../../../../../src/pages/charsheet/state/sheetEffects.js';
import {
  isCrossbow, isHeavyWeapon, isPolearmMasterWeapon,
} from '../../../../../src/pages/charsheet/inventory/equipmentSlots.js';
import { WEAPON_FILTERS, weaponFilterMatches } from '../../../../../src/shared/character/inventory/weaponFilters.js';

installGreatWeaponMaster(adapterRegistry);
installFightingStyles(adapterRegistry);
[installPolearmMaster, installCrossbowExpert, installShieldMaster, installTavernBrawler, installCharger, installDefensiveDuelist]
  .forEach((install) => install(adapterRegistry));

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

  assert.deepEqual(notes.map((note) => note.title), ['Heavy Weapon Mastery', 'Hew']);
  assert.deepEqual(notes.map((note) => note.tag), ['GWM', 'GWM']);
  assert.equal(notes[0].tag, 'GWM');
  assert.equal(notes[0].title, 'Heavy Weapon Mastery');
  assert.equal(notes[0].source, 'Great Weapon Master');
  assert.deepEqual(notes[0].entries, [HEAVY_TEXT]);
});

test('the note falls back to the adapter text when no feat snapshot carries the entry', () => {
  const notes = getWeaponNotes({ ...withGwm, allFeatSnapshots: [] }, meleeInfo(greatsword));

  assert.equal(notes.length, 2);
  assert.match(notes[0].entries[0], /extra damage equals your Proficiency Bonus/);
});

test('no Heavy Weapon Mastery on non-Heavy weapons, and no note without the feat', () => {
  assert.deepEqual(getWeaponNotes(withGwm, meleeInfo(longsword)).map((note) => note.title), ['Hew']);
  assert.deepEqual(getWeaponNotes(withGwm, { ranged: true }), []);
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

// A card with nothing to use is not a card: Hew is read on the Melee weapon it
// is made with, and its text comes from the feat's own "Hew" benefit.
test('Hew is a note on Melee weapons, not a card', () => {
  assert.deepEqual(adapterRegistry.getFeatSheetActions('Great Weapon Master'), []);
  const hew = getWeaponNotes(withGwm, meleeInfo(longsword))[0];
  assert.equal(hew.title, 'Hew');
  assert.deepEqual(hew.entries, ['Immediately after you score a Critical Hit…']);
});

const feat = (name) => ({ level: 4, choices: { feat_asi_lv4: name } });
const tags = (name, info) => getWeaponNotes(feat(name), info).map((note) => note.tag);

test('weapon-bound feat benefits land on the weapons they name', () => {
  assert.equal(isPolearmMasterWeapon({ name: 'Spear', type: 'M' }), true);
  assert.equal(isPolearmMasterWeapon({ name: '+1 Quarterstaff', baseItem: 'quarterstaff|xphb', type: 'M' }), true);
  assert.equal(isPolearmMasterWeapon({ name: 'Glaive', type: 'M', property: ['H', 'R', '2H'] }), true);
  assert.equal(isPolearmMasterWeapon({ name: 'Greatsword', type: 'M', property: ['H', '2H'] }), false);
  assert.equal(isCrossbow({ name: 'Hand Crossbow', type: 'R' }), true);
  assert.equal(isCrossbow({ name: 'Longbow', type: 'R' }), false);

  assert.deepEqual(tags('Polearm Master', { melee: true, polearm: true }), ['PAM', 'PAM']);
  assert.deepEqual(tags('Polearm Master', { melee: true }), []);
  assert.deepEqual(tags('Crossbow Expert', { ranged: true, crossbow: true, light: true }), ['Dual Wielding']);
  assert.deepEqual(tags('Crossbow Expert', { ranged: true, crossbow: true }), []);
  assert.deepEqual(tags('Defensive Duelist', { melee: true, finesse: true }), ['Parry']);
  assert.deepEqual(tags('Defensive Duelist', { melee: true }), []);
  assert.deepEqual(tags('Shield Master', { melee: true, shield: true }), ['Shield Bash']);
  assert.deepEqual(tags('Shield Master', { melee: true }), []);
  assert.deepEqual(tags('Tavern Brawler', { unarmed: true }), ['Push']);
  assert.deepEqual(tags('Tavern Brawler', { melee: true }), []);
  assert.deepEqual(tags('Charger', { melee: true }), ['Charge']);
  assert.deepEqual(tags('Charger', { unarmed: true }), ['Charge']);
  assert.deepEqual(tags('Charger', { ranged: true }), []);
  ['Polearm Master', 'Crossbow Expert', 'Defensive Duelist', 'Shield Master', 'Tavern Brawler', 'Charger']
    .forEach((name) => assert.deepEqual(adapterRegistry.getFeatSheetActions(name), [], name));
});
