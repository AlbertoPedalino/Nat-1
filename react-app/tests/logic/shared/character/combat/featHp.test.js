import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installTough from '../../../../../src/adapters/feats/tough.js';
import { computeMaxHp } from '../../../../../src/shared/character/combat/hp.js';

installTough(adapterRegistry);

// Fighter 4, CON +0, average HP: 10 + 3 × 6 = 28 before feats.
const fighter = { className: 'Fighter', level: 4, classLevel: 4, cls: { hd: { faces: 10 } }, choices: {} };

test('Tough from a level feat slot adds 2 HP per level, even before its snapshot is saved', () => {
  assert.equal(computeMaxHp(fighter, 0), 28);
  assert.equal(computeMaxHp({ ...fighter, choices: { feat_asi_lv4: 'Tough' } }, 0), 36);
});

test('Tough counts once whether it comes from a choice, a snapshot or both', () => {
  const both = { ...fighter, choices: { feat_asi_lv4: 'Tough' }, allFeatSnapshots: [{ name: 'Tough', hpBonusPerLevel: 2 }] };
  assert.equal(computeMaxHp(both, 0), 36);
});

test('feat detail choices are not read as feats', () => {
  const withDetails = { ...fighter, choices: { feat_asi_lv4: 'Alert', feat_asi_lv4_asi: ['Tough'] } };
  assert.equal(computeMaxHp(withDetails, 0), 28);
});
