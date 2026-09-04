import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySummonedCreatureVersion,
  getSummonedCreatureTypeChoices,
  getSummonedCreatureVersions,
  normalizeSummonedCreature,
} from './summonedCreatures.js';

test('summoned creature versions apply named remove, rename, and replacement mods', () => {
  const base = {
    name: 'Spirit',
    action: [{ name: 'Slam' }, { name: 'Bite' }],
    bonus: [{ name: 'Power', entries: ['old'] }],
    _versions: [],
  };
  const result = applySummonedCreatureVersion(base, {
    name: 'Spirit (Swift)',
    _mod: {
      action: [
        { mode: 'removeArr', names: ['Bite'] },
        { mode: 'renameArr', renames: { rename: 'Slam', with: 'Swift Slam' } },
      ],
      bonus: { mode: 'replaceArr', replace: 'Power', items: { name: 'Dash', entries: ['new'] } },
    },
  });
  assert.deepEqual(result.action.map((entry) => entry.name), ['Swift Slam']);
  assert.deepEqual(result.bonus.map((entry) => entry.name), ['Dash']);
  assert.equal(result._versions, undefined);
});

test('summoned spell statblocks resolve AC, HP, attack bonus, save DC, and slot scaling', () => {
  const creature = normalizeSummonedCreature({
    name: 'Dinosaur Spirit (Ankylosaur)',
    source: 'AU',
    size: ['H'],
    type: 'beast',
    ac: [{ special: "13 + the spell's level" }],
    hp: { special: '60 + 10 for each spell level above 6' },
    str: 21,
    action: [{
      name: 'Slam',
      entries: ['{@atkr m} {@hitYourSpellAttack Bonus equals your spell attack modifier}. {@damage 1d10 + 5 + summonSpellLevel}. Save against your spell save DC.'],
    }],
  }, { spellLevel: 8, spellAttackBonus: 11, spellSaveDc: 19 });

  assert.equal(creature.ac, 21);
  assert.equal(creature.hp.average, 80);
  assert.equal(creature.size, 'Huge');
  assert.match(creature.actions[0].entries[0], /\{@hit 11\}/);
  assert.match(creature.actions[0].entries[0], /1d10 \+ 5 \+ 8/);
  assert.match(creature.actions[0].entries[0], /Save against 19/);
});

test('vestige companion scaling uses Warlock level and Charisma modifier', () => {
  const creature = normalizeSummonedCreature({
    name: 'Vestige Companion (Celestial)',
    source: 'AU',
    size: ['S'],
    type: 'celestial',
    ac: [{ special: '13 + your Charisma modifier' }],
    hp: { special: '4 + four times your Warlock level (the vestige has Hit Dice)' },
    bonus: [{ name: 'Healing Touch', entries: ['Regains {@dice 2d8} plus your Charisma modifier.'] }],
  }, { classLevel: 10, abilityMod: 4, spellAttackBonus: 8 });

  assert.equal(creature.ac, 17);
  assert.equal(creature.hp.average, 44);
  assert.match(creature.bonusActions[0].entries[0], /\{@dice 2d8 \+ 4\}/);
});

test('summoned creature versions expose one concrete record per 5etools version', () => {
  const versions = getSummonedCreatureVersions({
    name: 'Spirit',
    action: [{ name: 'Slam' }],
    _versions: [
      { name: 'Spirit (A)' },
      { name: 'Spirit (B)' },
    ],
  });
  assert.deepEqual(versions.map((version) => version.name), ['Spirit (A)', 'Spirit (B)']);
});

test('a summon with an independent creature-type choice exposes and applies it', () => {
  const record = {
    name: 'Battle Familiar (Brute)',
    type: { type: { choose: ['celestial', 'fey', 'fiend'] } },
  };

  assert.deepEqual(getSummonedCreatureTypeChoices(record), ['celestial', 'fey', 'fiend']);
  assert.equal(normalizeSummonedCreature(record, { creatureType: 'fey' }).type, 'fey');
});
