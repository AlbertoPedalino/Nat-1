import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompendiumIndex,
  compendiumEntryText,
  searchCompendium,
} from '../../../../src/pages/compendium/compendiumIndex.js';

const records = {
  spell: [
    { name: 'Fireball', source: 'XPHB', level: 3, schoolFull: 'Evocation', descriptionEntries: ['A bright streak flashes… {@damage 8d6} Fire damage.'] },
    { name: 'Fire Bolt', source: 'XPHB', level: 0, schoolFull: 'Evocation', descriptionEntries: ['You hurl a mote of fire.'] },
    { name: 'Detect Magic', source: 'XPHB', level: 1, schoolFull: 'Divination', ritual: true, concentration: true, descriptionEntries: ['You sense magic.'] },
  ],
  item: [{ name: 'Bag of Holding', source: 'XDMG', type: 'G', wondrous: true, rarity: 'uncommon', entries: ['This bag has an interior space.'] }],
  monster: [{ name: 'Goblin Warrior', source: 'XMM', cr: '1/4', type: { type: 'fey', tags: ['goblinoid'] }, action: [{ name: 'Scimitar', entries: ['Hit.'] }] }],
  condition: [{ name: 'Grappled', source: 'XPHB', entries: ['Speed 0. You have Disadvantage on attack rolls against any target other than the grappler.'] }],
  rule: [
    { name: 'Falling', source: 'XPHB', entries: ['A creature that falls takes {@damage 1d6} Bludgeoning damage for every 10 feet it fell.'] },
    { name: 'Falling', source: 'DMG', entries: ['Legacy rule.'] },
  ],
  feat: [{ name: 'Alert', source: 'XPHB', category: 'O', entries: ['You gain the following benefits.'] }],
};

test('the index lists the supported records, with a line saying what each is', () => {
  const index = buildCompendiumIndex(records);
  const byKey = Object.fromEntries(index.map((entry) => [entry.key, entry]));
  assert.equal(byKey['spell:Fireball|XPHB'].subtitle, '3rd-level Evocation');
  assert.equal(byKey['spell:Fire Bolt|XPHB'].subtitle, 'Evocation cantrip');
  assert.equal(byKey['spell:Detect Magic|XPHB'].subtitle, '1st-level Divination (ritual, concentration)');
  assert.equal(byKey['item:Bag of Holding|XDMG'].subtitle, 'Wondrous item, uncommon');
  assert.equal(byKey['monster:Goblin Warrior|XMM'].subtitle, 'CR 1/4 · Fey');
  assert.equal(byKey['feat:Alert|XPHB'].subtitle, 'Origin feat');
  assert.ok(byKey['rule:Falling|XPHB']);
  assert.equal(byKey['rule:Falling|DMG'], undefined, 'the 2014 rules stay out');
  assert.deepEqual(index.map((entry) => entry.name), [...index.map((entry) => entry.name)].sort((a, b) => a.localeCompare(b)));
});

test('names rank before descriptions: exact, start, word starts, anywhere', () => {
  const index = buildCompendiumIndex(records);
  const names = (query, options) => searchCompendium(index, query, options).map((entry) => entry.name);
  assert.deepEqual(names('fireball'), ['Fireball']);
  assert.deepEqual(names('fire'), ['Fireball', 'Fire Bolt'], 'both start with it: the shorter name first');
  assert.deepEqual(names('bag hold'), ['Bag of Holding']);
  assert.deepEqual(names('olding'), ['Bag of Holding']);
  // Past the names: "disadvantage" appears only in Grappled's text.
  assert.deepEqual(names('disadvantage'), ['Grappled']);
  assert.deepEqual(names('bludgeoning'), ['Falling']);
  assert.deepEqual(names('scimitar'), ['Goblin Warrior'], 'a monster is found by its actions too');
  assert.deepEqual(names('de', { inText: true }), ['Detect Magic'], 'two letters search names only');
  assert.deepEqual(names('', { kind: 'spell' }), ['Detect Magic', 'Fire Bolt', 'Fireball']);
  assert.deepEqual(names('fire', { kind: 'item' }), []);
  assert.equal(searchCompendium(index, '', { limit: 2 }).length, 2);
});

test('description text drops 5etools markup and is computed once', () => {
  const [entry] = buildCompendiumIndex({ spell: [records.spell[0]] });
  assert.match(compendiumEntryText(entry), /8d6 fire damage/);
  assert.equal(compendiumEntryText(entry), compendiumEntryText(entry));
});

test('class features, class options and skills are entries too, each class its own', () => {
  const index = buildCompendiumIndex({
    classFeature: [
      { name: 'Spellcasting', source: 'XPHB', className: 'Bard', classSource: 'XPHB', level: 1, entries: ['Bard spells.'] },
      { name: 'Spellcasting', source: 'XPHB', className: 'Wizard', classSource: 'XPHB', level: 1, entries: ['Wizard spells.'] },
      { name: 'Frenzy', source: 'XPHB', className: 'Barbarian', classSource: 'XPHB', subclassShortName: 'Berserker', subclassName: 'Path of the Berserker', level: 3, entries: ['Extra damage.'] },
    ],
    option: [{ name: 'Agonizing Blast', source: 'XPHB', featureType: ['EI'], entries: ['Add your Charisma.'] }],
    skill: [{ name: 'Stealth', source: 'XPHB', ability: 'dex', entries: ['Escape notice.'] }],
  });
  const lines = index.map((entry) => [entry.kind, entry.name, entry.subtitle]);
  assert.deepEqual(lines, [
    ['option', 'Agonizing Blast', 'Eldritch Invocation'],
    ['classFeature', 'Frenzy', 'Path of the Berserker (Barbarian) 3'],
    ['classFeature', 'Spellcasting', 'Bard 1'],
    ['classFeature', 'Spellcasting', 'Wizard 1'],
    ['skill', 'Stealth', 'Dexterity skill'],
  ]);
  assert.equal(new Set(index.map((entry) => entry.key)).size, index.length, 'no two entries share a key');
});
