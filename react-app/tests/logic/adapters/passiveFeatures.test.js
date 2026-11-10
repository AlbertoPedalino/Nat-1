import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../src/adapters/registry.js';
import installChampion from '../../../src/adapters/classes/fighter/champion.js';
import installGloomStalker from '../../../src/adapters/classes/ranger/gloom-stalker.js';
import installFeyWanderer from '../../../src/adapters/classes/ranger/fey-wanderer.js';
import { getCritRange } from '../../../src/shared/character/sheet/effectBonuses.js';
import { buildD20Meta } from '../../../src/shared/character/dice/dice.js';
import { resolveToastLayout } from '../../../src/shared/character/dice/rollToastLayout.js';
import { rollOutcome } from '../../../src/shared/character/dice/rollLogPresentation.js';
import { getAbilityCheckBonus, getSkillBonus, hasSaveProficiency } from '../../../src/shared/character/sheet/sheetStats.js';

installChampion(adapterRegistry);
installGloomStalker(adapterRegistry);
installFeyWanderer(adapterRegistry);

const fighter = (level) => ({ className: 'Fighter', subclassShortName: 'Champion', classLevel: level, level, choices: {} });

test("Champion: weapon attacks are critical on 19, then 18; the toast and the log say so", () => {
  assert.equal(getCritRange({ className: 'Fighter', classLevel: 2, level: 2, choices: {} }), 20);
  assert.equal(getCritRange(fighter(3)), 19);
  assert.equal(getCritRange(fighter(15)), 18);
  const meta = buildD20Meta({ bonus: 5, kept: 19, mode: 'normal' }, { critOn: 19 });
  const rolls = [{ v: 19, faces: 20, kept: true }];
  assert.equal(resolveToastLayout({ rolls, meta }).isCrit, true);
  assert.equal(rollOutcome({ rolls, meta }).kind, 'nat20');
  assert.equal(resolveToastLayout({ rolls, meta: buildD20Meta({ bonus: 5, kept: 19, mode: 'normal' }) }).isCrit, false);
});

test('saving throw proficiencies: class, Iron Mind, and the Resilient pick', () => {
  const stalker = { className: 'Ranger', subclassShortName: 'Gloom Stalker', classLevel: 7, level: 7, choices: {}, clsSnapshot: { proficiency: ['str', 'dex'] } };
  assert.equal(hasSaveProficiency(stalker, 'wis'), true);
  assert.equal(hasSaveProficiency({ ...stalker, classLevel: 6, level: 6 }, 'wis'), false);
  const resilient = { className: 'Wizard', classLevel: 4, level: 4, clsSnapshot: { proficiency: ['int', 'wis'] }, choices: { feat_asi_lv4: ['Resilient'], feat_asi_lv4_save_prof: ['con'] } };
  assert.equal(hasSaveProficiency(resilient, 'con'), true);
  assert.equal(hasSaveProficiency(resilient, 'cha'), false);
});

test("Fey Wanderer: Charisma checks add the Wisdom modifier, at least +1", () => {
  const ranger = { className: 'Ranger', subclassShortName: 'Fey Wanderer', classLevel: 3, level: 3, choices: {}, scoreMethod: 'manual', manualScores: { cha: 10, wis: 16 } };
  assert.equal(getAbilityCheckBonus(ranger, 'cha'), 3);
  assert.equal(getSkillBonus(ranger, 'Persuasion'), 3);
  assert.equal(getAbilityCheckBonus({ ...ranger, manualScores: { cha: 10, wis: 8 } }, 'cha'), 1);
  assert.equal(getAbilityCheckBonus(ranger, 'wis'), 3);
});
