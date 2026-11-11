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
      'shared/content/entryText.js',
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

// Every dialog is a SheetDialog, or a BattleMapDialog over the map: one
// surface, one title bar, one close button.
test('dialogs go through SheetDialog or BattleMapDialog', () => {
  assert.deepEqual(sourceFilesMatching(/<Dialog\b/, {
    allow: ['shared/ui/SheetDialog.jsx', 'pages/vtt/map/BattleMapDialog.jsx'],
  }), []);
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
    'pages/charsheet/spells/spellSourceDisplay.js', 'shared/character/inventory/currency.js',
    'shared/ui/swatches.js', 'shared/ui/ColorField.jsx', 'shared/vtt/scene/imageFilters.js',
    'shared/hexcrawl/hexCell.js', 'shared/dungeon/roomMarkers.js',
    'shared/character/dice/D100Orb.jsx', 'shared/character/dice/Die3D.jsx',
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
  // entry name) or the prose face's own flourish.
  assert.deepEqual(sourceLinesMatching(/fontStyle:\s*'italic'/, { allow: [...allow,
    'shared/content/RichText.jsx', 'pages/charsheet/forms/BeastStatBlock.jsx', 'pages/home/HomePage.jsx', 'pages/library/styles.js'] }), []);
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
  assert.deepEqual(sourceLinesMatching(/(?<![\w.$])[1-9]\d{1,2}ms/, { allow: ['shared/ui/motion.js', 'shared/character/dice/D100Orb.jsx'] }), []);
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
