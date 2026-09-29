import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../src/adapters/registry.js';
import installTelekinetic from '../../../src/adapters/feats/telekinetic.js';
import { initialBuilderState } from '../../../src/pages/charbuilder/state/state.js';
import { makeSheetPayload } from '../../../src/pages/charbuilder/state/persistence.js';
import { buildSpellInfo } from '../../../src/pages/charsheet/spells/spellsTabLogic.js';
import { getSpellMetaFields } from '../../../src/shared/character/spells/spellMeta.js';

installTelekinetic(adapterRegistry);

// XPHB record (5etools): +1 INT/WIS/CHA and Mage Hand cast with that ability.
const telekinetic = {
  name: 'Telekinetic',
  source: 'XPHB',
  category: 'G',
  ability: [{ choose: { from: ['int', 'wis', 'cha'] } }],
  additionalSpells: [{ ability: 'inherit', known: { _: ['mage hand|xphb#c'] } }],
  entries: ['You gain the following benefits.'],
};

test('Telekinetic Shove is a Bonus Action card showing only its own benefit', () => {
  const actions = adapterRegistry.getFeatSheetActions('Telekinetic');

  assert.deepEqual(actions.map((action) => [action.name, action.cat, action.entryName]), [
    ['Telekinetic Shove', 'bonus', 'Telekinetic Shove'],
  ]);
});

test('Mage Hand from Telekinetic has no components, 60 ft range and the increased ability', () => {
  const saved = makeSheetPayload(
    {
      ...initialBuilderState.character,
      className: 'Fighter', classLevel: 4, level: 4,
      choices: { feat_asi_lv4: 'Telekinetic', feat_asi_lv4_asi: ['wis'] },
    },
    { ...initialBuilderState.data, feats: [telekinetic] },
  );
  const spellIndex = new Map([['mage hand', {
    name: 'Mage Hand', source: 'XPHB', level: 0, components: { v: true, s: true }, rangeLabel: '30 feet',
  }]]);
  const [mageHand] = buildSpellInfo(saved, spellIndex).cantrips;

  assert.equal(mageHand.name, 'Mage Hand');
  assert.deepEqual(mageHand.components, {});
  assert.equal(mageHand.componentsLabel, 'None');
  assert.equal(mageHand.rangeLabel, '60 feet');
  assert.equal(mageHand.spellcastingAbility, 'wis');
  assert.equal(getSpellMetaFields(mageHand).components, 'None');
});
