import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../src/adapters/registry.js';
import installPaladin from '../../../src/adapters/classes/paladin/paladin.js';
import installDeathKnight from '../../../src/adapters/classes/paladin/skins/death-knight.js';
import installEbonBlade from '../../../src/adapters/classes/paladin/skins/ebon-blade.js';
import installRangerHunter from '../../../src/adapters/classes/ranger/hunter.js';
import installDemonHunter from '../../../src/adapters/classes/ranger/skins/demon-hunter.js';
import { collectOwnerEntries } from '../../../src/shared/character/sheet/adapterOwners.js';
import { normalizeResourceMax } from '../../../src/shared/character/resources/restResources.js';
import { enumerateSubclassDataGrants } from '../../../src/shared/character/spells/autoGrantedSpells.js';
import { meetsFeatPrerequisites } from '../../../src/pages/charbuilder/choices/featPrerequisiteRules.js';
import { collectAdapterActions } from '../../../src/shared/character/sheet/adapterActions.js';
import { collectChoiceSpells } from '../../../src/pages/charsheet/spells/grantedSpells.js';
import { normalizeCharacterChoices } from '../../../src/shared/character/progression/choiceNormalization.js';

[installPaladin, installDeathKnight, installEbonBlade, installRangerHunter, installDemonHunter].forEach((install) => install(adapterRegistry));
adapterRegistry.registerClassSkin('Death Knight', { base: 'Paladin', removedFeatures: ['Lay on Hands', "Paladin's Smite", 'Restoring Touch'] });
adapterRegistry.registerClassSkin('Demon Hunter', { base: 'Ranger', removedFeatures: ['Feral Senses'] });

const skin = (name, base) => ({ name, source: 'WoW', ruleClass: { name: base, source: 'XPHB' } });
const deathKnight = (level, choices = {}) => ({
  className: 'Death Knight', classSource: 'WoW', classLevel: level, level,
  subclassShortName: level >= 3 ? 'Ebon Blade' : '', cls: skin('Death Knight', 'Paladin'),
  scoreMethod: 'manual', manualScores: { cha: 16 }, choices,
});

test('a Death Knight has Death Coil and the kept Paladin features, not Lay on Hands', () => {
  const names = collectOwnerEntries(deathKnight(14), 'SheetActions').map(({ entry }) => entry.name);
  assert.ok(names.includes('Death Coil'));
  assert.ok(names.includes('Divine Sense'));
  assert.ok(!names.includes('Lay on Hands'));
  assert.ok(!names.includes('Restoring Touch'));
  const coil = collectOwnerEntries(deathKnight(1), 'SheetResources').find(({ entry }) => entry.key === 'death_coil').entry;
  assert.equal(normalizeResourceMax(coil, deathKnight(1)), 4);
});

test('the Ebon Blade rune picks its Runic Power and its spell list from the data', () => {
  const frost = deathKnight(3, { subclass_spell_list: ['Frost'] });
  const names = collectOwnerEntries(frost, 'SheetActions').map(({ entry }) => entry.name);
  assert.ok(names.includes('Runic Power: Frost'));
  assert.ok(!names.includes('Runic Power: Blood'));
  const entity = {
    className: 'Death Knight', subclassShortName: 'Ebon Blade', level: 3, choicePrefix: '',
    entry: { subclassAdditionalSpells: [
      { name: 'Blood', prepared: { 3: ['vampiric blood|wow'] } },
      { name: 'Frost', prepared: { 3: ['chains of ice|wow'] } },
    ] },
  };
  assert.deepEqual(enumerateSubclassDataGrants(entity, frost).map((grant) => grant.name), ['chains of ice']);
  assert.deepEqual(enumerateSubclassDataGrants(entity, deathKnight(3)), []);
});

test('the Demon Hunter subclass does not take the Ranger Hunter subclass entries', () => {
  const C = {
    className: 'Demon Hunter', classLevel: 3, level: 3, subclassShortName: 'Demon Hunter',
    cls: skin('Demon Hunter', 'Ranger'), scoreMethod: 'manual', manualScores: { wis: 16 }, choices: {},
  };
  const subclassNames = collectOwnerEntries(C, 'SheetActions')
    .filter(({ owner }) => owner.kind === 'subclass')
    .map(({ entry }) => entry.name);
  assert.ok(subclassNames.includes('Soul Cleave'));
  const hunterNames = adapterRegistry.getSubclassSheetActions('Ranger', 'Hunter').map((entry) => entry.name);
  assert.ok(hunterNames.every((name) => !subclassNames.includes(name)));
});

test('feat prerequisites read the species and a named class', () => {
  const human = { prerequisite: [{ race: [{ name: 'human' }] }] };
  assert.equal(meetsFeatPrerequisites(human, { speciesName: 'Human' }), true);
  assert.equal(meetsFeatPrerequisites(human, { speciesName: 'Orc' }), false);
  const voidWarrior = { prerequisite: [{ otherSummary: { entry: 'When Gaining the Level 2 Demon Hunter "Fighting Style" Feature' } }] };
  assert.equal(meetsFeatPrerequisites(voidWarrior, { hasNamedClass: () => false }), false);
  assert.equal(meetsFeatPrerequisites(voidWarrior, { hasNamedClass: () => true }), true);
  assert.equal(meetsFeatPrerequisites(voidWarrior, { hasNamedClass: () => null }), true);
});

test('the World of Warcraft invocations bring their cards, spells and uses', async () => {
  const { default: installWarlock } = await import('../../../src/adapters/classes/warlock/warlock.js');
  installWarlock(adapterRegistry);
  const C = {
    className: 'Warlock', classSource: 'WoW', classLevel: 9, level: 9, choices: {
      warlock_invocation_1: ['Pact of the Legion'], warlock_invocation_2: ['Legion Summoning'], warlock_invocation_3: ['Health Funnel'],
    },
    scoreMethod: 'manual', manualScores: { cha: 18 },
  };
  const names = collectOwnerEntries(C, 'SheetActions').map(({ entry }) => entry.name);
  assert.ok(['Pact of the Legion', 'Health Funnel'].every((name) => names.includes(name)));
  assert.ok(!names.includes('Call of the Void'));
});

const runeLists = [
  { name: 'Blood', prepared: { 3: ['vampiric blood|wow'] } },
  { name: 'Frost', prepared: { 3: ['chains of ice|wow'] } },
  { name: 'Unholy', prepared: { 3: ['scourge strike|wow'] } },
];

test('the rune is switched on the sheet from the Runeforging card, its options from the data', () => {
  const dk = { ...deathKnight(3, { subclass_spell_list: ['Frost'] }), subclassAdditionalSpells: runeLists };
  const card = collectAdapterActions(dk).find((action) => action.name === 'Runeforging');
  assert.equal(card.choiceKey, 'subclass_spell_list');
  assert.equal(card.choicePrefix, '');
  assert.deepEqual(card.choiceOptions({ character: dk, action: card }).map((option) => option.value), ['Blood', 'Frost', 'Unholy']);
});

test('the rune is a list name, not a spell the character picked', () => {
  const dk = deathKnight(3, { subclass_spell_list: ['Blood'] });
  assert.deepEqual(collectChoiceSpells(dk, new Map()), []);
  assert.deepEqual(normalizeCharacterChoices(dk).spells.spells, []);
});
