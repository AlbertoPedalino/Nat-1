# Project Memory — GM-Board

Accumulated by the agent loop. Curated, advisory (verify against code, not authoritative).
App = React 19 + Vite + MUI + Supabase SPA in `react-app/`. D&D data fetched live from a
5etools mirror, never vendored. Builder and Sheet are two halves of one unified character pipeline.

## Entry points
- `react-app/src/main.jsx` — root mount: ThemeProvider → ToastProvider → BrowserRouter → AuthProvider → App.
- `src/App.jsx` — router (`/charbuilder`, `/charsheet`, gmboard/campaigns/encounter); mounts `CloudAutoSync` globally.
- `src/pages/charbuilder/CharBuilder.jsx` — builder shell + orchestration brain (most important single file).
- `src/pages/charsheet/CharacterSheet.jsx` — live play sheet.
- Standalone `public/tools/*.html` are separate, not part of the React builder.

## Builder components
Shell drives 6 tabs (`constants.js → STEPS`): Class, Species, Background, Ability Scores, Equipment, Sheet.
- `steps/` — one container per tab (`ClassStep`, `SpeciesStep`, …, `SheetStep`).
- `components/` — panels (`ClassPanel`, `SubclassPanel`, `LevelPanel`, `SpellSelectionPanel`, `PreviewPane` right-rail live preview, …).
- `logic/` — `calculations.js`, `choiceSpecs.js`, `featPrerequisites*.js`, `multiclassRules.js`, `dataLoaders.js`, `persistence.js`, `previewSheet.js`, `characterExport.js`.
- `src/shared/character/*` (~90 files) — logic shared builder+sheet (proficiencies, spells, items, currency, AC, HP, rest, weaponMastery…).

## State + storage
- State = single `useReducer` in `CharBuilder.jsx`; reducer = `state.js → builderReducer`.
- `updateCharacter` rebuilds `normalizedChoices` (`shared/choiceNormalization.js`) on `NORMALIZE_SOURCE_FIELDS` change — single source of truth for derived profs/spells.
- Level = primary classLevel + sum(extraClasses levels); XP is an independent tracker, does NOT drive level.
- Persistence (`logic/persistence.js`): `buildSheetCharacter` → `makeSheetPayload` builds the unified object (snapshots + `adapterRuntime`), then `stripHeavyFields` before save.
- Storage branches on auth (autosave effect in `CharBuilder.jsx`): logged out → `shared/character/store.js` localStorage (`gb:char:<id>`, debounce 300ms); logged in → Supabase `shared/cloud/cloudCharacters.js` (debounce 1200ms). Import draft persisted only on explicit save/upload.
- Sheet loads same unified object, derives via `charsheet/state.js → deriveSheetState`, patches back (`storePatchCharacter` / `updateCloudCharacterData`).

## Data loading
- `CharBuilder.jsx` mount fires ~8 parallel loaders → `dispatch data/load-*`.
- `logic/dataLoaders.js` fetches from `DATA_BASE` (`constants.js`, 5etools-mirror-3 raw GitHub); `getJson` memoizes per path. Each loader source-filters at load, dedupes by source priority, sorts.
- File lists in `constants.js`: `CLASS_FILES`, `SPELL_FILES`, `BEAST_FILES`. Tiny summary fallbacks seed state until fetch lands.

## Source filtering (D&D 2024 whitelist) — single source of truth
- `src/shared/character/sourcePriority.js`: `CORE_2024_SOURCE_PRIORITY` master list; content whitelists derive from it (`SPECIES_/BACKGROUND_/FEAT_/OPTIONAL_FEATURE_ALLOWED_SOURCES`, `ITEM_SOURCE_PRIORITY`). Narrow: `CLASS_ALLOWED_SOURCES`, `BEAST_ALLOWED_SOURCES`. Helpers: `isAllowedSource`, `sourceRank`, `compareBySourcePriority`, `isSupportedEdition`.
- `src/shared/character/sourceFiltering.js` — subclass gates (`isSupportedSubclassRecord/Feature`).
- Applied per loader in `dataLoaders.js` (classes/species/backgrounds/feats/optionalFeatures/items/beasts).
- ⚠️ GOTCHA: config whitelist `RWH` vs code `CORE_2024_SOURCE_PRIORITY` `RHW`; config casing `FRAIF/FRHOF` vs code `FRAiF/FRHoF`. `isAllowedSource` matches exact string → mismatch can silently drop a source. Confirm intended spelling before any source-list work.

## Adapter system (behavior layer)
Content = data-driven from 5etools; behavior = adapters in `src/adapters/`.
- `registry.js` — `createAdapterRegistry()`: ~50 keyed Maps; singleton `adapterRegistry`.
- `index.js` — lazy loader via `import.meta.glob`: `loadCoreAdapters`, `loadClassAdapters(classNames)` (active classes only).
- `adapterBindings.js` — `createAdapterBindings(registry, ctx)`: API each adapter file destructures.
- `adapterPipeline.js` — `adaptBuilderData`: raw → normalized class/subclass/species/feat/spell/item.
- Adapter files: `classes/<class>/<subclass>.js`, `feats/`, `species/`, `items/`, `spells/`. Sheet behavior between `[SheetRuntime]` markers (`registerClassSheetActions/Resources`).

## Action tab
- `src/pages/charsheet/logic/actionsTabLogic.js` builds action cards; rendered by `components/ActionsTab.jsx` + `ActionDetailPanel.jsx`.
- `collectAdapterActions` pulls from live `installedRegistry` (preferred) or serialized `adapterRuntime` fallback; filters by level/condition/executability.
- `makeWeaponActions`, `makeWildShapeActions`, `buildActionTags`, `resolveActionFormulas`; dedup via `uniqBySignature`.

## Character sheet
- `CharacterSheet.jsx` loads unified char, calls `ensureSheetRuntimeAdapters` (re-installs adapters from snapshot class names — best-effort), reconciles inventory, derives `sheet` via `deriveSheetState`.
- Layout `layout.js`; components in `charsheet/components/`; `TabsPanel` → Actions/Spells/Features/Inventory/Background/Notes.
- Read-only mode (cloud foreign sheets): mutations become no-ops, dice still roll.

## Key files for future work
| Concern | File |
|---|---|
| Builder orchestration / autosave / cloud-vs-local | `pages/charbuilder/CharBuilder.jsx` |
| Builder state machine | `pages/charbuilder/state.js` |
| Unified char build/import/export | `pages/charbuilder/logic/persistence.js` |
| Runtime data fetch + filtering | `pages/charbuilder/logic/dataLoaders.js` |
| Source whitelist (single SoT) | `shared/character/sourcePriority.js` (+ `sourceFiltering.js`) |
| Data file lists + DATA_BASE | `pages/charbuilder/constants.js` |
| Adapter registry/API/loader/pipeline | `adapters/{registry,adapterBindings,index,adapterPipeline}.js` |
| Add class/subclass/species/feat behavior | `adapters/{classes,species,feats,items}/...` |
| Sheet shell + persistence-back | `pages/charsheet/CharacterSheet.jsx` |
| Action cards | `pages/charsheet/logic/actionsTabLogic.js` |
| Local storage primitives | `shared/character/store.js` |
| Cloud sync | `shared/cloud/{cloudCharacters,CloudAutoSync,AuthProvider}.js` |

## Gotchas / risks
- No project unit tests: only `*.test.js` match is in `node_modules`; `package.json` test = `node --test` finds nothing in `src/`. Verification leans on `npm run build` + manual.
- Builder + Sheet share one serialized schema; any field change must round-trip `makeSheetPayload` (write) ↔ `deriveSheetState` / `buildBuilderStateFromSheetPayload` (read). Easy to break silently.
- Serialized `adapterRuntime` loses function props; live registry re-derivation (`ensureSheetRuntimeAdapters`) is the real path, serialized = stale fallback.
- Source-spelling mismatch (see Source filtering) — verify before touching whitelists.
- Data is runtime-fetched only; never vendor/commit 5etools JSON or images; preserve fetch behavior.

## Verification
- `npm run build` (vite) — primary smoke check (no unit suite).
- `git diff --check` — config-mandated.
- Manual builder→sheet round-trip (create, reload, open sheet) since no automated coverage.
