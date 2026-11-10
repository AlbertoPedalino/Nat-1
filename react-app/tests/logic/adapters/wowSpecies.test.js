import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../src/adapters/registry.js';
import installTauren from '../../../src/adapters/species/tauren.js';
import installWorgen from '../../../src/adapters/species/worgen.js';
import installChildOfTheSea from '../../../src/adapters/feats/child-of-the-sea.js';
import { collectOwnerEntries } from '../../../src/shared/character/sheet/adapterOwners.js';
import { getSpeedEffects } from '../../../src/shared/character/sheet/effectBonuses.js';

installTauren(adapterRegistry);
installWorgen(adapterRegistry);
installChildOfTheSea(adapterRegistry);

const tauren = (version) => ({ speciesName: 'Tauren', speciesSource: 'WoW', level: 3, choices: { species_version: version } });

test('a Tauren lineage brings only its own action and AC bonus', () => {
  const actions = (version) => collectOwnerEntries(tauren(version), 'SheetActions').map(({ entry }) => entry.name);
  assert.deepEqual(actions('Mulgore'), ['War Stomp']);
  assert.deepEqual(actions('Highmountain'), ['Highmountain Tauren']);
  const ac = (version) => collectOwnerEntries(tauren(version), 'SheetEffects').filter(({ entry }) => entry.type === 'acBonus').length;
  assert.equal(ac('Taunka'), 1);
  assert.equal(ac('Mulgore'), 0);
});

test('Worgen Darkflight uses Proficiency Bonus charges', () => {
  const [{ entry }] = collectOwnerEntries({ speciesName: 'Worgen', speciesSource: 'WoW', level: 1 }, 'SheetResources');
  assert.equal(entry.max, 'proficiencyBonus');
});

test('Child of the Sea gives a Swim Speed equal to the Speed', () => {
  const { walkingModes } = getSpeedEffects({ feats: ['Child of the Sea'], choices: { feat_origin: 'Child of the Sea' } });
  assert.ok(walkingModes.has('swim'));
});
