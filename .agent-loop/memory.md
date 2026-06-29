# Project Memory - GM-Board

App = React 19 + Vite + MUI + Supabase SPA in `react-app/`. D&D data fetched live from
5etools mirrors and must not be vendored. Builder and Sheet share one unified character object.

## Project Rules

- Data repo: `https://github.com/5etools-mirror-3/5etools-src/tree/main/data`
- Image repo: `https://github.com/5etools-mirror-2/5etools-img`
- Runtime fetch only; do not copy/commit 5etools JSON or image assets.
- Allowed source codes: `XPHB`, `XMM`, `XDMG`, `FRAIF`, `FRHOF`, `EFA`, `RWH`.
- Raw 5etools bestiary codes may differ: `FRAIF -> FRAiF`, `FRHOF -> FRHoF`, `RWH -> RHW`.
- Ignore/reject non-whitelisted sources; no homebrew; no legacy `PHB/DMG/MM` unless explicitly mapped.
- `.agent-loop/config.yaml` verify cmd: `git diff --check`; base branch `feature/unified-character-storage`; clean repo not required.

## Entry Points

- `src/main.jsx`: ThemeProvider -> ToastProvider -> BrowserRouter -> AuthProvider -> App.
- `src/App.jsx`: routes `/`, `/charbuilder`, `/charsheet`, `/gmboard`, `/gmsheets`, `/campaigns`, `/campaign-sheet`, `/encounter-builder`; mounts `CloudAutoSync`.
- `pages/encounterbuilder/EncounterBuilderPage.jsx`: native React encounter builder shell, no iframe.
- `pages/gmboard/GmBoardPage.jsx`: still hosts `public/tools/gmboard.html` via `StandaloneHtmlFrame`.
- `public/tools/encounter-builder.html` was retired/deleted.

## Encounter Builder React Architecture

- Feature lives under `src/pages/encounterbuilder/`.
- Shell: `EncounterBuilderPage.jsx` resolves `?enc=`, registers save-instance UX, renders MUI tabs: Builder / Library / Encounter.
- State: `state/EncounterBuilderContext.jsx` + `state/reducer.js`.
- Hooks: `hooks/useMonsterDb.js`, `hooks/useEncounterPersistence.js`, `hooks/useCampaignPlayers.js`.
- Logic modules: `logic/bestiary.js`, `constants.js`, `combat.js`, `dice.js`, `difficulty.js`, `filters.js`, `markup.js`, `monsterUtils.js`, `storage.js`.
- Components: Builder/Library/Combat views, MonsterList, EncounterList, PartyConfig, CampaignImport, Reinforcements, CombatantCard, StatBlockDialog, RollLog.
- No `postMessage`, no `StandaloneHtmlFrame`, no `innerHTML` in the React feature.

## Encounter Data Loading

- `logic/constants.js`: `DATA_BASE`, `IMAGE_BASE`, `CR_XP`, `XT`, raw/project source mappings, type options.
- `logic/bestiary.js`: memoized `getJson`, loads `bestiary/index.json` and `bestiary/legendarygroups.json`.
- Allowed raw source files are loaded from the index; monsters are filtered to `RAW_ALLOWED_SOURCES`.
- Legendary groups support `_copy` inheritance and array mods for lair/regional/mythic text.
- Tokens use app image repo mirror-2; ensure fallback token paths do not use legacy source folders.

## Encounter Builder Behavior

- Builder view:
  - Source chips use raw bestiary source codes.
  - Search, CR, and type filters mirror old `applyF` behavior.
  - Encounter list stores lightweight rows plus hydrated `monsterData` while DB is available.
  - Difficulty uses 2024 RAW: raw monster XP sum, no encounter multiplier, `XT[level-1] * party.count`.
  - Party config supports count, level, names, HP, AC, init, colors.
- Library view:
  - Saved encounters are lightweight: name/source/cr/xp/qty; no full monster data.
  - Supports load, delete, launch, resume saved fights.
- Combat view:
  - Initiative = d20 + dex/init mod; sorted descending; round starts at 1.
  - Next/previous skip `isDead`; round bumps on wrap; reroll-all exists.
  - Monsters die at 0 HP; players at 0 show death saves; 3 failed saves sets dead.
  - Reinforcements include global DB search and manual quick-add.
  - Fight snapshots store HP/init/death saves/round plus `monsterRef`.
  - Right column shows selected monster statblock via `StatBlockPanel`; `StatBlockDialog` still handles Builder/Library.
  - Roll log is opened from bottom-left `RollLogLauncher`, not kept as the combat right rail.
  - Changing tabs clears `selectedStatblock` so monster sheets do not stay open across views.
  - Combatant rows keep HP bar, HP field, heal/damage controls, death saves, and remove action in one HP/action row.
  - Combat HP and delta inputs select their full value on focus/click for fast overwrite.

## Encounter Persistence

- New scoped localStorage keys:
  - `gb:enc:<id>:party:v1`
  - `gb:enc:<id>:draft:v1`
  - `gb:enc:<id>:library:v1`
  - `gb:enc:<id>:fights:v1`
- Registry contract preserved:
  - `gb_encounter_registry`
  - `gb_active_encounter_id`
  - Home registry prefix remains `gb:enc:<id>:`.
- Unsaved instances do not auto-persist scoped data; Save Instance registers the instance and persists current state.
- Saved instances auto-persist state changes through `useEncounterPersistence`.

## Encounter Dice / Markup

- `logic/dice.js`: dice formulas, d20 modifiers, result classing, roll log cap `LOG_MAX=60`.
- Encounter roll toasts reuse the character sheet `DiceToast` style through `EncounterDiceToast`, shown bottom-right.
- `EncounterBuilderContext.roll()` returns roll result plus actor so toast labels can include the selected/current combatant.
- `logic/markup.js` parses 5etools tags into safe React tokens.
- Supported key tags include `{@hit}`, `{@damage}`, `{@d20}`, `{@spell}`, `{@dc}`, `{@h}`, `{@atk}`, `{@recharge}`, `{@i}`, `{@b}`, `{@filter}`, action save tags.
- `StatBlockDialog` renders statblocks with clickable abilities, saves, skills, HP formula, action text rolls, spell links, lair/regional/mythic sections.

## Campaign Import / Sheets

- `hooks/useCampaignPlayers.js` reuses:
  - `shared/cloud/campaigns.js`: `listMyCampaigns`, `listCampaignCharacters`
  - `adapters/index.js`: `loadCoreAdapters`, `loadClassAdapters`
  - `pages/campaigns/sheetSummary.js`: `summarizeCharacter`
- Campaigns filtered to `campaign.gm === user.id`.
- Imported players project to encounter shape with `level`, `ac`, `hpMax`, `initMod`, `iconColor`.
- Open sheet links target `/campaign-sheet?id=<id>&edit=1` in a new tab.

## Character Builder / Sheet

- Builder shell: `pages/charbuilder/CharBuilder.jsx`; reducer `pages/charbuilder/state.js`; steps in `pages/charbuilder/steps/`.
- Builder logic: `pages/charbuilder/logic/*`; shared character logic in `src/shared/character/*`.
- Sheet shell: `pages/charsheet/CharacterSheet.jsx`; derived state in `pages/charsheet/state.js`.
- Sheet tabs: Actions, Spells, Inventory, Features, Notes.
- Runtime adapters: `adapters/index.js`, `registry.js`, `adapterBindings.js`, `adapterPipeline.js`.
- Character local store keys: `gb:char:<id>`, `gb:chars`, `gb:active_char`.
- Cloud characters use Supabase via `shared/cloud/cloudCharacters.js`.

## Verification

- `cd react-app && npm run build` is the real build gate, but it writes output.
- `cd react-app && npm test` now runs encounter logic tests under `src/pages/encounterbuilder/logic/*.test.js`.
- `git diff --check` should pass.
- Manual encounter checks: `/encounter-builder?enc=new`, load monsters, filter/add, difficulty, launch, turns, HP/death saves, reinforcements, save instance, reload persistence, Home listing, Library load/resume, GM campaign import/open sheet.

## Gotchas

- `public/tools/*.html` are not Vite-bundled; only GM board remains there.
- MUI 9/React 19 can leak `Stack` layout props to DOM; put `alignItems`, `justifyContent`, `flexWrap`, `minHeight`, `gap` in `sx`.
- `npm test` used to be no-op but now discovers encounter logic tests.
- Build was not run in read-only review because Vite writes `dist`.
- Registry deletion in `shared/localStorageRegistries.js` removes keys by `gb:enc:<id>:` prefix, compatible with new encounter keys.
- Keep encounter data runtime-fetched; never vendor 5etools JSON/images.
