import test from 'node:test';
import assert from 'node:assert/strict';
import { featureFormRequirement } from '../../../../../src/shared/character/forms/beasts.js';
import { enterWildShapePatch, featureFormSnapshot } from '../../../../../src/shared/character/forms/wildShapeForm.js';
import { hasClassFeature } from '../../../../../src/shared/character/progression/classLevel.js';

// World of Warcraft's Bear Form, as 5etools has it: a Wild Shape form whose
// numbers are rules resolved for the druid who takes it.
const rule = (special) => ({ special });
const bearForm = {
  name: 'Bear Form',
  source: 'WoW',
  size: ['L'],
  type: { type: 'special', typeHidden: true },
  typeNote: "(Your Creature Type And Alignment Don't Change. Requires {@subclassFeature Circle Forms|Druid|XPHB|Moon|XPHB|3|XPHB})",
  ac: [rule('15 + your Wisdom modifier')],
  hp: { special: '3 times your Druid level', isTemporary: true },
  speed: { walk: 30 },
  str: rule('Your Strength and Dexterity scores are equal to your Wisdom score.'),
  dex: rule('Your Strength and Dexterity scores are equal to your Wisdom score.'),
  con: rule("Your Constitution, Intelligence, Wisdom, and Charisma don't change."),
  int: rule("Your Constitution, Intelligence, Wisdom, and Charisma don't change."),
  wis: rule("Your Constitution, Intelligence, Wisdom, and Charisma don't change."),
  cha: rule("Your Constitution, Intelligence, Wisdom, and Charisma don't change."),
  skill: rule('You have proficiency in {@skill Stealth|XPHB}.'),
  action: [{
    name: 'Mangle',
    entries: ['{@atkr m} {@hitYourSpellAttack Bonus equals your spell attack modifier}, reach 5 ft. {@h}{@damage 1d8} + your Wisdom modifier Slashing damage. This damage increases by {@damage 1d8} when you reach Druid levels 5 ({@damage 2d8}), 11 ({@damage 3d8}), and 17 ({@damage 4d8}).'],
  }],
};

const moonDruid = (level) => ({
  className: 'Druid', classLevel: level, level, subclassShortName: 'Moon', choices: {},
  scoreMethod: 'manual', manualScores: { str: 8, dex: 12, con: 14, int: 10, wis: 18, cha: 10 },
  allSubFeatures: [{ name: 'Circle Forms', subclassShortName: 'Moon', level: 3 }],
});

test('a feature form names the feature it needs', () => {
  assert.equal(featureFormRequirement(bearForm), 'Circle Forms');
  assert.equal(featureFormRequirement({ typeNote: '' }), null);
  assert.equal(hasClassFeature(moonDruid(3), 'Circle Forms'), true);
  assert.equal(hasClassFeature(moonDruid(2), 'Circle Forms'), false);
  assert.equal(hasClassFeature({ ...moonDruid(5), subclassShortName: 'Land' }, 'Circle Forms'), false);
});

test('Bear Form resolves with the druid Wisdom, level and spell attack', () => {
  const C = moonDruid(5);
  const bear = featureFormSnapshot(C, { record: bearForm });
  assert.equal(bear.ac, 19);
  assert.equal(bear.tempHpGrant, 15);
  assert.deepEqual([bear.abilities.str, bear.abilities.dex, bear.abilities.con, bear.abilities.wis], [18, 18, 14, 18]);
  assert.equal(bear.skills.stealth, 7);
  const mangle = bear.actions[0].entries[0];
  assert.match(mangle, /\{@hit 7\}/);
  assert.match(mangle, /\{@damage 2d8 \+ 4\}/);
  assert.equal(enterWildShapePatch({ tempHP: 0 }, bear, 5).tempHP, 15);
});
