import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSummonedCreature } from '../../../../../src/shared/character/forms/summonedCreatures.js';
import {
  applyPrimalCompanionTraits,
  getPrimalCompanion,
  primalCompanionHp,
  primalStrikeDamageTypes,
  restorePrimalCompanionPatch,
  setPrimalCompanionHpPatch,
  summonPrimalBeastPatch,
} from '../../../../../src/shared/character/forms/primalCompanionForm.js';
import { longRestCharacterPatch } from '../../../../../src/shared/character/resources/longRest.js';

// The XPHB record, trimmed to what the sheet reads.
const beastOfTheLand = {
  name: 'Beast of the Land',
  source: 'XPHB',
  summonedByClass: 'Ranger|XPHB',
  size: ['M'],
  type: 'beast',
  ac: [{ special: '13 plus your Wisdom modifier' }],
  hp: { special: '5 plus five times your Ranger level (the beast has a number of Hit Dice [d8s] equal to your Ranger level)' },
  speed: { walk: 40, climb: 40 },
  str: 14, dex: 14, con: 15, int: 8, wis: 14, cha: 11,
  action: [{
    name: "Beast's Strike",
    entries: ['{@atkr m} {@hitYourSpellAttack Bonus equals your spell attack modifier}, reach 5 ft. {@h}{@damage 1d8 + 2} plus your Wisdom modifier Bludgeoning, Piercing, or Slashing damage (your choice when you summon the beast). If the beast moved at least 20 feet straight toward the target before the hit, the target takes an extra {@damage 1d6} damage of the same type.'],
  }],
};

test('a primal beast scales with Ranger level and Wisdom', () => {
  const creature = normalizeSummonedCreature(beastOfTheLand, { classLevel: 5, abilityMod: 3, spellAttackBonus: 6 });
  assert.equal(creature.ac, 16);
  assert.deepEqual(creature.hp, { average: 30, formula: '5d8' });
  assert.match(creature.actions[0].entries[0], /\{@hit 6\}/);
  assert.match(creature.actions[0].entries[0], /\{@damage 1d8 \+ 5\}/);
});

test('Primal Bond adds the PB to saves and checks; the strike deals the chosen type', () => {
  const creature = applyPrimalCompanionTraits(
    normalizeSummonedCreature(beastOfTheLand, { classLevel: 5, abilityMod: 3, spellAttackBonus: 6 }),
    { proficiencyBonus: 3, damageType: 'Piercing' },
  );
  assert.deepEqual(creature.saves, { str: 5, dex: 5, con: 5, int: 2, wis: 5, cha: 3 });
  assert.equal(creature.checkBonus, 3);
  const strike = creature.actions[0].entries[0];
  assert.match(strike, /\{@damage 1d8 \+ 5\} Piercing damage\. If the beast/);
  assert.doesNotMatch(strike, /your choice/);
  // Only the first damage phrase is the chosen type.
  assert.match(strike, /extra \{@damage 1d6\} damage of the same type/);
});

test('the Sea and Sky strikes take the chosen type too', () => {
  const sea = applyPrimalCompanionTraits({
    abilities: {},
    actions: [{ name: "Beast's Strike", entries: ['{@damage 1d6 + 5} Bludgeoning or Piercing damage (your choice when you summon the beast), and the target is Grappled.'] }],
  }, { damageType: 'Bludgeoning' });
  assert.match(sea.actions[0].entries[0], /\{@damage 1d6 \+ 5\} Bludgeoning damage, and the target/);

  const sky = applyPrimalCompanionTraits({
    abilities: {},
    actions: [{ name: "Beast's Strike", entries: ['{@damage 1d4 + 6} Slashing damage.'] }],
  }, { damageType: 'Force' });
  assert.match(sky.actions[0].entries[0], /\{@damage 1d4 \+ 6\} Force damage\./);
});

test('damage types follow the beast, with Force from Exceptional Training', () => {
  assert.deepEqual(primalStrikeDamageTypes('Beast of the Land', 3), ['Bludgeoning', 'Piercing', 'Slashing']);
  assert.deepEqual(primalStrikeDamageTypes('Beast of the Sky', 6), ['Slashing']);
  assert.deepEqual(primalStrikeDamageTypes('Beast of the Sky', 7), ['Slashing', 'Force']);
});

const withChoice = (beast, extra = {}) => ({ choices: { subclass_beast_companion_type: [beast] }, ...extra });

test('the beast is the builder choice; its stored state falls back to valid values', () => {
  assert.deepEqual(
    getPrimalCompanion(withChoice('Beast of the Sea'), { rangerLevel: 3 }),
    { beast: 'Beast of the Sea', damageType: 'Bludgeoning', hpCurrent: null },
  );
  // A multiclass-prefixed choice is read too.
  assert.equal(getPrimalCompanion({ choices: { mc1_subclass_beast_companion_type: 'Beast of the Sky' } }).beast, 'Beast of the Sky');
  // A damage type the beast cannot deal resets.
  assert.deepEqual(
    getPrimalCompanion(withChoice('Beast of the Sky', { primalCompanion: { beast: 'Beast of the Sky', damageType: 'Piercing', hpCurrent: 4 } })),
    { beast: 'Beast of the Sky', damageType: 'Slashing', hpCurrent: 4 },
  );
  assert.equal(getPrimalCompanion({}).beast, 'Beast of the Land');
});

test('changing the beast in the builder leaves the old beast state behind', () => {
  const C = withChoice('Beast of the Sea', { primalCompanion: { beast: 'Beast of the Land', damageType: 'Slashing', hpCurrent: 2 } });
  assert.deepEqual(getPrimalCompanion(C), { beast: 'Beast of the Sea', damageType: 'Bludgeoning', hpCurrent: null });
});

test('HP is full until hurt, clamped, and full again when restored', () => {
  const companion = getPrimalCompanion({}, { rangerLevel: 5 });
  assert.equal(primalCompanionHp(companion, 30), 30);

  const hurt = setPrimalCompanionHpPatch(companion, 12, 30).primalCompanion;
  assert.equal(hurt.hpCurrent, 12);
  assert.equal(setPrimalCompanionHpPatch(companion, -5, 30).primalCompanion.hpCurrent, 0);
  // Healed to the top it is "full" again, so a later level-up raises it too.
  assert.equal(setPrimalCompanionHpPatch(hurt, 40, 30).primalCompanion.hpCurrent, null);
  assert.equal(restorePrimalCompanionPatch(hurt).primalCompanion.hpCurrent, null);
});

test('summoning another beast saves the builder choice and brings it at full HP', () => {
  assert.deepEqual(summonPrimalBeastPatch({ choices: { other: 'x', subclass_beast_companion_type: ['Beast of the Land'] } }, 'Beast of the Sky', 3), {
    choices: { other: 'x', subclass_beast_companion_type: ['Beast of the Sky'] },
    primalCompanion: { beast: 'Beast of the Sky', damageType: 'Slashing', hpCurrent: null },
  });
  // Written back under the multiclass key the builder saved it as…
  assert.deepEqual(
    summonPrimalBeastPatch({ choices: { mc1_subclass_beast_companion_type: ['Beast of the Land'] } }, 'Beast of the Sea', 3).choices,
    { mc1_subclass_beast_companion_type: ['Beast of the Sea'] },
  );
  // …or, never chosen, under the key the builder gives the Ranger's choices.
  const multiclass = { className: 'Fighter', extraClasses: [{ name: 'Rogue' }, { name: 'Ranger' }] };
  assert.deepEqual(summonPrimalBeastPatch(multiclass, 'Beast of the Sea', 3).choices, { mc1_subclass_beast_companion_type: ['Beast of the Sea'] });
  assert.deepEqual(summonPrimalBeastPatch({ className: 'Ranger' }, 'Beast of the Sea', 3).choices, { subclass_beast_companion_type: ['Beast of the Sea'] });
  assert.equal(summonPrimalBeastPatch({}, 'Owl', 3), null);
});

test('a Long Rest heals the companion and leaves an unhurt one alone', () => {
  const hurt = { primalCompanion: { beast: 'Beast of the Land', damageType: 'Piercing', hpCurrent: 3 } };
  assert.deepEqual(longRestCharacterPatch(hurt), {
    primalCompanion: { beast: 'Beast of the Land', damageType: 'Piercing', hpCurrent: null },
  });
  assert.deepEqual(longRestCharacterPatch({ primalCompanion: { ...hurt.primalCompanion, hpCurrent: null } }), {});
});
