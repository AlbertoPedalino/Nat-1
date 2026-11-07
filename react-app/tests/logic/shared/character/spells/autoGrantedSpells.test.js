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
