import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isExcludedByVariant,
  matchesItemRequirements,
  resolveCopyRecords,
} from './itemVariants.js';

test('resolveCopyRecords resolves chained 5etools copies and nested modifications', () => {
  const records = [
    { name: 'Base', source: 'XDMG', rarity: 'uncommon', property: ['A'], inherits: { entries: ['base'], source: 'XDMG' } },
    {
      name: 'Middle',
      source: 'AU',
      _copy: {
        name: 'Base',
        source: 'XDMG',
        _mod: {
          property: { mode: 'appendIfNotExistsArr', items: ['A', 'Evo|AU'] },
          'inherits.entries': { mode: 'appendArr', items: 'middle' },
          'inherits.source': { mode: 'setProp', value: 'AU' },
        },
      },
      rarity: 'rare',
    },
    {
      name: 'Final',
      source: 'AU',
      _copy: {
        name: 'Middle',
        source: 'AU',
        _mod: {
          'inherits.entries': { mode: 'appendArr', items: ['final'] },
          property: 'remove',
        },
      },
      rarity: 'legendary',
    },
  ];

  const [, middle, final] = resolveCopyRecords(records);
  assert.deepEqual(middle.property, ['A', 'Evo|AU']);
  assert.deepEqual(middle.inherits.entries, ['base', 'middle']);
  assert.equal(middle.inherits.source, 'AU');
  assert.equal(final.rarity, 'legendary');
  assert.deepEqual(final.inherits.entries, ['base', 'middle', 'final']);
  assert.equal('property' in final, false);
  assert.equal('_copy' in final, false);
});

test('variant requirements honor weapon category and required properties', () => {
  const requirements = [{ weaponCategory: 'martial', property: 'F|XPHB' }];
  assert.equal(matchesItemRequirements({ type: 'M', weaponCategory: 'martial', property: ['F|XPHB'] }, requirements), true);
  assert.equal(matchesItemRequirements({ type: 'M', weaponCategory: 'martial', property: ['H|XPHB'] }, requirements), false);
  assert.equal(matchesItemRequirements({ type: 'M', weaponCategory: 'simple', property: ['F|XPHB'] }, requirements), false);
});

test('variant excludes reject matching concrete bases only', () => {
  const excludes = [{ name: 'Longsword', source: 'XPHB' }];
  assert.equal(isExcludedByVariant({ name: 'Longsword', source: 'XPHB', type: 'M' }, excludes), true);
  assert.equal(isExcludedByVariant({ name: 'Rapier', source: 'XPHB', type: 'M' }, excludes), false);
});
