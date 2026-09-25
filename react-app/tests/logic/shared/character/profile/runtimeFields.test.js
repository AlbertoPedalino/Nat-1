import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUNTIME_ONLY_CHARACTER_FIELDS,
  stripRuntimeOnlyCharacterFields,
  withRuntimeOnlyCharacterFields,
} from '../../../../../src/shared/character/profile/runtimeFields.js';
import { initialBuilderState } from '../../../../../src/pages/charbuilder/state/state.js';
import { buildSheetCharacter } from '../../../../../src/pages/charbuilder/state/persistence.js';
import { serializeCharacterForExport } from '../../../../../src/pages/charbuilder/state/characterExport.js';

const CATALOG = [{ name: 'Agonizing Blast', source: 'XPHB', featureType: ['EI'], entries: ['rule text'] }];

test('the optional-feature catalog is the runtime-only field', () => {
  assert.deepEqual([...RUNTIME_ONLY_CHARACTER_FIELDS], ['optionalFeatureEntries']);
  assert.ok(Object.isFrozen(RUNTIME_ONLY_CHARACTER_FIELDS));
});

test('strip removes runtime-only fields and nothing else, without mutating', () => {
  const character = { name: 'W', choices: { invocations: ['Agonizing Blast'] }, optionalFeatureEntries: CATALOG };
  const stored = stripRuntimeOnlyCharacterFields(character);
  assert.deepEqual(stored, { name: 'W', choices: { invocations: ['Agonizing Blast'] } });
  assert.equal(character.optionalFeatureEntries, CATALOG, 'the open sheet keeps its copy');
  const clean = { name: 'W' };
  assert.equal(stripRuntimeOnlyCharacterFields(clean), clean, 'nothing to strip: same object');
  assert.equal(stripRuntimeOnlyCharacterFields(null), null);
  assert.deepEqual(stripRuntimeOnlyCharacterFields([1]), [1]);
});

test('a stored character back in memory keeps the runtime fields the sheet already had', () => {
  const stored = { name: 'W', notes: 'new' };
  assert.deepEqual(withRuntimeOnlyCharacterFields(stored, { name: 'W', optionalFeatureEntries: CATALOG }),
    { name: 'W', notes: 'new', optionalFeatureEntries: CATALOG });
  assert.equal(withRuntimeOnlyCharacterFields(stored, { name: 'W' }), stored);
  assert.equal(withRuntimeOnlyCharacterFields(stored, null), stored);
});

test('a builder save never keeps the catalog from the previous row', () => {
  const previous = { currentHP: 12, notes: 'kept', optionalFeatureEntries: CATALOG };
  const unified = buildSheetCharacter(initialBuilderState.character, initialBuilderState.data, previous);
  assert.equal(Object.hasOwn(unified, 'optionalFeatureEntries'), false);
  assert.equal(unified.notes, 'kept', 'other sheet-only fields still survive a builder save');
  assert.equal(unified.currentHP, 12);
  const fromBuilderState = buildSheetCharacter({ ...initialBuilderState.character, optionalFeatureEntries: CATALOG }, initialBuilderState.data);
  assert.equal(Object.hasOwn(fromBuilderState, 'optionalFeatureEntries'), false);
});

test('export is unchanged: it never carried the catalog', () => {
  const out = serializeCharacterForExport({ name: 'W', notes: 'n', choices: {}, optionalFeatureEntries: CATALOG });
  assert.deepEqual(out, { name: 'W', notes: 'n', choices: {} });
});
