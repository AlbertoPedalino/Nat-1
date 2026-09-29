import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../src/adapters/registry.js';
import installArtificer from '../../../../src/adapters/classes/artificer/artificer.js';
import { collectFeatAsiBonuses } from '../../../../src/shared/character/progression/abilityBonuses.js';
import { initialBuilderState } from '../../../../src/pages/charbuilder/state/state.js';
import { classChoiceSpecs } from '../../../../src/pages/charbuilder/choices/choiceSpecs.js';
import { makeSheetPayload } from '../../../../src/pages/charbuilder/state/persistence.js';
import { getFinal } from '../../../../src/pages/charsheet/state/calculations.js';
import { buildSpellInfo } from '../../../../src/pages/charsheet/spells/spellsTabLogic.js';

installArtificer(adapterRegistry);

// XPHB record (5etools): +1 INT/WIS/CHA, Misty Step + one level-1
// Enchantment/Divination spell, each once per Long Rest, cast with that ability.
const feyTouched = {
  name: 'Fey-Touched',
  source: 'XPHB',
  category: 'G',
  ability: [{ choose: { from: ['int', 'wis', 'cha'] } }],
  additionalSpells: [{
    ability: 'inherit',
    innate: { _: { daily: { '1e': ['misty step|xphb', { choose: 'level=1|school=E;D' }] } } },
  }],
  entries: ['You gain the following benefits.'],
};
const CHOSEN_SPELL_KEY = 'feat_asi_lv4_spell_innate_0_1||E,D';

const artificer = {
  ...initialBuilderState.character,
  className: 'Artificer',
  classLevel: 4,
  level: 4,
  scoreMethod: 'manual',
  manualScores: { str: 8, dex: 14, con: 13, int: 16, wis: 14, cha: 8 },
};

test('the Artificer gets the generic feat slots from its Ability Score Improvement features', () => {
  const cls = {
    name: 'Artificer',
    source: 'EFA',
    classFeatures: [4, 8, 12, 16].map((lv) => `Ability Score Improvement|Artificer|EFA|${lv}|EFA`),
  };
  const keys = classChoiceSpecs({ ...artificer, classLevel: 8, level: 8, cls })
    .filter((spec) => spec.type === 'feat_cat')
    .map((spec) => spec.key);

  assert.deepEqual(keys, ['feat_asi_lv4', 'feat_asi_lv8']);
});

test('Fey-Touched on an Artificer grants its +1, keeps its snapshot and lists both spells with one free cast', () => {
  const saved = makeSheetPayload(
    { ...artificer, choices: { feat_asi_lv4: 'Fey-Touched', feat_asi_lv4_asi: ['int'], [CHOSEN_SPELL_KEY]: ['Hex'] } },
    { ...initialBuilderState.data, feats: [feyTouched] },
  );

  assert.deepEqual(collectFeatAsiBonuses(saved), { int: 1 });
  assert.equal(getFinal(saved, 'int'), 17);
  assert.deepEqual(saved.allFeatSnapshots.map((feat) => feat.name), ['Fey-Touched']);

  const spellIndex = new Map([
    ['misty step', { name: 'Misty Step', source: 'XPHB', level: 2 }],
    ['hex', { name: 'Hex', source: 'XPHB', level: 1 }],
  ]);
  const spells = Object.values(buildSpellInfo(saved, spellIndex).leveled).flat()
    .map((spell) => ({
      name: spell.name,
      ability: spell.spellcastingAbility,
      freeCasts: spell.freeCasts.map((fc) => `${fc.label} ${fc.rechargeLabel}${fc.canAlsoUseSlots ? ' + slots' : ''}`),
    }));

  assert.deepEqual(spells, [
    { name: 'Hex', ability: 'int', freeCasts: ['Fey-Touched 1/LR + slots'] },
    { name: 'Misty Step', ability: 'int', freeCasts: ['Fey-Touched 1/LR + slots'] },
  ]);
});
