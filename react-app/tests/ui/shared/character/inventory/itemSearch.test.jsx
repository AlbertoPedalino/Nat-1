import { expect, test } from 'vitest';
import { compareItemsBySearch, itemMatchesSearch } from '../../../../../src/shared/character/inventory/itemSearch.js';

test('every word of the query must appear in the item, punctuation and case ignored', () => {
  const item = { name: 'Longsword +1', source: 'XDMG', type: 'M', rarity: 'uncommon', property: ['V'] };
  expect(itemMatchesSearch(item, 'longsword')).toBe(true);
  expect(itemMatchesSearch(item, 'LONG  uncommon')).toBe(true);
  expect(itemMatchesSearch(item, 'longsword rare')).toBe(false);
  expect(itemMatchesSearch(item, '')).toBe(true);
});

test('an exact name comes first, then names starting with the query, then those containing it', () => {
  const names = ['Moon-Touched Sword', 'Sword of Wounding', 'Sword', 'Shortsword']
    .map((name) => ({ name, source: 'XDMG', rarity: 'rare' }));
  expect(names.sort(compareItemsBySearch('sword')).map((item) => item.name))
    .toEqual(['Sword', 'Sword of Wounding', 'Moon-Touched Sword', 'Shortsword']);
});

test('without a query, common items come before rarer ones', () => {
  const items = [{ name: 'B', rarity: 'rare' }, { name: 'A', rarity: 'common' }];
  expect(items.sort(compareItemsBySearch('')).map((item) => item.name)).toEqual(['A', 'B']);
});
