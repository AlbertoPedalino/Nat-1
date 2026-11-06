import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFilesMatching, sourceLinesMatching } from '../sourceScan.js';

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

test('a lowercase-alphanumeric key is made only by matchKey, never inline or under another name', () => {
  assert.deepEqual(sourceFilesMatching(
    /toLowerCase\(\)\s*\.replace\(\/\[\^a-z0-9\]\+?\/g,\s*(''|"")\)|(function\s+\w+\((\w+)\)\s*\{\s*return matchKey\(\3\);\s*\}|const\s+\w+\s*=\s*\(?(\w+)\)?\s*=>\s*matchKey\(\4\);)/,
    { allow: ['shared/content/nameKeys.js'] },
  ), []);
});

// A 5etools reference loses its source through stripSource. The {@tag text|…}
// parsers split a tag's arguments (their first part is the text to show), and
// multi-step text cleaners split as one step of their chain, on its own line.
test('a name without its source comes from stripSource', () => {
  assert.deepEqual(sourceFilesMatching(
    /String\([^\n]*\)\s*(\.toUpperCase\(\))?\.split\(['"]\|['"]\)\[0\]|[\w$\]]\.split\(['"]\|['"]\)\[0\]/,
    { allow: [
      'shared/content/nameKeys.js',
      'pages/encounterbuilder/bestiary/markup.js',
      'shared/character/forms/beasts.js',
      'shared/character/spells/spellEntries.js',
      'pages/charbuilder/choices/choiceSpecs.js',
    ] },
  ), []);
});

test('capitalizing is done only by shared/ui/textCase.js', () => {
  assert.deepEqual(sourceFilesMatching(
    /charAt\(0\)\.toUpperCase\(\)\s*\+|\.replace\(\/(\^|\\b)\\w\/g?,\s*(\(c\)|c|function\s*\(c\))\s*(=>|\{)|function\s+(capitalize|titleCase)\s*\(|const\s+(capitalize|titleCase)\s*=/,
    { allow: ['shared/ui/textCase.js'] },
  ), []);
});

test('new ids are made only by makeId in shared/ids.js', () => {
  assert.deepEqual(sourceFilesMatching(/Math\.random\(\)\.toString\(36\)|randomUUID/, {
    allow: ['shared/ids.js'],
  }), []);
});

// The interface is English: numbers and dates go through the en-US
// formatters, never the browser's locale.
test('numbers and dates are formatted only by numberFormat.js and dateFormat.js', () => {
  assert.deepEqual(sourceFilesMatching(/\.toLocale(Date|Time)?String\(/, {
    allow: ['shared/ui/numberFormat.js', 'shared/ui/dateFormat.js'],
  }), []);
});

// The interface is English. A quoted string with a typically Italian word
// is a leftover (the encounter reducer still recognizes old "Giocatore N"
// placeholders in a regular expression, not a string).
test('no Italian text in interface strings', () => {
  assert.deepEqual(sourceLinesMatching(
    /['"`][^'"`\n]*\b(Metà|Giocatore|[Pp]ersonaggi[oa]?|Eliminare|Sovrascrivere|scheda|Carica|riconosciuto|Scegli|Annulla|Conferma|Salvare|dardi|danno su)\b/,
  ), []);
});

// Data field names are English too. Only the legacy board import reads the
// old Italian names, as its input format.
test('no Italian data field names in code', () => {
  assert.deepEqual(sourceLinesMatching(
    /\b(meteo|tipo|danno|rarita|qualita|valore|gravita|pioggia)\b/,
    { allow: ['pages/gmboard/state/migration.js'] },
  ), []);
});

test('every confirmation goes through confirmAction', () => {
  assert.deepEqual(sourceFilesMatching(/window\.confirm\(/, { allow: ['shared/ui/confirmAction.js'] }), []);
});

test('deep copies use structuredClone', () => {
  assert.deepEqual(sourceFilesMatching(/JSON\.parse\(JSON\.stringify\(/), []);
});

// Styling goes through sx; inline style stays only on lucide icons, which are
// not MUI components.
test('no inline style on HTML elements', () => {
  assert.deepEqual(sourceFilesMatching(/<(span|div|b|i|p|a|img|input|button|label|section|ul|li)\b[^>]*\sstyle=\{\{/), []);
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
