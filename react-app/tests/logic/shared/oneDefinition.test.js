import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFilesMatching } from '../sourceScan.js';

// Rules the app computes in exactly one place. A copy elsewhere drifts: the
// inline proficiency bonus, for one, missed the bonus magic items grant.

test('the proficiency bonus is read only through getProficiencyBonus', () => {
  assert.deepEqual(sourceFilesMatching(/\/\s*4\s*\)\s*\+\s*2\b/, {
    allow: ['shared/character/progression/proficiency.js'],
  }), []);
});

test('the ability modifier is computed only in abilityModifier.js', () => {
  assert.deepEqual(sourceFilesMatching(/-\s*10\s*\)\s*\/\s*2\b/, {
    allow: ['shared/character/progression/abilityModifier.js'],
  }), []);
});

test('a signed modifier is written only by numberFormat.js', () => {
  assert.deepEqual(sourceFilesMatching(/>=?\s*0\s*\?\s*(['"]\+['"]\s*:\s*['"]['"]|`\+\$\{)/, {
    allow: ['shared/ui/numberFormat.js'],
  }), []);
});

test('clamp, clampInt and numberOr are defined only in shared/numbers.js', () => {
  assert.deepEqual(sourceFilesMatching(/(function|const)\s+(clamp|clampInt|numberOr)\b/, {
    allow: ['shared/numbers.js'],
  }), []);
});

// One name, one meaning: a comparison key is matchKey, lowerKey, stripSource
// or choiceKey from nameKeys.js, never a local `norm`/`compact` whose meaning
// depends on the file.
test('name keys come from shared/content/nameKeys.js, no local norm helpers', () => {
  assert.deepEqual(sourceFilesMatching(/(function\s+(norm|compact|matchKey|lowerKey|stripSource|choiceText|choiceKey)\s*\(|const\s+(norm|compact|matchKey|lowerKey|stripSource|choiceText|choiceKey)\s*=\s*(\([^)]*\)|\w+)\s*=>)/, {
    allow: ['shared/content/nameKeys.js'],
  }), []);
});

test('asArray and flattenList are defined only in shared/lists.js', () => {
  assert.deepEqual(sourceFilesMatching(/(function|const)\s+(asArray|flattenList)\b/, {
    allow: ['shared/lists.js'],
  }), []);
});

test('pages reach Supabase only through shared/cloud', () => {
  assert.deepEqual(sourceFilesMatching(/supabaseClient\.js['"]/)
    .filter((file) => file.startsWith('pages/') || file.startsWith('app/')), []);
});

test('a character file is downloaded only by downloadCharacterExport', () => {
  assert.deepEqual(sourceFilesMatching(/\.download\s*=/, {
    allow: ['pages/charbuilder/state/characterExport.js'],
  }), []);
});

// Preferences and small caches use the forgiving functions (a blocked storage
// only forgets); the data stores write with the strict ones, which throw so a
// write that did not fit is rolled back.
test('localStorage is touched only by storage.js', () => {
  assert.deepEqual(sourceFilesMatching(/localStorage\.(getItem|setItem|removeItem|key)\(/, {
    allow: ['shared/storage/storage.js'],
  }), []);
});

test('every realtime channel opens through openRealtimeChannel', () => {
  assert.deepEqual(sourceFilesMatching(/\.(channel|removeChannel)\(/, {
    allow: ['shared/cloud/realtimeChannel.js'],
  }), []);
});
