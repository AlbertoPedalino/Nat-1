# Project Memory - GM-Board

Accumulated by agent-loop runs. Curated, advisory; verify against code before editing.
App = React 19 + Vite + MUI + Supabase SPA in `react-app/`. D&D data fetched live from
5etools mirrors and must not be vendored. Builder and Sheet share one unified character object.

## Project Rules

- Data repo: `https://github.com/5etools-mirror-3/5etools-src/tree/main/data`
- Image repo (app): `https://github.com/5etools-mirror-2/5etools-img`
- Runtime fetch only; do not copy/commit 5etools JSON or image assets.
- Allowed source codes (config): `XPHB`, `XMM`, `XDMG`, `FRAIF`, `FRHOF`, `EFA`, `RWH`.
- Ignore/reject non-whitelisted sources; no homebrew; no legacy `PHB/DMG/MM` unless mapped to 2024.
- `.agent-loop/config.yaml` verify cmd: `git diff --check`; base branch `feature/unified-character-storage`; clean repo not required.

## Entry Points

- `src/main.jsx`: ThemeProvider -> ToastProvider -> BrowserRouter -> AuthProvider -> App.
- `src/App.jsx`: routes `/`, `/charbuilder`, `/charsheet`, `/gmboard`, `/gmsheets`, `/campaigns`, `/campaign-sheet`, `/encounter-builder`; mounts `CloudAutoSync` globally.
- `pages/charbuilder/CharBuilder.jsx`: builder shell/orchestration brain.
- `pages/charsheet/CharacterSheet.jsx`: live play sheet.
- `pages/campaignsheet/CampaignSheetView.jsx`: cloud/campaign sheet wrapper; passes `externalChar` into `CharacterSheet`.
- `pages/encounterbuilder/EncounterBuilderPage.jsx`: thin iframe host for the standalone encounter builder.
- Standalone `public/tools/*.html` (`encounter-builder.html`, `gmboard.html`) are separate vanilla-JS apps, NOT bundled by Vite.

## Builder Components

Builder shell drives 6 tabs (`constants.js -> STEPS`): Class, Species, Background, Ability Scores, Equipment, Sheet.
- `pages/charbuilder/steps/`: tab containers (`ClassStep`...`SheetStep`).
- `pages/charbuilder/components/`: panels (`ClassPanel`, `SubclassPanel`, `LevelPanel`, `SpellSelectionPanel`, `PreviewPane`...).
- `pages/charbuilder/logic/`: `calculations.js`, `choiceSpecs.js`, `featPrerequisites*.js`, `multiclassRules.js`, `dataLoaders.js`, `persistence.js`, `previewSheet.js`, `characterExport.js`.
- `src/shared/character/*`: shared builder+sheet logic (choices, proficiencies, spells, items, currency, AC, HP, rest, weapon mastery, wild shape...).

## Builder State + Storage

- Builder state = one `useReducer` in `CharBuilder.jsx`; reducer `pages/charbuilder/state.js`.
- `updateCharacter` rebuilds `normalizedChoices` (`shared/choiceNormalization.js`) when normalized fields change.
- Level = `classLevel` + `extraClasses` levels; XP independent, does not drive level.
- `logic/persistence.js`: `buildSheetCharacter` -> `makeSheetPayload` builds unified object, then `stripHeavyFields`. `buildSheetCharacter(character,data,previous)` merges `previous` first, preserving sheet-only fields (HP, resources, notes, slot usage, conditions).
- Local: `shared/character/store.js` writes `gb:char:<id>`, `gb:chars`, `gb:active_char`.
- Cloud: `shared/cloud/cloudCharacters.js` writes Supabase `characters.data`.
- Autosave: local ~300 ms, cloud ~1200 ms; imported drafts not persisted until explicit save/upload.

## Data Loading (builder/sheet)

- `pages/charbuilder/logic/dataLoaders.js` fetches from `DATA_BASE` in `constants.js` (`raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/`). `getJson` memoizes.
- Loaders source-filter, dedupe by source priority, sort. Sheet loaders: `loadItems`, `loadOptionalFeatures`, `loadConditions`, `loadSpells`, `loadVariantRules`, `loadBeasts`.
- `loadConditions()` -> `conditionsdiseases.json`, keeps `source==='XPHB'`, lowercase keys.
- `reconcileInventoryWithItemsDb()` refreshes item/effect fields, preserves user state.

## Source Filtering (builder/sheet)

- `shared/character/sourcePriority.js`: `isAllowedSource`, `sourceRank`, `compareBySourcePriority`, `isSupportedEdition`.
- `shared/character/sourceFiltering.js`: subclass/class-feature gates.
- `isAllowedSource` is exact-string sensitive; confirm spelling before edits.

## Adapter System

- Content data-driven from 5etools; behavior in `src/adapters/`.
- `adapters/registry.js`: singleton maps/register/get for classes, subclasses, species, feats, items, spells, sheet actions/resources/effects, etc.
- `adapters/index.js`: lazy `import.meta.glob('./{classes,feats,species,spells,items}/**/*.js')`; `installedRegistry`, `loadCoreAdapters`, `loadClassAdapters`, `loadSpellsAdapters`, `loadConvertedAdapters`, `reinstallAdapters`.
- `adapterBindings.js` author API; `adapterPipeline.js` normalizes records. Serialized `adapterRuntime` is fallback only (functions lost in JSON); live registry rebinding is real path.

## Character Sheet (entry/layout/flow)

- Normal: `/charsheet?char=<id>` -> `storeLoadCharacter(id)` / `getActiveCharId()`.
- Cloud: `/campaign-sheet?id=<id>` -> `getCloudCharacter` -> `<CharacterSheet externalChar=... readOnly=...>`.
- `CharacterSheet.jsx` owns orchestration, state, persistence, rests, HP/death saves, conditions, resources, dice log, providers.
- `layout.js` grid areas; render tree `ProficiencySetsProvider` -> `SheetActionsProvider` -> TopBar + grid.
- Load effect: resolve id -> load char -> `Promise.all(ensureSheetRuntimeAdapters, loadItems, loadOptionalFeatures, loadConditions)` -> reconcile inventory -> `setC` -> `setSheet(deriveSheetState)` -> init resources/freeCastUses.
- `pages/charsheet/state.js -> deriveSheetState(C)` computes/clamps maxHP, currentHP, tempHP, deathSaves, usedHD(Pools), spellSlotUsed, createdSpellSlots, sheetInventory, sheetCurrency, inspiration, activeConditions, exhaustionLevel(0-6), xpStored, notes.

## Sheet Tabs

- `components/TabsPanel.jsx`: 5 visible tabs Actions/Spells/Inventory/Features/Notes. `BackgroundTab.jsx` exists but unused (background folded into FeaturesTab).
- Actions: `ActionsTab.jsx` + `logic/actionsTabLogic.js`; builds cards from weapons, adapter actions, Wild Shape, mastery; `collectAdapterActions` prefers live registry. Handles resources/toggles/created slots/Pact/Wild Resurgence.
- Spells: `SpellsTab.jsx` + `logic/spellsTabLogic.js`; `buildSpellInfo` merges all sources; slots via `getSheetSlots`, limits `getSpellLimits`.
- Inventory: `InventoryTab.jsx`; live items, equip/attune/currency, reconciled effects.
- Features: `FeaturesTab.jsx`; class/subclass/feat/species/background buckets + Warlock invocations; level/identity/choice gates.
- Notes: `NotesTab.jsx`; `normalizePages` JSON or legacy string.

## Sheet Resources / Rest / Conditions

- `logic/restResources.js` = resource source of truth. `getAllResourceDefs` from `installedRegistry`; `normalizeResourceMax`; `resourceFullValue` (`track:'used'` full at 0); `applyResourceRest`.
- Rest: short (HD by pool, heal roll+CON, SR resources, free-cast recovery); long (HP/HD/death saves/slots/created slots, exhaustion-1, prune crafted, resource/free-cast recovery, clear toggles, `longRestCharacterPatch`). `shared/character/longRest.js` transient resets (Wild Companion dismiss).
- Conditions: `logic/calculations.js` (`CONDITIONS`, `CONDITION_IMPLIES`, `CONDITION_EFFECTS`, exhaustion). `ConditionsBlock.jsx` pills + exhaustion stepper. `rollD20` applies exhaustion penalty; `Movement.jsx` speed penalties. Exhaustion lvl6 -> HP 0.

## Sheet Runtime Adapters / Read-Only / Persistence

- `logic/sheetRuntimeAdapters.js`: `collectSheetRuntimeClassNames`, `ensureSheetRuntimeAdapters` (loadCore+loadClass, `Promise.allSettled`, best-effort degrade).
- Read-only external sheets: no local store writes; mutators replaced with no-ops; rolls still work; `TopBar` READ ONLY chip. Editable external -> 1200 ms `updateCloudCharacterData`.
- Local mutations: `storePatchCharacter(id,patch)` (shallow merge, dispatches `gb:char-saved`). Cloud autosync pushes local chars unless foreign. `pushCharacterData` builder upsert; `pullCharacter` cloud->local.

## Encounter Builder (`public/tools/encounter-builder.html`)

- **Self-contained vanilla-JS single file (~4259 lines): UI + state + data + combat + persistence.** No shared/adapter imports inside iframe. Served from `public/` (NOT Vite-bundled; `npm run build` does not typecheck it). Heavy Italian identifiers/UI.
- Host `pages/encounterbuilder/EncounterBuilderPage.jsx` loads it in `StandaloneHtmlFrame` iframe; chrome = `AppTopBar` + `SaveInstanceButton`.
- **postMessage bridge** (origin-checked): parent->iframe `gb:campaign-players`(payload), `gb:save-instance`, `gb:request-instance-state`; iframe->parent `gb:encounter-builder-ready`, `gb:instance-state{kind:'encounter',id,saved}`, `gb:open-sheet{id}` (host opens `/campaign-sheet?id=...&edit=1`).
- Host cloud import: `listMyCampaigns()` (GM only) + `listCampaignCharacters` (`shared/cloud/campaigns.js`); loads core+class adapters; `campaigns/sheetSummary.js summarizeCharacter` (deriveSheetState+AC+initiative) -> `toEncounterPlayer` flat `{level,ac,hpMax,initMod,iconColor}`.
- 3 views (tabs): Builder / Library / Encounter(combat). State = module-global vars (no React/reducer): `fullMonsterDb/allM/filtM`, `encounter[]`, `combatants[]/currentTurn/round`, `party{count,level}/players[]`, `sources/legendaryGroups/activeSrcs`, `monsterLabelMap`.
- Data: `BASE`=mirror-3 bestiary dir; **`IMG_BASE`=mirror-3 5etools-img (diverges from app's mirror-2 — flag)**. `loadIndex()` (index.json + legendarygroups.json, `_copy` resolve), `loadAllManuals()` iterates own whitelist `PREF=['XMM','XDMG','XPHB','FRAiF','FRHoF','EFA','RHW']` (lowercase i/o, RHW — differs from React `FRAIF/FRHOF/RWH`; matches raw 5etools codes), merges `d.monster` -> dedupe name+source. Chips = `PREF ∩ index keys`; empty `activeSrcs`=all.
- Persistence = **localStorage only, no Supabase for encounters**. Storage-scoping IIFE wraps `Storage.prototype`; scoped keys `5e_saved_fights`/`5e_party_data`/`5e_saved_encounters` prefixed `gb:enc:<id>:`; unsaved instances drop scoped writes. Registry `gb_encounter_registry`+`gb_active_encounter_id` (see `shared/localStorageRegistries.js`). `?enc=new|<id>|default`; legacy->`gb:enc:default:` migration `gb_enc_migrated_v1`. Saved encounters lightweight (name/source/cr/xp/qty, no monsterData); fights = combat snapshots (HP/init/deathSaves/round + monsterRef).
- Combat: `buildCombat` rolls d20+mod, sort desc; `nextTurn/prevTurn` skip dead+round bump; monsters die at 0 HP, players->death saves (3 fail=dead); reinforcements panel + manual add; `saveCombatState` auto-persists every render.
- Difficulty (2024 RAW): `calcDiff` sums raw monster XP (NO encounter multiplier), budget `XT[level-1]`×count, bands Low/Moderate/High/Deadly else Trivial.
- Dice: `rollDice`/`rollDiceFormula` clickable; `clean()` converts `{@...}` tags to rollables/spell links; `rollLog` max 60 + toast.
- `shared/character/beasts.js` = Wild Shape (sheet) only — unrelated to encounter builder.

## Key Files

| Concern | File |
|---|---|
| Sheet shell/load/persistence/read-only/rest | `pages/charsheet/CharacterSheet.jsx` |
| Sheet derived state | `pages/charsheet/state.js` |
| Sheet tabs | `pages/charsheet/components/TabsPanel.jsx` |
| Mutation context | `pages/charsheet/context/SheetActionsContext.jsx` |
| Actions/Spells logic | `pages/charsheet/logic/{actionsTabLogic,spellsTabLogic}.js` |
| Resources/rest | `pages/charsheet/logic/restResources.js`, `shared/character/longRest.js` |
| Conditions/calc | `pages/charsheet/logic/calculations.js`, `components/ConditionsBlock.jsx` |
| Runtime adapter rebinding | `pages/charsheet/logic/sheetRuntimeAdapters.js` |
| Builder orchestration/state/payload/loaders | `pages/charbuilder/{CharBuilder.jsx,state.js,logic/persistence.js,logic/dataLoaders.js}` |
| Source whitelist | `shared/character/{sourcePriority,sourceFiltering}.js` |
| Adapter registry/API/loader/pipeline | `adapters/{registry,adapterBindings,index,adapterPipeline}.js` |
| Local/cloud storage | `shared/character/store.js`, `shared/cloud/{cloudCharacters,CloudAutoSync,AuthProvider}.js` |
| **Encounter builder (all-in-one)** | `public/tools/encounter-builder.html` |
| Encounter host bridge | `pages/encounterbuilder/EncounterBuilderPage.jsx` |
| Iframe chrome | `components/{StandaloneHtmlFrame,SaveInstanceButton,AppTopBar}.jsx` |
| Instance registries (Home listing) | `shared/localStorageRegistries.js` |
| Player summary / cloud campaigns | `pages/campaigns/{sheetSummary.js,campaigns.js}` |

## Gotchas / Risks

- No source tests under `react-app/src`; `package.json` test = no-op `node --test`. Verify via `npm run build`, `git diff --check`, manual flows.
- `public/tools/*.html` NOT covered by Vite build/typecheck; test by loading the page.
- Encounter builder `IMG_BASE` uses mirror-3 img (app elsewhere uses mirror-2) — divergence.
- Encounter builder has its own source whitelist `PREF`/`FULL_NAMES` (`FRAiF/FRHoF/RHW` casing) separate from React `sourcePriority.js`.
- Encounters are local-only; campaign player import is a one-time numeric snapshot, not live/cloud-synced.
- Builder/Sheet share one serialized schema; field changes must round-trip `makeSheetPayload`/`buildSheetCharacter` and `deriveSheetState`. Shallow merges — nested patches need care.
- Serialized `adapterRuntime` loses functions; ensure live adapters loaded.
- Data must stay runtime-fetched; never vendor 5etools JSON/images.

## Verification

- `cd react-app && npm run build`
- `cd react-app && npm test` (no-op)
- `git diff --check`
- Manual sheet: create/save builder char, open `/charsheet?char=<id>`, reload, verify persistence; cloud `/campaign-sheet?id=<id>` read-only + editable; rest/resource checks.
- Manual encounter: `/encounter-builder?enc=new` add monsters, difficulty, Launch combat, turns, Save instance, reload, Library launch/resume; signed-in GM campaign import + open-sheet relay.
