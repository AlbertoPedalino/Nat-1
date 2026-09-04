import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildClassSpellIndex,
  buildClassSpellIndexFromSpells,
} from './dataLoaders.js';

test('class spell index includes AU classVariant additions but rejects unsupported books', () => {
  const index = buildClassSpellIndex({
    au: {
      'battle familiar': {
        classVariant: {
          PHB: { Druid: { definedInSources: ['AU'] } },
          XPHB: {
            Druid: { definedInSources: ['AU'] },
            Warlock: { definedInSources: ['AU'] },
            Wizard: { definedInSources: ['AU'] },
          },
        },
      },
      'unsupported expansion': {
        classVariant: {
          XPHB: { Cleric: { definedInSources: ['TCE'] } },
        },
      },
      'core spell': {
        class: { XPHB: { Cleric: true } },
      },
    },
  });

  assert.deepEqual(index.druid, ['battle familiar']);
  assert.deepEqual(index.warlock, ['battle familiar']);
  assert.deepEqual(index.wizard, ['battle familiar']);
  assert.deepEqual(index.cleric, ['core spell']);
});

test('spell metadata fallback includes supported fromClassListVariant entries', () => {
  const index = buildClassSpellIndexFromSpells([
    {
      name: 'Battle Familiar',
      classes: {
        fromClassListVariant: [
          { name: 'Druid', definedInSource: 'AU' },
          { name: 'Cleric', definedInSource: 'TCE' },
        ],
      },
    },
  ]);

  assert.deepEqual(index.druid, ['battle familiar']);
  assert.equal(index.cleric, undefined);
});
