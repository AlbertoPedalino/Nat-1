import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildClassSpellIndex,
  buildClassSpellIndexFromSpells,
  loadSpells,
} from '../../../../../src/pages/charbuilder/data/dataLoaders.js';
import { SPELL_FILES } from '../../../../../src/pages/charbuilder/constants.js';

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

test('loading preserves explicit spell printings while the picker uses source priority and cached files', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(url);
    const source = url.endsWith('spells-xphb.json') ? 'XPHB'
      : url.endsWith('spells-frhof.json') ? 'FRHoF' : null;
    return {
      ok: true,
      json: async () => source ? { spell: [{ name: 'Shared Spell', source, level: 2, entries: [source] }] } : {},
    };
  });
  const result = await loadSpells();
  assert.equal(result.spells.length, 1);
  assert.equal(result.spells[0].source, 'XPHB');
  assert.deepEqual(result.spellVersions.map((spell) => spell.source), ['XPHB', 'FRHoF']);
  assert.deepEqual(result.failedFiles, []);
  await loadSpells();
  assert.equal(requests.length, SPELL_FILES.length + 1);
});
