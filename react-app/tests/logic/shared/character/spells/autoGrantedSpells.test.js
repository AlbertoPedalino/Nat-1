import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installRuntimeConfig from '../../../../../src/adapters/classes/runtime-config.js';
import { enumerateAutoGrantedSpells } from '../../../../../src/shared/character/spells/autoGrantedSpells.js';
import { classEntities } from '../../../../../src/shared/character/progression/classLevel.js';

installRuntimeConfig(adapterRegistry);

test('class entities carry each class entry\'s subclass features for the spell scrape', () => {
  const C = {
    className: 'Druid', level: 4, classLevel: 3, allSubFeatures: [{ name: 'A' }],
    extraClasses: [{ name: 'Cleric', level: 1, subclassShortName: 'Life', allSubFeatures: [{ name: 'B' }] }],
  };
  assert.deepEqual(classEntities(C).map((entity) => entity.allSubFeatures), [[{ name: 'A' }], [{ name: 'B' }]]);
});

test('every class entry\'s granted spells are listed, a multiclass one included', () => {
  const C = {
    className: 'Wizard', classLevel: 1, level: 2,
    extraClasses: [{ name: 'Druid', level: 1 }],
  };
  const names = enumerateAutoGrantedSpells(C).map((record) => record.name);
  assert.ok(names.includes('Speak with Animals'));
});

test('a species spell is labelled by the trait that grants it', async () => {
  const { enumerateSpeciesGrants } = await import('../../../../../src/shared/character/spells/autoGrantedSpells.js');
  const C = {
    level: 1, speciesName: 'Aasimar',
    speciesSnapshot: {
      name: 'Aasimar',
      additionalSpells: [{ ability: 'cha', known: { 1: ['light|xphb#c'] } }],
      entries: [{ type: 'entries', name: 'Light Bearer', entries: ['You know the {@spell Light|XPHB} cantrip.'] }],
    },
  };
  assert.deepEqual(enumerateSpeciesGrants(C).map((record) => record.explicitSource), ['Light Bearer']);
});

test('the builder spell panel lists the subclass data spells at their level', async () => {
  const { collectAutoGrantedSpells } = await import('../../../../../src/pages/charbuilder/spells/spells.js');
  const subclass = { shortName: 'Elements', additionalSpells: [{ known: { 6: ['elementalism|xphb#c'] } }] };
  const names = (level) => collectAutoGrantedSpells({
    className: 'Barbarian', classLevel: level, level, subclassShortName: 'Elements', subclasses: [subclass], choices: {},
  }).map((spell) => spell.name);
  assert.deepEqual(names(5), []);
  assert.deepEqual(names(6), ['elementalism']);
});
