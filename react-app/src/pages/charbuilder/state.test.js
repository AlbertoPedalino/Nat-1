import test from 'node:test';
import assert from 'node:assert/strict';
import { builderReducer, initialBuilderState } from './state.js';
import { countActiveFilterValues } from '../../shared/character/itemFilters.js';

const EQUIPMENT_UI_ACTIONS = [
  { type: 'inventory/filter', filter: 'weapon' },
  { type: 'inventory/current-filter', filter: 'equipped' },
  { type: 'inventory/filters', filters: { type: 'Simple Melee Weapon' } },
  { type: 'inventory/current-filters', filters: { properties: ['Thrown'] } },
  { type: 'search/set', scope: 'inventory', value: 'dagger' },
  { type: 'search/set', scope: 'currentInventory', value: 'rope' },
];

test('the equipment step starts with no filters applied', () => {
  assert.equal(initialBuilderState.inventoryFilter, 'all');
  assert.equal(initialBuilderState.currentInventoryFilter, 'all');
  assert.equal(countActiveFilterValues(initialBuilderState.inventoryFilters), 0);
  assert.equal(countActiveFilterValues(initialBuilderState.currentInventoryFilters), 0);
  assert.equal(initialBuilderState.search.currentInventory, '');
});

test('the two filter sets are independent', () => {
  let state = builderReducer(initialBuilderState, { type: 'inventory/filters', filters: { type: 'Shield' } });
  assert.equal(state.inventoryFilters.type, 'Shield');
  assert.equal(countActiveFilterValues(state.currentInventoryFilters), 0);

  state = builderReducer(state, { type: 'inventory/current-filters', filters: { type: 'Ring' } });
  assert.equal(state.inventoryFilters.type, 'Shield');
  assert.equal(state.currentInventoryFilters.type, 'Ring');
});

test('every equipment list control round-trips', () => {
  const state = EQUIPMENT_UI_ACTIONS.reduce(builderReducer, initialBuilderState);

  assert.equal(state.inventoryFilter, 'weapon');
  assert.equal(state.currentInventoryFilter, 'equipped');
  assert.equal(state.inventoryFilters.type, 'Simple Melee Weapon');
  assert.deepEqual(state.currentInventoryFilters.properties, ['Thrown']);
  assert.equal(state.search.inventory, 'dagger');
  assert.equal(state.search.currentInventory, 'rope');
});

// This is why the list state can live in the reducer at all: `saveCharacter`
// persists `state.character`, so UI state kept beside it never reaches storage.
// If one of these actions ever starts touching the character, it silently
// becomes part of every saved sheet.
test('equipment list UI state never touches the character', () => {
  EQUIPMENT_UI_ACTIONS.forEach((action) => {
    const next = builderReducer(initialBuilderState, action);
    assert.equal(next.character, initialBuilderState.character, `${action.type} rewrote the character`);
  });
});

test('an unknown action leaves the state untouched', () => {
  assert.equal(builderReducer(initialBuilderState, { type: 'nope/does-not-exist' }), initialBuilderState);
});
