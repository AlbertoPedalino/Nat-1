import test from 'node:test';
import assert from 'node:assert/strict';
import { readSource, sourceFilesMatching, sourceLinesMatching } from '../sourceScan.js';

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

// A 5etools reference loses its source through stripSource.
test('a name without its source comes from stripSource', () => {
  assert.deepEqual(sourceFilesMatching(
    /String\([^\n]*\)\s*(\.toUpperCase\(\))?\.split\(['"]\|['"]\)\[0\]|[\w$\]]\.split\(['"]\|['"]\)\[0\]/,
    { allow: ['shared/content/nameKeys.js'] },
  ), []);
});

test('capitalizing is done only by shared/ui/textCase.js', () => {
  assert.deepEqual(sourceFilesMatching(
    /charAt\(0\)\.toUpperCase\(\)\s*\+|\.replace\(\/(\^|\\b)\\w\/g?,\s*(\(c\)|c|function\s*\(c\))\s*(=>|\{)|function\s+(capitalize|titleCase)\s*\(|const\s+(capitalize|titleCase)\s*=/,
    { allow: ['shared/ui/textCase.js'] },
  ), []);
});

// Also in disguise: an injected `random()` turned into base 36, or the time
// alone put into an id (two made in the same millisecond collide).
test('new ids are made only by makeId in shared/ids.js', () => {
  assert.deepEqual(sourceFilesMatching(/\brandom\(\)\.toString\(36\)|randomUUID|\$\{Date\.now\(\)\}/, {
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

// "Could not …: reason." is written by failureMessage, not by hand: the bare
// reason or the bare action alone is what the copies used to show.
test('failure lines are made by failureMessage', () => {
  assert.deepEqual(sourceLinesMatching(/\?\.message \|\| ['"]Could not|`Could not[^`]*\$\{\w+\??\.message|'Failed to /, {
    allow: ['shared/ui/busyAction.js'],
  }), []);
});

// `Math.max(lo, Math.min(hi, x))` is clamp(x, lo, hi) in every case, so it is
// written as clamp (shared/numbers.js).
test('range clamps go through clamp', () => {
  assert.deepEqual(sourceLinesMatching(/Math\.max\([^,()]+, Math\.min\(/, { allow: ['shared/numbers.js'] }), []);
});

// "Is this a phone" is one breakpoint, read the one way (useIsPhone).
test('the phone breakpoint is read through useIsPhone', () => {
  assert.deepEqual(sourceLinesMatching(/useMediaQuery\([^)]*breakpoints\.down\('sm'\)/, { allow: ['shared/ui/useIsPhone.js'] }), []);
});

// A font is read as UI_FONTS.<name>, never renamed locally (CINZEL, FONT…),
// so every use of a typeface can be found by one search.
test('fonts are not aliased', () => {
  assert.deepEqual(sourceLinesMatching(/^const \w+ = UI_FONTS\.\w+;/), []);
});

// Every dialog is a SheetDialog (surface="map" over the battle map): one
// surface, one title bar, one close button.
test('dialogs go through SheetDialog', () => {
  assert.deepEqual(sourceFilesMatching(/<Dialog\b/, { allow: ['shared/ui/SheetDialog.jsx'] }), []);
});

// What a database error code means is pgErrors.js's to say.
test('database error codes are read through pgErrors.js', () => {
  assert.deepEqual(sourceLinesMatching(/code === '(23505|PGRST202|42883|P0002)'/, { allow: ['shared/cloud/pgErrors.js'] }), []);
});

// Waiting for a previous task before starting the next (a per-key queue) is
// createKeyedQueue's job (shared/cloud/sync/keyed.js), however the chain is
// spelled: `.catch(() => {}|null).then(task)` or `ref.current.then(run, run)`.
test('task chains go through createKeyedQueue', () => {
  assert.deepEqual(sourceFilesMatching(/\.catch\(\(\) => (\{\}|null|undefined)\)\.then\(|\.current\.then\((\w+), \2\)/, { allow: ['shared/cloud/sync/keyed.js'] }), []);
});

// A native colour input jumps under the pointer unless it holds its own value
// while the picker is open: ColorField does, so every colour well is one.
test('every colour well is a ColorField', () => {
  assert.deepEqual(sourceFilesMatching(/type="color"/, { allow: ['shared/ui/ColorField.jsx'] }), []);
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
    'pages/charsheet/spells/spellSourceDisplay.js', 'shared/character/inventory/currency.js', 'shared/character/inventory/itemRarity.js',
    'shared/ui/swatches.js', 'shared/ui/ColorField.jsx', 'shared/vtt/scene/imageFilters.js',
    'shared/hexcrawl/hexCell.js', 'shared/dungeon/roomMarkers.js',
    'shared/character/dice/D100Orb.jsx',
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

// Type sizes are steps of FONT_SIZES (shared/ui/fonts.js), so a restyle
// changes the scale in one place. Icon sizes and box-relative clamps are not type.
test('font sizes come from FONT_SIZES', () => {
  assert.deepEqual(sourceLinesMatching(/[fF]ontSize\s*[:=]\s*[^,;]*['"]\d*\.?\d+(rem|px)['"]|fontSize:\s*\d+\s*[,}]/, {
    allow: ['shared/ui/fonts.js'],
  }).filter((hit) => !hit.startsWith('data/')), []);
});

// Spaced-out text takes a step of LETTER_SPACINGS (shared/ui/fonts.js).
test('letter spacing comes from LETTER_SPACINGS', () => {
  assert.deepEqual(sourceLinesMatching(/letterSpacing:\s*(['"`][^'"`]*\d|[1-9]|0\.\d)/, { allow: ['shared/ui/fonts.js'] })
    .filter((hit) => !hit.startsWith('data/')), []);
});

// Text treatments are TEXT_STYLES roles (shared/ui/textStyles.js): small
// capitals are `label`, display-face titles and figures set their weight
// through `title`/`figure`, quiet asides are `note`. The coin boxes take their
// face from the coin variant.
test('text treatments come from TEXT_STYLES', () => {
  const allow = ['shared/ui/textStyles.js'];
  assert.deepEqual(sourceLinesMatching(/textTransform:\s*'uppercase'/, { allow: [...allow,
    'shared/character/inventory/CurrencyCoinBox.jsx', 'shared/character/inventory/CurrencyRow.jsx'] }), []);
  assert.deepEqual(sourceLinesMatching(/fontFamily:\s*UI_FONTS\.display.*fontWeight|fontWeight.*fontFamily:\s*UI_FONTS\.display/, { allow }), []);
  // Italic outside `note` is emphasis inside text (rich text, a stat block
  // entry name).
  assert.deepEqual(sourceLinesMatching(/fontStyle:\s*'italic'/, { allow: [...allow,
    'shared/content/RichText.jsx', 'pages/charsheet/forms/BeastStatBlock.jsx'] }), []);
});

// The look of a chosen option or row is the theme's (MuiToggleButton,
// MuiListItemButton, MuiMenuItem), so every selection reads the same.
test('selected states are styled only in the theme', () => {
  assert.deepEqual(sourceLinesMatching(/['"]&\s*\.Mui-selected/, { allow: ['app/theme.js'] }), []);
});

// Opacity is a step of OPACITY (shared/ui/colors.js): tints, washes, lines
// and veils all read the same strengths. Map strokes, the grid and light
// filters are drawing data and keep their own.
test('opacities come from OPACITY', () => {
  const allow = ['shared/ui/colors.js', 'shared/vtt/colors.js', 'shared/vtt/scene/imageFilters.js'];
  assert.deepEqual(sourceLinesMatching(/\b(alpha|uiAlpha|vttAlpha)\((?:[^()]|\([^()]*\))*,\s*0?\.\d|\bopacity:\s*[^,}]*(?<![\w.])0?\.\d|[aA]lpha:\s*0?\.\d/, { allow })
    .filter((hit) => !hit.startsWith('data/') && !hit.startsWith('adapters/')), []);
});

// Spacing is in theme units (numbers in sx, quarter steps), never pixels, so
// density follows theme.spacing.
test('spacing is in theme units', () => {
  assert.deepEqual(sourceLinesMatching(/\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|rowGap|columnGap):\s*'-?\d*\.?\d+px'/), []);
});

// Weights, line heights and the app's layers come from their scales.
test('font weights, line heights and layers come from their scales', () => {
  assert.deepEqual(sourceLinesMatching(/fontWeight[:=]\s*[{"']?\d00\b/, { allow: ['shared/ui/fonts.js'] }), []);
  assert.deepEqual(sourceLinesMatching(/lineHeight:\s*\d/, { allow: ['shared/ui/fonts.js'] }), []);
  assert.deepEqual(sourceLinesMatching(/zIndex:\s*\d{2,}/, { allow: ['shared/ui/layers.js'] }), []);
});

// Transition times are DURATIONS steps (shared/ui/motion.js); dice keep
// their own rhythm.
test('transition times come from DURATIONS', () => {
  assert.deepEqual(sourceLinesMatching(/(?<![\w.$])[1-9]\d{1,2}ms\b/, { allow: ['shared/ui/motion.js', 'shared/character/dice/D100Orb.jsx'] }), []);
});

// The app has one theme; a page keeps only its own sizes (the builder's
// density rules), never a theme of its own.
test('the app has one theme', () => {
  assert.deepEqual(sourceFilesMatching(/\bcreateTheme\(/, { allow: ['app/theme.js'] }), []);
});

// Corners are multiples of theme.shape.borderRadius (numbers in sx, or
// cornerRadius for per-corner shapes), so a restyle changes them with the theme.
// Pills (999px) and circles (50%) are shapes, not a radius.
test('border radii follow the theme radius', () => {
  assert.deepEqual(sourceLinesMatching(/borderRadius:\s*['"`](?![^'"`]*999px)[^'"`]*\d+px/)
    .filter((hit) => !hit.startsWith('data/')), []);
});

// Drop shadows under floating surfaces come from UI_SHADOWS (shared/ui/shadows.js).
test('surface shadows come from UI_SHADOWS', () => {
  assert.deepEqual(sourceLinesMatching(/0 (?:[4-9]|1\d)px \d{2}px/, { allow: ['shared/ui/shadows.js'] })
    .filter((hit) => !hit.startsWith('data/')), []);
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
      'pages/vtt/atmosphere/webglCanvas.js',
      'pages/vtt/map/usePinchZoom.js',
      'pages/vtt/scene/useProjector.js',
      'pages/vtt/VttPage.jsx',
      'pages/vtt/dungeon/useSceneDungeon.js',
      'shared/hexcrawl/useBoardCampaign.js',
      'shared/cloud/sync/CloudAutoSync.jsx',
      'shared/cloud/sync/useCharacterDigests.js',
      'shared/cloud/sync/useCharacterSheetRevision.js',
      'shared/instances/instanceStore.js',
    ],
  }), []);
});

test('a wizard spellbook is normalized only by shared/character/spells/wizardBook.js', () => {
  assert.deepEqual(sourceFilesMatching(/function\s+normalizeWizard(Spell)?Book\b|for \(let level = 0; level <= 9; level\+\+\) \{\n\s*const seen = new Set\(\);/, {
    allow: ['shared/character/spells/wizardBook.js'],
  }), []);
});

// Ability scores are computed from the character's choices every time, never
// stored: a saved copy went stale (no items, Tomes or Wild Shape) and the
// sheet's own background bonus ignored the +1/+1/+1 pattern. itemEffects.js
// holds the item and Tome layer that abilityScores.js lays over the built score.
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
// adapterPipeline.js writes a raw class record's Hit Die as text, empty when
// the record has none, where hitDieFaces would answer d8.
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

// One seeded generator (shared/seededRandom.js) for dungeons and dice.
test('seeded random numbers come only from shared/seededRandom.js', () => {
  assert.deepEqual(sourceFilesMatching(/0x6d2b79f5|0x811c9dc5/, { allow: ['shared/seededRandom.js'] }), []);
});

// Word capitalizing and initials go through textCase.js, in any spelling.
test('capitalizing in any spelling goes through shared/ui/textCase.js', () => {
  assert.deepEqual(sourceLinesMatching(/\[0\]\??\.toUpperCase\(\)\s*\+|\b\w\/g, \(\w+\) => \w+\.toUpperCase\(\)|function (toTitleCase|initials)\(/, {
    allow: ['shared/ui/textCase.js'],
  }), []);
});

// "One value or a list of them, as a list" is asArray, in any spelling.
test('a value-or-list is wrapped only by asArray', () => {
  assert.deepEqual(sourceLinesMatching(/Array\.isArray\(([\w.?]+)\) \? \1 : (\[\1\]|\1 == null \? \[\] : \[\1\])/, {
    allow: ['shared/lists.js'],
  }), []);
});

// The `?char=` of the sheet and the builder is read, written and linked
// through shared/character/profile/characterRoutes.js.
test('character page links and the ?char= param go through characterRoutes.js', () => {
  assert.deepEqual(sourceLinesMatching(/\?char=\$\{|['"`]\/(charsheet|charbuilder)\?char=|\.get\(['"]char['"]\) \|\| getActive|URLSearchParams\(window\.location\.search\)\.get\(['"]char['"]\)/, {
    allow: ['shared/character/profile/characterRoutes.js'],
  }), []);
});

// A "Name|SOURCE" reference is split by splitNameSource (nameKeys.js).
test('name|source references are split only by splitNameSource', () => {
  assert.deepEqual(sourceLinesMatching(/const \[\w+, \w+(?: = '')?\] = [^;]*\.split\(['"]\|['"]\)/, {
    allow: ['shared/content/nameKeys.js'],
  }), []);
});

// The names of a character's classes come from classNames (classLevel.js).
test('a character\'s class names come from classNames', () => {
  assert.deepEqual(sourceLinesMatching(/\[[\w.?]*className, \.\.\.\(?[\w.?]*extraClasses/, {
    allow: ['shared/character/progression/classLevel.js'],
  }), []);
});

// "Your spell attack modifier" and "your spell save DC" come from
// spellcastingNumbers, for spells and for the companions that use them.
test('spell attack and save DC are computed only by spellcastingNumbers', () => {
  assert.deepEqual(sourceLinesMatching(/8 \+ getPB\(C\) \+ spellMod|const (spellAttack|spellAtk) = pb \+|spellDc = 8 \+|: 8 \+ (atk|resolvedAttack)\b/, {
    allow: ['shared/character/spells/spellcastingNumbers.js'],
  }), []);
});

// Spell slots come from casterProgression.js (single class, multiclass table,
// Pact Magic); the slot tables are read nowhere else.
test('spell slot tables are read only by casterProgression.js', () => {
  assert.deepEqual(sourceFilesMatching(/\b(FULL_SLOTS|HALF_SLOTS|THIRD_SLOTS|PACT_SLOTS)\b/, {
    allow: ['shared/character/spells/spellTables.js', 'shared/character/spells/casterProgression.js'],
  }), []);
});

// The spell record saved on a character is built by toSnapshot alone.
test('spell snapshots are built only by toSnapshot', () => {
  assert.deepEqual(sourceFilesMatching(/castingTimeLabel: spell\.castingTimeLabel \|\|/, {
    allow: ['shared/character/spells/spellSnapshots.js'],
  }), []);
});

// Spent and created spell slots are saved by persistUsedSlots and
// persistCreatedSlots (spellSlots.js): the sheet and the character together.
test('spell slot changes are saved only through spellSlots.js', () => {
  assert.deepEqual(sourceLinesMatching(/onUpdateCharacter\??\.?\(\(prev\) => \(\{ \.\.\.prev, (spellSlotsUsed|createdSpellSlots): /, {
    allow: ['shared/character/spells/spellSlots.js'],
  }), []);
});

// Death saves are { success, fail } everywhere; fights saved as { s, f } are
// still read by normalizeDeathSaves, and nothing writes that shape again.
test('death saves are written as { success, fail } only', () => {
  assert.deepEqual(sourceLinesMatching(/\{ s: \d, f: \d \}|deathSaves\??\.(s|f)\b|saveType: ['"](s|f)['"]/), []);
});

// A choice's kind is read in one place: choiceKeyKind and the value checks of
// choiceNormalization.js. A key that merely contains "spell" or "_skill_" is
// no spell or skill pick (a rune list, a background's skill wiped with a
// subclass change); every reader goes through the normalized choices.
test('a choice key is read for its kind only in choiceNormalization.js', () => {
  assert.deepEqual(sourceLinesMatching(
    /\b(key|k|lk|ck|cleanKey|baseKey|raw|stored)\.(includes|startsWith|endsWith)\(['"](skill|tool|language|lang|instrument|expertise|expert|_skill_|_exp_|spell|cantrip|resist|resistance|weapon|mastery)['"]\)/,
    { allow: ['shared/character/progression/choiceNormalization.js'] },
  ), []);
});

// The comic look has one home per piece: game drawings in gameIcons.js, the
// ink edge and solid shadows in the shared ui recipes, the screentone in
// PanelHeader.jsx, the halftone in surfaces.js. A page that writes its own
// copy drifts the first time the look is tuned.
test('game icons come only from gameIcons.js', () => {
  assert.deepEqual(sourceFilesMatching(/from 'react-icons/, { allow: ['shared/ui/gameIcons.js'] }), []);
});

test('ink edges and solid shadows are written only in the shared ui recipes', () => {
  const recipes = ['shared/ui/shadows.js', 'shared/ui/surfaces.js', 'shared/ui/pressable.js', 'shared/ui/bubble.js', 'shared/ui/PanelHeader.jsx', 'shared/ui/interactive.js', 'app/theme.js'];
  assert.deepEqual(sourceLinesMatching(/solid \$\{UI_COLORS\.edge\}|\dpx \dpx 0 \$\{UI_COLORS\.edge|0 \dpx 0 \$\{UI_COLORS\.edge/, { allow: recipes }), []);
});

// A drawn box or control is framed by the 2px ink edge (INK_EDGE, a SURFACES
// recipe, CARD_SX). A hairline is one of two recipes in interactive.js: the
// rule between a card's parts (CARD_PART_RULE_SX) and the one between a
// list's rows (LIST_ROW_RULE_SX); a section heading's rule is
// sheetSectionHeaderSx. A thin line written by hand is left only to board
// pieces on the map (tokens, markers, the selection marquee), to marks too
// small for a thick line (training dots, pips, a mini badge, a stat-block
// table), to the coins' own splits and to the XP field's underline.
test('a thin frame or rule is drawn only by its recipe, board pieces and tiny marks', () => {
  const thin = /\bborder(Top|Bottom|Left|Right)?: (1\b|'1px solid'|`1px solid )/;
  const boardPieces = sourceFilesMatching(thin).filter((file) => file.startsWith('pages/vtt/tokens/'));
  const allow = [
    ...boardPieces,
    'pages/vtt/map/ViewportOverlays.jsx', 'pages/vtt/map/sceneViewportStyles.js',
    'shared/bestiary/MonsterToken.jsx', 'shared/character/dice/D100Orb.jsx',
    'pages/charsheet/stats/SavingThrows.jsx', 'pages/charsheet/stats/Skills.jsx',
    'shared/character/combat/DeathSaveDots.jsx', 'shared/ui/PipButton.jsx', 'shared/ui/MiniBadge.jsx',
    'shared/bestiary/EntryRenderer.jsx',
    'shared/ui/interactive.js', 'shared/ui/PanelHeader.jsx',
    'shared/character/progression/XpDeltaControl.jsx',
  ];
  assert.deepEqual(sourceLinesMatching(thin, { allow }), []);
});

// No glows and no thin rings: a picked or open thing casts its solid shadow
// in its colour (inkShadow(tone)), a hovered one changes its edge colour. The
// battle map keeps its own glows (selection, light, focus over the board).
test('no glow or ring shadows outside the battle map', () => {
  const glow = /[`'"]0 0 (0 )?\d+px/;
  const hits = sourceLinesMatching(glow).filter((hit) => !hit.startsWith('pages/vtt/'));
  assert.deepEqual(hits, []);
});

// A dashed line means something is not there yet: an empty state, a drop
// zone, a slot made rather than earned. A rule between a card's parts or a
// box round a control is solid (CARD_PART_RULE_SX, the theme's button). The
// battle map keeps its own (a piece hidden from players).
test('a dashed line only marks an empty place', () => {
  const dashed = /\bborder(Top|Bottom|Left|Right)?: '[\d.]+px dashed'|borderStyle: 'dashed'|`[\d.]+px dashed /;
  const placeholders = [
    'shared/ui/StatePanel.jsx', 'shared/character/inventory/CurrencyRow.jsx', 'pages/charsheet/spells/SpellsUiParts.jsx',
  ];
  const hits = sourceLinesMatching(dashed, { allow: placeholders }).filter((hit) => !hit.startsWith('pages/vtt/'));
  assert.deepEqual(hits, []);
});

// Raised means pressed, and the press is drawn in one place: the button and
// its motion (PRESSABLE_EDGE_SX, PRESS_MOTION_SX, pressableSx), a toggle
// (toggleSx, goldToggleSx), a stepper's key (stepButtonSx), a bar of keys
// (KEY_BAR_SX), a row you roll (ROLL_ROW_SX) — all in shared/ui/pressable.js.
// A page that writes the press shadow itself, or keeps a local copy under a
// recipe's name, is one a restyle never reaches.
test('the press is drawn only by the pressable recipes', () => {
  const recipes = ['shared/ui/pressable.js', 'shared/ui/shadows.js', 'shared/ui/surfaces.js'];
  assert.deepEqual(sourceLinesMatching(/UI_SHADOWS\.(press|pressed|lifted)\b/, { allow: recipes }), []);
  const names = /^\s*(const|function|export const|export function)\s+(toggleSx|goldToggleSx|stepButtonSx|pressableSx|readoutSx|tileSx|KEY_BAR_SX|PRESSABLE_EDGE_SX|PRESS_MOTION_SX|ROLL_ROW_SX|CARD_SX)\b/;
  assert.deepEqual(sourceLinesMatching(names).filter((hit) => !hit.startsWith('shared/ui/')), []);
});

test('the screentone and the halftone are drawn in one place each', () => {
  assert.deepEqual(sourceFilesMatching(/repeating-linear-gradient\(-45deg/, { allow: ['shared/ui/colors.js'] }), []);
  assert.deepEqual(sourceFilesMatching(/radial-gradient\(\$\{uiAlpha\(UI_COLORS\.textPrimary/, { allow: ['shared/ui/surfaces.js'] }), []);
});

// What kind an item is — weapon, armor, shield, ammunition, equippable — is
// asked of itemKinds.js. A page that reads the type code itself
// (`item.type === 'LA'`) misses the source suffix ('LA|XPHB') and custom items
// ('WEAPON'); code tables (labels, catalog groups, adapter data) are not tests
// and stay, and so does itemData.js, which scores raw 5etools records before
// they are items. The kind tests and how much an item counts are defined once.
test('an item kind is asked of itemKinds.js', () => {
  const rawType = /itemBaseType\([^)]*\)\s*[!=]==\s*'(M|R|LA|MA|HA|S|A|AF)'|\.type\)?\.toUpperCase\(\)\s*[!=]==\s*'|String\(item\??\.type/;
  const allow = ['shared/character/inventory/itemKinds.js', 'shared/content/catalogs/itemData.js'];
  assert.deepEqual(sourceLinesMatching(rawType, { allow }), []);
  const kinds = /^\s*(const|function|export const|export function)\s+(isWeaponItem|isMeleeWeapon|isRangedWeapon|isBodyArmor|isHeavyArmor|isShield|isArmorOrShield|isAmmo|isEquippable|itemBaseType|itemQty|stepInventoryQty|formatPounds)\b/;
  const homes = ['shared/character/inventory/itemKinds.js', 'shared/character/inventory/weight.js', 'shared/character/inventory/itemContainers.js'];
  assert.deepEqual(sourceLinesMatching(kinds).filter((hit) => !homes.some((home) => hit.startsWith(home))), []);
});

// 5etools markup is read by one parser (inlineMarkup.js) and reduced to plain
// words by one function (stripMarkup, markupText.js). A hand regex that drops
// any tag (`replace(/\{@\w+ …/)`) misses nested tags and the stat-block labels.
test('markup is stripped only by stripMarkup', () => {
  const anyTag = /replace\(\/\\\{@\\w/;
  assert.deepEqual(sourceLinesMatching(anyTag, { allow: ['shared/content/inlineMarkup.js'] }), []);
  assert.deepEqual(sourceLinesMatching(/^\s*(export )?function (strip5eMarkup|stripMarkup)\b/).filter((hit) => !hit.startsWith('shared/content/markupText.js')), []);
});

// A menu, a select list, a popover, an autocomplete list and a tooltip are the
// one floating surface the theme gives them (SURFACES.floating); a screen only
// sizes or pads one. The battle map's menus keep its glass.
test('floating surfaces are drawn by the theme', () => {
  const localPaper = /paper: \{[^}]*sx: \{[^}]*\.\.\.SURFACES\./;
  assert.deepEqual(sourceLinesMatching(localPaper).filter((hit) => !hit.startsWith('pages/vtt/')), []);
});

// The tint is laid only by the chips that own a look: the theme's, TagChip,
// MiniBadge and the creature markers' recipe (markerChipStyles.js, drawn by
// MarkerChip, ConditionChips and ReminderChips).
test("a row's tag is a MiniBadge, never a hand-tinted Chip", () => {
  assert.deepEqual(sourceFilesMatching(/\bchipTintStyle\(/, {
    allow: [
      'app/theme.js', 'shared/ui/entityColors.js', 'shared/ui/TagChip.jsx', 'shared/ui/MiniBadge.jsx',
      'shared/character/combat/markerChipStyles.js',
    ],
  }), []);
});

// A JSX element's opening tag from `start` (its "<") to its closing ">", over
// the braces of its props (an icon prop holds a tag of its own).
function openingTag(text, start) {
  let depth = 0;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === '>' && depth === 0) return text.slice(start, index + 1);
  }
  return text.slice(start);
}

// A chip that is clicked or removed (a reminder's X) is the theme's Chip.
test('a chip that is only read is a TagChip', () => {
  const offenders = sourceFilesMatching(/<Chip\b/, { allow: ['shared/ui/TagChip.jsx'] }).filter((file) => {
    const text = readSource(file);
    return [...text.matchAll(/<Chip\b/g)].some(({ index }) => !/\bonClick\b|\bclickable\b|\bonDelete\b/.test(openingTag(text, index)));
  });
  assert.deepEqual(offenders, []);
});

test('outlined lettering is inked only by inkLettering', () => {
  assert.deepEqual(sourceFilesMatching(/WebkitTextStroke/, {
    allow: ['shared/ui/shadows.js'],
  }), []);
});

test('a list with nothing in it says so through EmptyLine', () => {
  assert.deepEqual(sourceFilesMatching(/\bemptyTextSx\b/, { allow: ['shared/ui/EmptyLine.jsx'] }), []);
});

test('what went wrong is said through ErrorLine', () => {
  assert.deepEqual(sourceFilesMatching(/<Alert severity="error"/, { allow: ['shared/ui/LoadStatus.jsx'] }), []);
});

test('a quiet line beside something is a Caption', () => {
  assert.deepEqual(sourceFilesMatching(/variant="caption"\s+(?:[\w-]+(?:="[^"]*")?\s+)*sx=\{\{ color: 'text\.secondary'/, { allow: ['shared/ui/Caption.jsx'] }), []);
});

// ColorField takes the native colour input's own chrome off, which is not a
// button's.
test("a bare <button>'s chrome is taken off by BARE_BUTTON_SX", () => {
  assert.deepEqual(sourceFilesMatching(/appearance: 'none'|background: 'none'/, {
    allow: ['shared/ui/interactive.js', 'shared/ui/ColorField.jsx'],
  }), []);
});

test('text is cut to one line by ONE_LINE_SX', () => {
  assert.deepEqual(sourceFilesMatching(/textOverflow: 'ellipsis'/, { allow: ['shared/ui/textStyles.js', 'app/theme.js'] }), []);
});

// RollModeArea stops the iOS callout for a long press on a roller, not for a
// drag, and keeps no grab cursor.
test('a drag source onto the map takes DRAG_SOURCE_SX', () => {
  assert.deepEqual(sourceFilesMatching(/WebkitTouchCallout: 'none'/, {
    allow: ['shared/ui/interactive.js', 'shared/character/dice/RollModeArea.jsx'],
  }), []);
});

test('an icon button with a tooltip is a TipIconButton', () => {
  assert.deepEqual(sourceFilesMatching(/<Tooltip\b[^>]*>\s*(?:<span>\s*)?<IconButton\b/, { allow: ['shared/ui/TipIconButton.jsx'] }), []);
});

test('one choice among a few is a ChoiceToggle', () => {
  assert.deepEqual(sourceFilesMatching(/<ToggleButtonGroup\b/, { allow: ['shared/ui/ChoiceToggle.jsx'] }), []);
});

test('a short table of facts is a LabelValueGrid', () => {
  assert.deepEqual(sourceFilesMatching(/gridTemplateColumns: 'auto 1fr'/, { allow: ['shared/ui/LabelValueGrid.jsx'] }), []);
});

test("a dialog's Cancel is the CancelButton", () => {
  assert.deepEqual(sourceFilesMatching(/>Cancel<\/Button>/, { allow: ['shared/ui/SheetDialog.jsx'] }), []);
});

// TextField's `select` may sit on a line of its own, after props holding arrows
// or strings that mention "select"; quoted text is stepped over as a whole.
const DROP_DOWN = /<Select\b|<select\b|NativeSelect|component="select"|<TextField\b(?:=>|"[^"]*"|'[^']*'|`[^`]*`|[^>"'`])*?\sselect(?=\s|\/?>|=\{)/;

test('a drop-down is a SelectField', () => {
  for (const sample of [
    '<TextField\n  select\n  size="small"',
    '<TextField size="small" onChange={(e) => go(e)} select>',
    '<TextField select={true} />',
    '<Select value={x}>',
    '<Box component="select">',
  ]) assert.match(sample, DROP_DOWN);
  for (const sample of [
    '<TextField placeholder="Type or select one" />',
    '<SelectField value={x} />',
  ]) assert.doesNotMatch(sample, DROP_DOWN);
  assert.deepEqual(sourceFilesMatching(DROP_DOWN, { allow: ['shared/ui/SelectField.jsx'] }), []);
});

// A − and + around a count is the CountStepper (the dice pickers through
// DiceCountPicker): a hand-made pair of "-"/"+" buttons is one a change to the
// stepper never reaches.
test('a count stepper is the CountStepper', () => {
  assert.deepEqual(sourceFilesMatching(/>\s*[-−+]\s*<\/(Button|IconButton)>/, { allow: ['shared/ui/CountStepper.jsx'] }), []);
});

// A panel's title bar is panelTitleBarSx: one built by hand from the bar's
// pieces (panelBarSx and a screentone) is one a restyle of the bar never
// reaches. The app's top bar is a bar of its own, not a panel's.
test("a panel's title bar is panelTitleBarSx", () => {
  assert.deepEqual(sourceFilesMatching(/\bpanelBarSx\b/, {
    allow: ['shared/ui/PanelHeader.jsx', 'app/navigation/AppTopBar.jsx'],
  }), []);
});

// Everything clicked is lettered by the theme (TEXT_STYLES.label: the display
// face's spaced capitals). Only a line of description inside a button takes
// BUTTON_DESCRIPTION_SX; turning the capitals back anywhere else is a button
// lettered unlike the rest.
test("a control's lettering is the theme's", () => {
  assert.deepEqual(sourceFilesMatching(/textTransform:\s*'none'/, { allow: ['shared/ui/actionButton.js'] }), []);
  assert.deepEqual(sourceFilesMatching(/label=["']?[A-Z]{3,}["' ]|>\s*(HOME|LOGIN|LOG IN)\s*</, { allow: [] }), []);
});

// A count of picks taken out of those allowed ("1/1", "Cantrips 2/3") is the
// PickCount sticker: a count written as text, or a chip tinted by hand, is one
// that does not turn gold when the choice is complete.
test('a count of picks is PickCount', () => {
  assert.deepEqual(sourceFilesMatching(/\} \/ \$\{[^}]+\} selected|<TagChip[^>]*label=\{`[^`]*\$\{[^}]+\}\/\$\{/, { allow: ['shared/ui/PickCount.jsx'] }), []);
});

// An SVG built in code becomes a CSS image through svgPicture
// (shared/ui/svgPicture.js) only, never by a hand-written data URL.
test('an SVG drawing becomes a CSS image only through svgPicture', () => {
  assert.deepEqual(sourceLinesMatching(/data:image\/svg\+xml[,;]/, {
    allow: ['shared/ui/svgPicture.js'],
  }), []);
});

// A card's name kept to one line scrolls under the finger (ScrollingName); it is
// never cut with an ellipsis.
test('a card name on one line is a ScrollingName, never cut with an ellipsis', () => {
  assert.deepEqual(sourceLinesMatching(
    /(noWrap|ONE_LINE_SX)[^\n]*(cardTitleSx|TEXT_STYLES\.cardName|BUILDER_TEXT\.cardTitle)|(cardTitleSx|TEXT_STYLES\.cardName|BUILDER_TEXT\.cardTitle)[^\n]*(noWrap|ONE_LINE_SX)/,
  ), []);
});

// Whether a piece is kept from the players (GM layer, or hidden on its own) is
// asked of isSecretPiece (shared/vtt/scene/scene.js), never spelled out again.
test("a piece's secrecy is read through isSecretPiece", () => {
  assert.deepEqual(sourceLinesMatching(
    /hiddenFromPlayers.*\.layer\s*[!=]==\s*'gm'|\.layer\s*[!=]==\s*'gm'.*hiddenFromPlayers/,
    { allow: ['shared/vtt/scene/scene.js'] },
  ), []);
});

// Work done once and forgotten on failure goes through cachedLoader /
// cachedLoaderByKey / fetchJsonOnce (shared/content/cachedLoader.js), never
// another hand-made cache of promises.
test('a loader run once is a cachedLoader', () => {
  assert.deepEqual(sourceLinesMatching(/\.catch\(\(\)\s*=>\s*\w+\.delete\(|\w+\.delete\(\w+\);\s*throw /, {
    allow: ['shared/content/cachedLoader.js'],
  }), []);
});

// An entry's card (an action, a spell, an item) takes its pieces from
// shared/ui/entryCard.js: owned cards ENTRY_CARD_SX / ENTRY_ROW_SX /
// ENTRY_BODY_SX / ENTRY_BUTTON_SX, pickable ones PickableRow. The per-tab
// copies they replaced never come back.
test("an entry card's pieces come from entryCard.js", () => {
  assert.deepEqual(sourceLinesMatching(
    /\b(spellCardSx|spellRowSx|spellBodySx|inlineButtonSx|ITEM_DETAILS_SX|itemListWellSx|itemStateChipBaseSx)\b/,
  ), []);
});

// A row to pick that opens (a spell, an item to add or make) is a PickableRow.
// The builder's choice lists (ExpandableSelectionList and the panels built
// like it) are their own family: click to choose, the chevron to open.
test('an expandable row to pick is a PickableRow', () => {
  assert.deepEqual(sourceFilesMatching(/<ListItemButton[\s\S]*<\/ListItemButton>/, {
    allow: [
      'shared/ui/PickableRow.jsx',
      'pages/charbuilder/choices/ChoiceBlock.jsx',
      'pages/charbuilder/choices/ExpandableSelectionList.jsx',
      'pages/charbuilder/choices/ReplicateMagicItemChoice.jsx',
      'pages/charbuilder/progression/ClassPanel.jsx',
    ],
  }).filter((file) => readSource(file).includes('ExpandableCard')), []);
});

// Every icon button is raised (the theme's iconButtonLook) and names itself:
// it is a TipIconButton, or a piece built on one (CloseButton /
// CornerCloseButton, RowExpandButton). A bare IconButton is left only where
// the control carries its own name and recipe: the −/+ of the steppers
// (stepButtonSx) and the clear X inside the search field.
test('an icon button is a TipIconButton', () => {
  assert.deepEqual(sourceFilesMatching(/<IconButton\b/, {
    allow: [
      'shared/ui/TipIconButton.jsx',
      'shared/ui/CountStepper.jsx',
      'shared/character/combat/HpStepper.jsx',
      'shared/character/progression/XpDeltaControl.jsx',
      'shared/ui/SearchField.jsx',
    ],
  }), []);
});

// An icon button lies flat only where it is part of something else
// (PART_ICON_BUTTON_SX): the search field's clear X, the 5etools link beside a
// name, the keys of the dice pill, the grips that drag or resize.
test('a flat icon button is part of something else', () => {
  assert.deepEqual(sourceFilesMatching(/PART_ICON_BUTTON_SX/, {
    allow: [
      'shared/ui/pressable.js',
      'shared/ui/SearchField.jsx',
      'shared/content/FiveEToolsLink.jsx',
      'shared/character/dice/DiceControl.jsx',
      'pages/dmscreen/notes/NoteCard.jsx',
      'pages/vtt/sheets/FloatingSheetPanel.jsx',
    ],
  }), []);
});

// Whether panels are GPU layers is one switch: panelFrameSx reads it, a page
// over a moving board (the battle map) turns it off with
// usePanelsWithoutLayers. No box sets the variable or a panel's will-change
// by hand.
test('panel layers are switched only through usePanelsWithoutLayers', () => {
  assert.deepEqual(sourceFilesMatching(/--gb-panel-layer/, {
    allow: ['shared/ui/PanelHeader.jsx'],
  }), []);
  assert.deepEqual(sourceFilesMatching(/usePanelsWithoutLayers\(\)/, {
    allow: ['shared/ui/PanelHeader.jsx', 'pages/vtt/VttPage.jsx'],
  }), []);
});

// A place that moves every frame (a dragged piece, the board under a pan, a
// brush under the pointer) is written onto its element through useLiveStyle
// or writeLiveStyle (shared/ui/liveStyle.js), never into sx: each sx
// value is a new CSS rule, and inserting one restyles the whole page.
// Any transform built from a value (translate, rotate, scale, matrix) counts:
// a piece turned with its handle moves every frame too. Left out, as they only
// hold values fixed once: stickerLayout.js (an SVG string built at build
// time), bubble.js (a bubble's fixed tilt, a sparkle's turn picked once) and
// polyhedra.js (a die's face geometry).
test('a place that moves every frame is written through useLiveStyle', () => {
  const dynamicTransform = /(translate|translate3d|rotate|scale|matrix3d)\(\$\{/;
  const offenders = [];
  for (const file of sourceFilesMatching(dynamicTransform, {
    allow: ['shared/ui/stickerLayout.js', 'shared/ui/bubble.js', 'shared/character/dice/polyhedra.js'],
  })) {
    const lines = readSource(file).split('\n');
    lines.forEach((line, index) => {
      if (!dynamicTransform.test(line)) return;
      if (/\.style\.|^\s*const \w+ = `/.test(line)) return;
      if (/useLiveStyle\(|writeLiveStyle\(/.test(lines.slice(Math.max(0, index - 8), index + 1).join('\n'))) return;
      offenders.push(`${file}:${index + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});

// A layer over the whole battle map (grid, play area, drawings, fog, weather,
// laser, dice) is mapLayerSx or clippedMapLayerSx (pages/vtt/map/
// sceneViewportStyles.js): the map's own box, never a size measured in pixels.
// The grids took the measured viewport into sx, one CSS rule per size, and
// dragging the divider between map and sheet restyled the whole page every
// frame. geometry.js only does the arithmetic of a viewport, no styles.
test('a layer over the whole map is mapLayerSx', () => {
  assert.deepEqual(sourceFilesMatching(/inset: 0,(?:\s*\n[^\n]*){0,4}?\s*width: '100%',\s*\n\s*height: '100%'/, {
    allow: ['pages/vtt/map/sceneViewportStyles.js'],
  }), []);
  assert.deepEqual(sourceLinesMatching(/\b(width|height): (width|height|viewportSize\.(width|height))\b/, {
    allow: ['shared/vtt/map/geometry.js'],
  }), []);
});

// An element's style is written outside sx only through shared/ui/liveStyle.js
// (writeLiveStyle, useLiveStyle, useRootStyle): one way to turn numbers into
// pixels, clear a value, set a custom property, and put the page root back.
test('an element style is written only through liveStyle.js', () => {
  assert.deepEqual(sourceLinesMatching(/\.style\.[A-Za-z]+\s*=[^=]|\.style\.(setProperty|removeProperty)\(|\.style\[[^\]]+\]\s*=[^=]/, {
    allow: ['shared/ui/liveStyle.js'],
  }), []);
});

// An icon button whose whole content is an X closes or removes something: it
// is a CloseButton (or CornerCloseButton), the same X in every dialog, panel,
// toast and bubble. A bubble's X sits in the bubble's corner, BubbleHeader
// keeping the head clear of it. A toggle that
// shows an X while open (`open ? <X /> : <Icon />`) is not one; nor is the
// search field's clear X, part of the field (PART_ICON_BUTTON_SX).
test('an icon button that is only an X is a CloseButton', () => {
  assert.deepEqual(sourceFilesMatching(/\n\s*<X size=[^\n]*\/>\n\s*<\/(TipIconButton|IconButton)>/, {
    allow: ['shared/ui/CornerCloseButton.jsx', 'shared/ui/SearchField.jsx'],
  }), []);
});

// An embedded sheet takes the phone's layout through sheetResponsive
// (pages/charsheet/layout/layout.js), never by spelling the phone's value
// twice (`embedded ? 'column' : { xs: 'column', md: 'row' }`), nor by keeping
// a hand copy of the phone's grid.
test("an embedded sheet takes the phone's layout through sheetResponsive", () => {
  assert.deepEqual(sourceLinesMatching(/embedded \? [^:]+ : \{ (xs|sm|md):/), []);
});

// Hover looks apply only where there is a hover: the app's Emotion cache
// (shared/ui/hoverOnlyWithHover.js, provided in main.jsx) writes every hover
// rule under `@media (hover: hover)`, so a tap on a phone never leaves the
// thing underneath lit. No component writes that query by hand, and the app
// keeps the one cache.
test('hover is gated once, by the app style cache', () => {
  assert.deepEqual(sourceLinesMatching(/hover: ?hover/, {
    allow: ['shared/ui/hoverOnlyWithHover.js'],
  }), []);
  assert.deepEqual(sourceLinesMatching(/createCache\(|<CacheProvider/, {
    allow: ['shared/ui/hoverOnlyWithHover.js', 'main.jsx'],
  }), []);
});

// A button that cannot be pressed has one look (UNPRESSABLE_SX in
// shared/ui/pressable.js, given by pressableSx/toggleSx and iconButtonLook):
// its own fill and ink, flat and quieter. MUI's disabled grey wrote a pale
// label over a coloured fill (white on gold). No screen restyles
// `.Mui-disabled` by hand.
test('a disabled button takes the one unpressable look', () => {
  assert.deepEqual(sourceLinesMatching(/'&\.Mui-disabled'/, {
    allow: ['shared/ui/pressable.js'],
  }), []);
});

// A paged list (usePagedList) lives in a scroller and loads more as it is
// scrolled, filling a scroller taller than its rows by itself: there is no
// "Show more" button, the scroller is the way to more.
test('a paged list grows by scrolling, never by a Show more button', () => {
  assert.deepEqual(sourceLinesMatching(/Show more|showMore/), []);
});

// A list's filters are described once (shared/content/filterFields.js) and
// drawn by one component (shared/ui/FilterFieldControls.jsx): the compendium's
// catalogs and the bestiary browser alike. A creature's filters are
// MONSTER_FILTER_FIELDS (shared/bestiary/filters.js), the compendium's monster
// catalog included.
test("a list's filters are described once and drawn by FilterFieldControls", () => {
  assert.deepEqual(sourceLinesMatching(/anyValue\(|YES_NO_OPTIONS/, {
    allow: ['shared/content/filterFields.js', 'shared/ui/FilterFieldControls.jsx'],
  }), []);
  assert.deepEqual(sourceLinesMatching(/key: 'crFrom'|key: 'crTo'/, {
    allow: ['shared/bestiary/filters.js'],
  }), []);
});

// Every filter takes several choices at once. A drop-down filter is a field of
// shared/content/filterFields.js (a list of values, any of them kept; `single`
// only for a bound such as CR from), drawn by FilterFieldControls; a row of
// toggles is FilterToggles with `values` (toggleChoices.js: All clears, the
// others go on and off), never one `value` at a time.
test('every filter takes several choices at once', () => {
  assert.deepEqual(sourceLinesMatching(/<FilterToggles[^>]*\svalue=/), []);
  assert.deepEqual(sourceLinesMatching(/kind: 'multiSelect'/), []);
});

// A button that adds or creates something is an AddButton (shared/ui): the +
// and its label, filled for a screen's own action (`main`), outlined
// otherwise. A number typed by hand is a NumberField (comma or point, the
// decimal keypad, its unit after it): the range filters, a weight, a price.
test('an add button is an AddButton and a typed number a NumberField', () => {
  assert.deepEqual(sourceLinesMatching(/startIcon=\{<Plus/, { allow: ['shared/ui/AddButton.jsx'] }), []);
  assert.deepEqual(sourceLinesMatching(/inputMode: 'decimal'/, { allow: ['shared/ui/NumberField.jsx'] }), []);
});

// Every list of items (the sheet's Add Item and Inventory, the builder's Add
// items and Current inventory) is an ItemBrowser inside an ItemListSection:
// one search, the shelves and states, the filters, the count and the scrolling
// well. No screen assembles them by hand.
test('an item list is an ItemBrowser', () => {
  assert.deepEqual(sourceLinesMatching(/useItemListQuery\(/, {
    allow: ['shared/character/inventory/ItemBrowser.jsx', 'shared/character/inventory/useItemListQuery.js'],
  }), []);
});

// A button that empties something and starts it over (the encounter panel,
// the filters, conditions and effects, the roll log) is a ClearButton.
test('a clear button is a ClearButton', () => {
  assert.deepEqual(sourceFilesMatching(/<Button[^>]*>\s*Clear( all)?\s*<\/Button>/, { allow: ['shared/ui/ClearButton.jsx'] }), []);
});

// The encounter builder's panels read it through encounterPanel (memoized on
// the state keys and context values they declare) and its acting parts through
// useEncounterDispatch: only the page shell reads the whole context.
test('an encounter builder panel is an encounterPanel', () => {
  assert.deepEqual(sourceLinesMatching(/useEncounterBuilder\(\)/, {
    allow: ['pages/encounterbuilder/state/EncounterBuilderContext.jsx', 'pages/encounterbuilder/EncounterBuilderPage.jsx'],
  }), []);
});

// A search box is a SearchField (compact in dense panels), or a
// DraftSearchField when its text lives in a page reducer; there is no
// builder-only search look.
test('a search box is a SearchField or a DraftSearchField', () => {
  assert.deepEqual(sourceFilesMatching(/SelectionSearch/), []);
});

// A search box's placeholder reads one way everywhere: "Search <what>…", a
// short plural noun and the ellipsis character — no "...", no list of fields.
test('a search placeholder reads "Search <what>…"', () => {
  const placeholder = /[pP]laceholder\s*[=:]?\s*\{?[^'"`]*['"`]Search\b/;
  const shape = /['"`]Search( [a-z$][\w${}.() ]*)?…['"`]/;
  const hits = sourceLinesMatching(placeholder).filter((hit) => {
    const [file, line] = hit.split(':');
    const text = readSource(file).split('\n')[Number(line) - 1];
    return !shape.test(text) || /\.\.\./.test(text);
  });
  assert.deepEqual(hits, []);
});

// Every icon of the game's world (a weapon, a skull, a scroll, a castle, a
// die, a rest…) is a role of GAME_ICONS (shared/ui/gameIcons.js), named by
// what it stands for: a new look for the whole app is that one file. Plain
// interface icons (close, add, edit, chevrons) stay where they are used.
const WORLD_LUCIDE_ICONS = [
  'Swords', 'Sword', 'Skull', 'Shield', 'ShieldCheck', 'ShieldX', 'ShieldQuestion', 'ShieldPlus', 'ShieldHalf',
  'ShieldAlert', 'Sparkles', 'ScrollText', 'Scroll', 'Castle', 'Flame', 'Gem', 'BookOpen', 'Backpack', 'HeartPulse',
  'Dices', 'Dice5', 'Moon', 'Sun', 'Coins', 'PawPrint', 'Footprints', 'Leaf', 'Tent', 'Wand2', 'Rabbit',
  'DoorOpen', 'Hourglass', 'Crosshair',
];
test('an icon of the game world is a GAME_ICONS role', () => {
  const world = new RegExp(`import \\{[^}]*\\b(${WORLD_LUCIDE_ICONS.join('|')})\\b[^}]*\\} from 'lucide-react'`);
  assert.deepEqual(sourceFilesMatching(world, { allow: ['shared/ui/gameIcons.js'] }), []);
  assert.deepEqual(sourceFilesMatching(/from 'react-icons\/gi'/, { allow: ['shared/ui/gameIcons.js'] }), []);
});

// A tool's mark (the home's card, its page header, its picker, the Links
// menu) is its TOOL_ICONS drawing in its TOOL_CATALOG colour: the catalog
// takes no icon of its own, and a page header is given the tool, never an
// icon or a colour, so it always matches the tool's card.
test('a tool icon is a TOOL_ICONS drawing', () => {
  assert.deepEqual(sourceFilesMatching(/from 'lucide-react'/).filter((file) => file.endsWith('toolCatalog.js')), []);
  assert.deepEqual(sourceFilesMatching(/<PageHeader(?:[^>]|=>)*\b(icon|iconColor)=/), []);
});

// Every list of saved things (the library of each tool, the campaigns, the
// battle map's tables and scenes, the encounter library and the map's
// encounter import) is searched, and filtered by group (a campaign, a quest:
// filterFields' groupField), through the one ListFilterBar and useListFilter
// (shared/ui), never a search and a filter of its own.
test("a main page's list takes the ListFilterBar", () => {
  const lists = [
    'pages/library/SectionPicker.jsx', 'pages/library/CharacterPicker.jsx', 'pages/campaigns/CampaignsPage.jsx',
    'pages/vtt/session/CampaignTablePicker.jsx', 'pages/vtt/scene/ScenePicker.jsx',
    'pages/encounterbuilder/library/LibraryView.jsx', 'pages/vtt/tokens/EncounterImportDialog.jsx',
  ];
  const withBar = new Set(sourceFilesMatching(/<ListFilterBar\b/));
  assert.deepEqual(lists.filter((file) => !withBar.has(file)), []);
  assert.deepEqual(sourceFilesMatching(/\buseListFilter\(/, { allow: ['shared/ui/useListFilter.js'] })
    .filter((file) => !withBar.has(file) && !file.endsWith('useLibraryFilter.js')), []);
});

// Every hit point bar (the sheet, a combatant, a companion, a piece on the
// map) is HitPointBars over SegmentedMeter (shared/): its tone, its cushion
// and its look are decided once. A bar of its own — a progress bar or a
// width share next to the hit point tone — is not one.
// A bar whose share changes (hit points, XP, a resource, the carried weight)
// is a SegmentedMeter: its share rides on the element (useLiveStyle), one
// style rule for every bar. A share written as a width in sx mints a rule per
// value, and a bar dragged with the finger mints one per pixel.
test('a share drawn as a width is a SegmentedMeter', () => {
  assert.deepEqual(sourceLinesMatching(/width: `\$\{[^`]*\}%`/), []);
});

// How many there are, beside a title or a label, is a CountSeal (shared/ui):
// its figure on a seal, read aloud as "(n)". A count written into the text,
// "Manage (3)" or "(12)", is not one.
test('a count beside a label is a CountSeal', () => {
  assert.deepEqual(sourceLinesMatching(/\(\$\{[\w.]*(count|length|size)\}\)|>\(\{[\w.]*(count|length|size)\}\)</, {
    allow: ['shared/ui/CountSeal.jsx'],
  }), []);
});

// Something on the way is the logo's turning die (BusyDie), never MUI's
// spinning ring. A heading over a group of controls or facts is SectionTitle
// (the diamond, the words, the rule), never a caption label restyled on the
// spot. A rule's list, boxed text and table are set by ruleText.js in both
// renderers (EntryBlocks, EntryRenderer).
test('a busy mark is BusyDie and a group heading is SectionTitle', () => {
  assert.deepEqual(sourceFilesMatching(/CircularProgress/), []);
  assert.deepEqual(sourceLinesMatching(/(groupLabel|sectionTitle|historyTitle)Sx = .*captionLabelSx/), []);
  assert.deepEqual(sourceLinesMatching(/'&::marker'/), []);
});

test('a hit point bar is HitPointBars', () => {
  assert.deepEqual(sourceFilesMatching(/LinearProgress[\s\S]*hpToneColor|hpToneColor[\s\S]*LinearProgress/), []);
  assert.deepEqual(sourceFilesMatching(/hitPointShares\(/, {
    allow: ['shared/character/combat/vitals.js', 'shared/character/combat/HitPointBars.jsx'],
  }), []);
});

// The look's cut shapes (a ribbon's notch, a seal, a crest, a bookmark tab,
// a gem's cut, a meter's segments, a roll's burst) are shapes.js's: a new
// theme recuts them there. A cut written in a component (a clip-path polygon
// of its own, the seal's radius, a burst's spikes) is not one.
test("the look's shapes live in shapes.js", () => {
  assert.deepEqual(sourceFilesMatching(/clipPath: ['`]polygon\(/, { allow: ['shared/ui/shapes.js', 'shared/character/dice/polyhedra.js'] }), []);
  assert.deepEqual(sourceFilesMatching(/46% 54% 48% 52%/, { allow: ['shared/ui/shapes.js'] }), []);
  assert.deepEqual(sourceFilesMatching(/\b(spikes|arms|valleys): \[\[/, { allow: ['shared/ui/shapes.js'] }), []);
  assert.deepEqual(sourceFilesMatching(/\bpolygon\(\s*[46],/, { allow: ['shared/ui/shapes.js'] }), []);
});

// Every counter spent and recovered one at a time (spell and pact slots, a
// feature's uses, free casts, hit dice) is a row of GemPips: the cut, colours
// and sizes live in shared/ui/GemPip.jsx only, so a new look is one file.
test('a spendable counter is a GemPip', () => {
  assert.deepEqual(sourceFilesMatching(/PipButton/), []);
  assert.deepEqual(sourceFilesMatching(/GEM_TONES\s*=|GEM_SIZES\s*=/, { allow: ['shared/ui/GemPip.jsx'] }), []);
});
