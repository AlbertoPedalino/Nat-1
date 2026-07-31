import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEM_FILTER_CHOICE_FIELDS,
  ITEM_FILTER_FIELDS,
  buildItemFilterOptions,
  countActiveFilterValues,
  emptyItemFilters,
  hasActiveItemFilters,
  itemMatchesFilters,
  rangeFilterKeys,
} from './itemFilters.js';

const dagger = {
  name: 'Dagger',
  type: 'M',
  weaponCategory: 'simple',
  dmg1: '1d4',
  dmgType: 'P',
  property: ['F', 'L', 'T'],
  mastery: ['Nick'],
  range: '20/60',
  weight: 1,
  value: 200,
};

const spear = {
  name: 'Spear',
  type: 'M',
  weaponCategory: 'simple',
  dmg1: '1d6',
  dmgType: 'P',
  property: ['T', 'V'],
  mastery: ['Sap'],
  weight: 2,
  value: 100,
};

const greataxe = {
  name: 'Greataxe',
  type: 'M',
  weaponCategory: 'martial',
  dmg1: '1d12',
  dmgType: 'S',
  property: ['H', '2H'],
  mastery: ['Cleave'],
  weight: 7,
  value: 3000,
};

const rope = { name: 'Rope', type: 'G', weight: 5, value: 100 };

const pool = [dagger, spear, greataxe, rope];

const withFilters = (patch) => ({ ...emptyItemFilters(), ...patch });
const matching = (patch) => pool.filter((item) => itemMatchesFilters(item, withFilters(patch))).map((i) => i.name);

test('empty filters match everything and count as inactive', () => {
  assert.equal(countActiveFilterValues(emptyItemFilters()), 0);
  assert.equal(hasActiveItemFilters(emptyItemFilters()), false);
  assert.deepEqual(matching({}), ['Dagger', 'Spear', 'Greataxe', 'Rope']);
});

test('type filter uses the decoded label shown on the item card', () => {
  assert.deepEqual(matching({ type: 'Simple Melee Weapon' }), ['Dagger', 'Spear']);
  assert.deepEqual(matching({ type: 'Martial Melee Weapon' }), ['Greataxe']);
  assert.deepEqual(matching({ type: 'Adventuring Gear' }), ['Rope']);
});

test('damage and damage type filter on the decoded values', () => {
  assert.deepEqual(matching({ damage: '1d6' }), ['Spear']);
  assert.deepEqual(matching({ damageType: 'piercing' }), ['Dagger', 'Spear']);
  assert.deepEqual(matching({ damageType: 'slashing' }), ['Greataxe']);
});

test('multiple properties narrow instead of widening', () => {
  assert.deepEqual(matching({ properties: ['Thrown'] }), ['Dagger', 'Spear']);
  assert.deepEqual(matching({ properties: ['Thrown', 'Light'] }), ['Dagger']);
  assert.deepEqual(matching({ properties: ['Thrown', 'Heavy'] }), []);
});

test('mastery matches any of the item masteries', () => {
  assert.deepEqual(matching({ mastery: 'Nick' }), ['Dagger']);
  assert.deepEqual(matching({ mastery: 'Cleave' }), ['Greataxe']);
});

test('weight and value are inclusive ranges, with blanks left open', () => {
  assert.deepEqual(matching({ weightMax: '2' }), ['Dagger', 'Spear']);
  assert.deepEqual(matching({ weightMin: '5' }), ['Greataxe', 'Rope']);
  assert.deepEqual(matching({ weightMin: '2', weightMax: '5' }), ['Spear', 'Rope']);
  // value is stored in copper; the filter speaks gp.
  assert.deepEqual(matching({ valueMin: '2' }), ['Dagger', 'Greataxe']);
  assert.deepEqual(matching({ valueMax: '1' }), ['Spear', 'Rope']);
});

test('a missing weight or value counts as zero', () => {
  const weightless = { name: 'Note', type: 'G' };
  assert.equal(itemMatchesFilters(weightless, withFilters({ weightMax: '1' })), true);
  assert.equal(itemMatchesFilters(weightless, withFilters({ weightMin: '1' })), false);
  assert.equal(itemMatchesFilters(weightless, withFilters({ valueMax: '1' })), true);
});

test('filters combine as AND across fields', () => {
  assert.deepEqual(matching({ type: 'Simple Melee Weapon', properties: ['Thrown'], weightMax: '1' }), ['Dagger']);
  assert.deepEqual(matching({ type: 'Simple Melee Weapon', damage: '1d12' }), []);
});

test('active filter count tallies every set field', () => {
  assert.equal(countActiveFilterValues(withFilters({ type: 'Simple Melee Weapon' })), 1);
  assert.equal(countActiveFilterValues(withFilters({ properties: ['Thrown', 'Light'] })), 2);
  assert.equal(countActiveFilterValues(withFilters({ weightMin: '0', weightMax: '5' })), 2);
  assert.equal(hasActiveItemFilters(withFilters({ mastery: 'Nick' })), true);
});

test('options come from the pool, deduped and ordered', () => {
  const options = buildItemFilterOptions(pool);
  assert.deepEqual(options.type, ['Adventuring Gear', 'Martial Melee Weapon', 'Simple Melee Weapon']);
  assert.deepEqual(options.damage, ['1d4', '1d6', '1d12']);
  assert.deepEqual(options.damageType, ['piercing', 'slashing']);
  assert.deepEqual(options.properties, ['Finesse', 'Heavy', 'Light', 'Thrown', 'Two-Handed', 'Versatile']);
  assert.deepEqual(options.mastery, ['Cleave', 'Nick', 'Sap']);
});

test('options of an empty pool are empty, not undefined', () => {
  const options = buildItemFilterOptions([]);
  assert.deepEqual(options.type, []);
  assert.deepEqual(options.mastery, []);
});

// The registry exists so a new filter cannot be half-wired — counted but never
// matched, or offered in a dropdown but absent from the empty state. These
// tests fail on any field that skips one of those wirings.
test('every field is wired into the empty state', () => {
  const empty = emptyItemFilters();
  ITEM_FILTER_FIELDS.forEach((field) => {
    if (field.kind === 'range') {
      rangeFilterKeys(field).forEach((key) => assert.equal(empty[key], '', `${key} missing`));
      return;
    }
    const value = empty[field.key];
    if (field.kind === 'multiSelect') assert.deepEqual(value, [], `${field.key} missing`);
    else assert.equal(value, '', `${field.key} missing`);
  });
  assert.equal(countActiveFilterValues(empty), 0);
});

test('every field is both counted and matched', () => {
  const anything = { name: 'X', type: 'M', weaponCategory: 'simple', dmg1: '1d4', dmgType: 'P', property: ['F'], mastery: ['Nick'], weight: 1, value: 100 };

  ITEM_FILTER_FIELDS.forEach((field) => {
    // A value this item cannot possibly carry must both count and exclude it.
    const patch = field.kind === 'range'
      ? { [rangeFilterKeys(field)[0]]: '9999' }
      : { [field.key]: field.kind === 'multiSelect' ? ['__nope__'] : '__nope__' };
    const filters = { ...emptyItemFilters(), ...patch };

    assert.equal(countActiveFilterValues(filters), 1, `${field.key} is not counted`);
    assert.equal(itemMatchesFilters(anything, filters), false, `${field.key} does not filter`);
  });
});

test('every choice field produces an options bucket', () => {
  const options = buildItemFilterOptions([{ name: 'X', type: 'M' }]);
  ITEM_FILTER_CHOICE_FIELDS.forEach((field) => {
    assert.ok(Array.isArray(options[field.key]), `${field.key} has no options bucket`);
  });
});

test('two filter sets never share state', () => {
  const a = emptyItemFilters();
  const b = emptyItemFilters();
  assert.notEqual(a.properties, b.properties);
  a.properties.push('Thrown');
  assert.deepEqual(b.properties, []);
});
