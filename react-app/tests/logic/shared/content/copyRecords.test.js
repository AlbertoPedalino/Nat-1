import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCopyRecords } from '../../../../src/shared/content/copyRecords.js';

// One resolver for every 5etools `_copy`: the reprint keeps its own fields and
// source, takes the copied record's rules and applies its `_mod`s.
const dwarf = {
  name: 'Dwarf', source: 'XPHB', page: 186, darkvision: 120,
  entries: [{ name: 'Darkvision', entries: ['a'] }, { name: 'Stonecunning', entries: ['b'] }],
  _versions: [{ name: 'Dwarf; Test' }],
};

test('a reprint keeps its own source and page, not its lineages unless preserved', () => {
  const [copy] = resolveCopyRecords([{ name: 'Dwarf', source: 'WoW', page: 79, _copy: { name: 'Dwarf', source: 'XPHB' } }], { pool: [dwarf] });
  assert.equal(copy.source, 'WoW');
  assert.equal(copy.page, 79);
  assert.equal(copy.darkvision, 120);
  assert.equal(copy._versions, undefined);
  assert.equal(copy._copy, undefined);
});

test('array mods target entries by name, and text can be replaced', () => {
  const [copy] = resolveCopyRecords([{
    name: 'Dwarf', source: 'WoW',
    _copy: {
      name: 'Dwarf', source: 'XPHB',
      _mod: {
        entries: [
          { mode: 'replaceArr', replace: 'Stonecunning', items: { name: 'Earthen', entries: ['c'] } },
          { mode: 'replaceTxt', replace: 'a', with: 'z' },
        ],
      },
    },
  }], { pool: [dwarf] });
  assert.deepEqual(copy.entries.map((entry) => entry.name), ['Darkvision', 'Earthen']);
  assert.deepEqual(copy.entries[0].entries, ['z']);
});

test('removeArr drops entries by name', () => {
  const [copy] = resolveCopyRecords([{
    name: 'Dwarf', source: 'WoW',
    _copy: { name: 'Dwarf', source: 'XPHB', _mod: { entries: { mode: 'removeArr', names: 'Darkvision' } } },
  }], { pool: [dwarf] });
  assert.deepEqual(copy.entries.map((entry) => entry.name), ['Stonecunning']);
});

test('a copy is found by a custom key (subclasses name their class)', () => {
  const keyOf = (r) => `${r.shortName}|${r.className}|${r.classSource}`;
  const copyKeyOf = (c) => `${c.shortName}|${c.className}|${c.classSource}`;
  const base = { name: 'Path of the Berserker', shortName: 'Berserker', className: 'Barbarian', classSource: 'XPHB', source: 'XPHB', subclassFeatures: ['x'] };
  const [copy] = resolveCopyRecords([{
    name: 'Path of the Berserker', shortName: 'Berserker', className: 'Shaman', classSource: 'WoW', source: 'WoW',
    _copy: { shortName: 'Berserker', className: 'Barbarian', classSource: 'XPHB' },
  }], { pool: [base], keyOf, copyKeyOf });
  assert.equal(copy.className, 'Shaman');
  assert.deepEqual(copy.subclassFeatures, ['x']);
});
