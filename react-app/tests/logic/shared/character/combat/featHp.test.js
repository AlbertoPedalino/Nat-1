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

// One rule for every owner's hit point bonus (`hpBonus` sheet effects).
test('class, species and feat hit point bonuses go through the same effects', async () => {
  const [{ default: installDraconic }, { default: installDwarf }] = await Promise.all([
    import('../../../../../src/adapters/classes/sorcerer/draconic.js'),
    import('../../../../../src/adapters/species/dwarf.js'),
  ]);
  installDraconic(adapterRegistry);
  installDwarf(adapterRegistry);
  // Sorcerer 5, d6, CON +0: 6 + 4 × 4 = 22; Draconic Resilience 3 + 2 = 5.
  const sorcerer = { className: 'Sorcerer', subclassShortName: 'Draconic', level: 5, classLevel: 5, cls: { hd: { faces: 6 } }, choices: {} };
  assert.equal(computeMaxHp(sorcerer, 0), 27);
  // Dwarven Toughness: +1 per level.
  assert.equal(computeMaxHp({ ...sorcerer, speciesName: 'Dwarf', speciesSource: 'XPHB' }, 0), 32);
});

test('a sheet whose adapters did not load keeps the bonuses its snapshots carry', () => {
  const saved = {
    className: 'Wizard', level: 3, classLevel: 3, cls: { hd: { faces: 6 } }, choices: {},
    speciesName: 'Nowhere', speciesSnapshot: { hpBonusPerLevel: 1 },
    allFeatSnapshots: [{ name: 'Unloaded Feat', hpBonusPerLevel: 2 }],
  };
  // 6 + 2 × 4 = 14, + 3 × (1 + 2).
  assert.equal(computeMaxHp(saved, 0), 23);
});
