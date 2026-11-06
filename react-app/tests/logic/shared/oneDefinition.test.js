import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFilesMatching, sourceLinesMatching } from '../sourceScan.js';

// Rules the app computes in exactly one place. A copy elsewhere drifts: the
// inline proficiency bonus, for one, missed the bonus magic items grant.

test('the proficiency bonus is read only through getProficiencyBonus', () => {
  assert.deepEqual(sourceFilesMatching(/\/\s*4\s*\)\s*\+\s*2\b|\[\s*null\s*,\s*2\s*,\s*2\s*,\s*2\s*,\s*2\s*,\s*3\b/, {
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
      'shared/bestiary/markup.js',
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
    /['"`][^'"`\n]*\b(Metà|Giocatore|[Pp]ersonaggi[oa]?|Eliminare|Sovrascrivere|scheda|Carica|riconosciuto|Scegli|Annulla|Conferma|Salvare|dardi|danno su|[Nn]ome|annullat[oa]|salvataggio)\b/,
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

test('every text prompt goes through promptText', () => {
  assert.deepEqual(sourceFilesMatching(/\bprompt\(/, { allow: ['shared/ui/promptText.js'] }), []);
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

// Interface colours come from shared/ui/colors.js (UI_COLORS, uiAlpha) and the
// battle map's from shared/vtt/colors.js; the theme is built from them.
// Literal colours remain only where they are data: selectable palettes,
// stored tones, map cell/marker colours, rendered die pixels, adapter cards.
test('no literal colours outside the palettes and colour data', () => {
  const DATA = [
    'shared/ui/colors.js', 'shared/vtt/colors.js', 'app/theme.js', 'shared/ui/entityColors.js',
    'pages/charsheet/spells/spellSourceDisplay.js', 'shared/character/inventory/currency.js',
    'shared/ui/IconColorPicker.jsx', 'shared/ui/ColorField.jsx', 'shared/vtt/scene/imageFilters.js',
    'pages/encounterbuilder/state/constants.js', 'shared/encounter/combatLabels.js', 'shared/hexcrawl/hexCell.js', 'shared/dungeon/roomMarkers.js',
    'shared/character/dice/D100Orb.jsx', 'shared/character/dice/Die3D.jsx', 'shared/vtt/tokens/encounterImport.js',
  ];
  assert.deepEqual(sourceLinesMatching(/['"`]#[0-9a-fA-F]{3,8}['"`]|rgba?\(\s*\d/, { allow: DATA })
    .filter((hit) => !hit.startsWith('adapters/') && !hit.startsWith('data/')), []);
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
    allow: ['shared/character/profile/characterExport.js'],
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

test('5etools data is downloaded only through loadGameData', () => {
  assert.deepEqual(sourceFilesMatching(/raw\.githubusercontent\.com|5etools-mirror/, {
    allow: ['shared/content/gameData.js'],
  }).filter((file) => !file.startsWith('data/')), []);
});

test('font stacks come from UI_FONTS', () => {
  assert.deepEqual(sourceLinesMatching(/Cinzel|Garamond|Georgia|JetBrains|monospace/, {
    allow: ['shared/ui/fonts.js'],
  }).filter((hit) => !hit.startsWith('data/')), []);
});

test('panel title bars are PanelHeader (or SheetDialog, built on its bar)', () => {
  assert.deepEqual(sourceFilesMatching(/headerBg[^\n]*borderLeft: 3|borderLeft: 3[^\n]*headerBg/, {
    allow: ['shared/ui/PanelHeader.jsx'],
  }), []);
});

// A component or hook listens to the DOM through useEventListener. The files
// left are not straight equivalents: listeners added for the length of a
// gesture (ResourceBar, PiecePreview, the resize hint in TokenSprite), plain
// modules (recoveryTriggers, gestureSelection, reminderHistory), and effects
// whose listeners share a closure or a lifecycle with other work in the same
// effect (render loops, realtime channels, store subscriptions, cancellable
// refreshes, the projector link, the pinch guards).
test('DOM listeners in components and hooks go through useEventListener', () => {
  assert.deepEqual(sourceFilesMatching(/addEventListener/, {
    allow: [
      'shared/ui/useEventListener.js',
      'pages/charsheet/resources/ResourceBar.jsx',
      'pages/vtt/tokens/PiecePreview.jsx',
      'pages/vtt/tokens/TokenSprite.jsx',
      'shared/cloud/sync/recoveryTriggers.js',
      'shared/vtt/map/gestureSelection.js',
      'shared/character/combat/reminderHistory.js',
      'pages/vtt/atmosphere/AtmosphereOverlay.jsx',
      'pages/vtt/map/AreaEffectsCanvas.jsx',
      'pages/vtt/map/usePinchZoom.js',
      'pages/vtt/scene/useProjector.js',
      'pages/vtt/VttPage.jsx',
      'pages/vtt/dungeon/useSceneDungeon.js',
      'shared/hexcrawl/useBoardCampaign.js',
      'shared/cloud/sync/CloudAutoSync.jsx',
      'shared/cloud/sync/useCharacterDigests.js',
      'shared/cloud/sync/useCharacterSheetRevision.js',
      'pages/encounterbuilder/sync/useExternalFightSync.js',
      'pages/vtt/tokens/EncounterImportDialog.jsx',
    ],
  }), []);
});

test('a wizard spellbook is normalized only by shared/character/spells/wizardBook.js', () => {
  assert.deepEqual(sourceFilesMatching(/function\s+normalizeWizardBook\b/, {
    allow: ['shared/character/spells/wizardBook.js'],
  }), []);
});

// Ability scores are computed from the character's choices every time, never
// stored: a saved copy went stale (no items, Tomes or Wild Shape) and the
// sheet's own background bonus ignored the +1/+1/+1 pattern.
test('ability scores are computed only by shared/character/progression/abilityScores.js', () => {
  assert.deepEqual(sourceFilesMatching(/\bfinalScores\b|getFinalAbilityScore\(|backgroundAbilities\.indexOf\(/, {
    allow: ['shared/character/progression/abilityScores.js', 'shared/character/inventory/itemEffects.js'],
  }), []);
});

// MUI 9's Grid sizes its items with `size`; the old `item xs={…}` props are
// ignored without a warning, leaving the column unsized.
test('Grid items are sized with size, never the removed item/xs props', () => {
  assert.deepEqual(sourceLinesMatching(/<Grid\b[^>]*\s(item|xs=|sm=|md=|lg=|xl=)/), []);
});

// One table of stat block words for every renderer (monsters, beasts, spells):
// three copies had drifted, printing "m +5" or "con" for 2024 lead-ins.
test('stat block label words come only from shared/content/statBlockTags.js', () => {
  assert.deepEqual(sourceFilesMatching(/['"`](Hit or Miss|Melee Attack Roll|Ranged Attack Roll|Failure or Success):?/, {
    allow: ['shared/content/statBlockTags.js'],
  }), []);
});

// The ability vocabulary (keys, STR-style abbreviations, full names) is written
// once; sixteen local copies of the key list had grown under five names.
test('ability keys, abbreviations and names come from shared/content/rulesVocabulary.js', () => {
  assert.deepEqual(sourceFilesMatching(
    /['"]str['"],\s*['"]dex['"],\s*['"]con['"],\s*['"]int['"]|\bstr:\s*['"](STR|Strength)['"]|['"]Strength['"],\s*['"]Dexterity['"]|strength:\s*['"](STR|str)['"]/,
    { allow: ['shared/content/rulesVocabulary.js'] },
  ), []);
});

// Skills, tools and languages are listed once; the sheet had its own skill
// table in another order and shape, the builder its own tool lists, and the
// choice reader a language list missing Common Sign Language.
test('skill, tool and language lists come from shared/content/rulesVocabulary.js', () => {
  assert.deepEqual(sourceFilesMatching(
    /['"]Animal Handling['"],\s*['"]Arcana['"]|\{ n: ['"]Acrobatics['"]|["']Alchemist's Supplies["'],\s*["']Brewer's Supplies["']|['"]Bagpipes['"],\s*['"]Drum['"]|['"]Dwarvish['"],\s*['"]Elvish['"]/,
    { allow: ['shared/content/rulesVocabulary.js'] },
  ), []);
});

// Sizes, spell schools, damage types and creature types: one table each.
test('size, school, damage and creature type tables come from shared/content/rulesVocabulary.js', () => {
  assert.deepEqual(sourceFilesMatching(
    /\bT:\s*['"]Tiny['"]|\bA:\s*['"]Abjuration['"]|['"]Abjuration['"],\s*['"]Conjuration['"]|\bA:\s*['"]acid['"]|\bA:\s*['"]Acid['"]|['"]Acid['"],\s*['"]Bludgeoning['"]|['"]Aberration['"],\s*['"]Beast['"]|['"]aberration['"],\s*\n?\s*['"]beast['"]/i,
    { allow: ['shared/content/rulesVocabulary.js'] },
  ), []);
});

// A Challenge Rating is read and written by shared/bestiary/challengeRating.js:
// three helpers in three folders did the same parsing.
test('challenge ratings are parsed only by shared/bestiary/challengeRating.js', () => {
  assert.deepEqual(sourceFilesMatching(/function\s+(getCR|parseCr|crValueOf|crKey|crNumber|formatCr)\s*\(|crNum === 0\.125/, {
    allow: ['shared/bestiary/challengeRating.js'],
  }), []);
});

// A multiclass choice key loses its `mcN_` prefix through baseChoiceKey, and a
// choice value is read through readChoiceValue (choiceUtils.js): 17 inline
// prefix strippers and three copies of the reader had grown.
test('choice keys and values are read through shared/character/progression/choiceUtils.js', () => {
  assert.deepEqual(sourceFilesMatching(/\^mc\d\+_|function\s+(readChoiceValue|choiceValueFrom|choiceValue)\s*\(/, {
    allow: ['shared/character/progression/choiceUtils.js'],
  }), []);
});

// Levels and Hit Dice: classLevel.js and hp.js answer them once.
test('total and multiclass levels and Hit Die faces have one definition', () => {
  assert.deepEqual(sourceFilesMatching(/extraClasses[\s\S]{0,80}\.reduce\(\(sum,|hd\??\.faces/, {
    allow: ['shared/character/progression/classLevel.js', 'shared/character/combat/hp.js', 'adapters/adapterPipeline.js'],
  }), []);
});

// A saved colour is checked by normalizeHexColor (shared/ui/colors.js); seven
// copies of the '#rrggbb' test had grown, three returning different fallbacks.
test('saved colours are validated only by normalizeHexColor', () => {
  assert.deepEqual(sourceFilesMatching(/\^#\[0-9a-f\]\{6\}\$/i, {
    allow: ['shared/ui/colors.js'],
  }), []);
});

// Search boxes match through matchesQuery (shared/content/searchText.js): the
// same forgiving rule everywhere (case, accents, punctuation, every term).
test('search filters go through matchesQuery', () => {
  assert.deepEqual(sourceLinesMatching(/toLowerCase\(\)\.includes\((q|sq|query|search|needle|term)\)/), []);
});

// Lists sort with compareText / byName (shared/lists.js): English order,
// whatever the browser's language. instanceSync orders keys for an exact
// comparison, not for display.
test('lists sort through compareText and byName', () => {
  assert.deepEqual(sourceFilesMatching(/\.localeCompare\(/, {
    allow: ['shared/lists.js', 'shared/instances/instanceSync.js'],
  }), []);
});

// Cloud calls read the signed-in user and set deadlines through cloudCall.js.
test('the signed-in user and command timeouts come from shared/cloud/cloudCall.js', () => {
  assert.deepEqual(sourceFilesMatching(/auth\.getUser\(\)|Promise\.race\(/, {
    allow: ['shared/cloud/cloudCall.js'],
  }), []);
});

// App events are sent and heard by their named constants (shared/appEvents.js,
// cloud/sync/characterEvents.js, cloud/sync/cloudSyncState.js), never by a
// string typed at the call: a typo would be a listener that never fires.
test('app events are named by constants, not string literals', () => {
  assert.deepEqual(sourceLinesMatching(/(Event|addEventListener|removeEventListener|useEventListener)\([^)]*['"]gb:/), []);
});

// Links to 5e.tools pages are built by shared/content/fiveEToolsLinks.js (one
// slug and source rule per page type); adapters keep their hand-written links.
test('5e.tools page links are built only by fiveEToolsLinks.js', () => {
  assert.deepEqual(sourceFilesMatching(/https:\/\/5e\.tools\/(bestiary|spells|items)/, {
    allow: ['shared/content/fiveEToolsLinks.js'],
  }), []);
});

// Which keys of a 5etools proficiency block ask for a choice: one list.
test('proficiency block choice keys come from typedProficiencies.js', () => {
  assert.deepEqual(sourceFilesMatching(/['"]anyArtisansTool['"],\s*['"]anyMusicalInstrument['"]/, {
    allow: ['shared/character/progression/typedProficiencies.js'],
  }), []);
});

// Small rules with one home: a stored number or null (numbers.js), "is this a
// weapon" (itemCodes.js), the default purse (currency.js).
test('numberOrNull, isWeaponItem and DEFAULT_CURRENCY have one definition', () => {
  assert.deepEqual(sourceFilesMatching(/function numberOrNull\(|\[['"]M['"], ?['"]R['"]\]\.includes|gp: 10, pp: 0/, {
    allow: ['shared/numbers.js', 'shared/character/inventory/itemCodes.js', 'shared/character/inventory/currency.js'],
  }), []);
});
