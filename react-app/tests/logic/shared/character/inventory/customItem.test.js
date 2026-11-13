import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOM_ITEM_KINDS, customItemDraft, customItemRecord, isCustomItemDraftReady, withCustomItemEdited,
} from '../../../../../src/shared/character/inventory/customItem.js';
import { decodeItemTypeLabel } from '../../../../../src/shared/character/inventory/itemCodes.js';
import { isMagicItem } from '../../../../../src/shared/character/inventory/itemRarity.js';

const draft = (patch) => ({ ...customItemDraft(), ...patch });

test('a made-up item is a 5etools record: type code, copper, lb, entries', () => {
  const ruby = customItemRecord(draft({
    name: ' Ruby ', kind: '$G', rarity: 'none', weight: '0,1', value: '500', unit: 'gp', description: 'Deep red.\n\nFlawless.',
  }));
  assert.deepEqual(ruby, {
    name: 'Ruby', source: 'Custom', custom: true, type: '$G', rarity: 'none', weight: 0.1, value: 50000, entries: ['Deep red.', 'Flawless.'],
  });
  assert.equal(decodeItemTypeLabel(ruby), 'Gemstone');
  assert.equal(isMagicItem(ruby), false);
});

test('a price is typed in any coin', () => {
  assert.equal(customItemRecord(draft({ name: 'Bread', value: '2', unit: 'cp' })).value, 2);
  assert.equal(customItemRecord(draft({ name: 'Silk', value: '1.5', unit: 'sp' })).value, 15);
  assert.equal(customItemRecord(draft({ name: 'Crown', value: '3', unit: 'pp' })).value, 3000);
});

test('a rarity makes it magic; every kind has a label', () => {
  assert.equal(isMagicItem(customItemRecord(draft({ name: 'Charm', kind: 'WI', rarity: 'uncommon' }))), true);
  CUSTOM_ITEM_KINDS.forEach((kind) => assert.ok(kind.label, kind.key));
});

test('an item reads back into the form, its price in the largest whole coin', () => {
  const back = customItemDraft({ name: 'Silk', type: 'TG', rarity: 'none', weight: 1, value: 50, entries: ['Fine.'] });
  assert.deepEqual(back, {
    name: 'Silk', kind: 'TG', rarity: 'none', qty: 1, weight: '1', value: '5', unit: 'sp', description: 'Fine.',
  });
  assert.equal(customItemDraft({ name: 'Old', type: 'gear' }).kind, 'G');
});

test('it needs a name', () => {
  assert.equal(isCustomItemDraftReady(draft({ name: '  ' })), false);
  assert.equal(isCustomItemDraftReady(draft({ name: 'Gem' })), true);
});

test('an edit keeps where the item is and how many; a cleared description goes', () => {
  const entry = { name: 'Gem', custom: true, type: '$G', qty: 3, carried: false, entries: ['Old.'] };
  const edited = withCustomItemEdited(entry, customItemRecord(draft({ name: 'Big Gem', kind: '$G' }), entry));
  assert.equal(edited.qty, 3);
  assert.equal(edited.carried, false);
  assert.equal(edited.name, 'Big Gem');
  assert.equal('entries' in edited, false);
});

test('a description richer than text stays while the field is empty', () => {
  const table = { type: 'table', rows: [] };
  const previous = { name: 'Map', entries: ['Old', table] };
  assert.deepEqual(customItemRecord(draft({ name: 'Map', description: '' }), previous).entries, ['Old', table]);
  assert.deepEqual(customItemRecord(draft({ name: 'Map', description: 'New' }), previous).entries, ['New']);
});
