# Project Memory

App is React 19 + Vite + MUI + Supabase SPA in `react-app/`. D&D data is fetched live from 5etools mirrors and must not be vendored. Builder and Sheet share one unified character object.

## Project Rules

- Data repo: `https://github.com/5etools-mirror-3/5etools-src/tree/main/data`
- Image repo: `https://github.com/5etools-mirror-2/5etools-img`
- Runtime fetch only; do not copy/commit 5etools JSON or image assets.
- Allowed source codes: `XPHB`, `XMM`, `XDMG`, `FRAIF`, `FRHOF`, `EFA`, `RWH`.
- Raw bestiary source mappings may differ: `FRAIF -> FRAiF`, `FRHOF -> FRHoF`, `RWH -> RHW`.
- Ignore/reject non-whitelisted sources; no homebrew; no legacy `PHB/DMG/MM` unless explicitly mapped.
- Prefer minimal, scoped changes. Avoid committing `.agent-loop` run artifacts unless explicitly requested.

## UI Conventions

- GM-Board is dark-only fantasy UI; theme tokens live in `react-app/src/theme.js`.
- Style UI with MUI `sx`; do not add CSS files, inline `style`, or `styled()` components.
- Use theme palette tokens instead of component hex values.
- Icons come from `lucide-react`.
- Entity tinting goes through `react-app/src/shared/entityColors.js`.
- Long data lists should use `react-window` virtualization.
- Toasts go through `ToastProvider` / `AppToast`.

## Entry Points

- `src/main.jsx`: ThemeProvider -> ToastProvider -> BrowserRouter -> AuthProvider -> App.
- `src/App.jsx`: routes `/`, `/charbuilder`, `/charsheet`, `/gmboard`, `/gmsheets`, `/campaigns`, `/campaign-sheet`, `/encounter-builder`; legacy `/builder` and `/sheet` redirect to character builder/sheet.
- Unknown routes should render `src/pages/notfound/NotFoundPage.jsx`, showing a themed not-found message, missing path, and home navigation.
- Page folders generally follow `src/pages/<feature>/<FeaturePage>.jsx`.
- `CloudAutoSync` mounts from `App`.
- `components/AppTopBar.jsx` provides the fixed top bar and `APP_TOP_BAR_HEIGHT`.

## Character Builder / Sheet

- Builder shell: `pages/charbuilder/CharBuilder.jsx`; reducer `pages/charbuilder/state.js`; steps in `pages/charbuilder/steps/`.
- Builder logic: `pages/charbuilder/logic/*`; shared character logic in `src/shared/character/*`.
- Sheet shell: `pages/charsheet/CharacterSheet.jsx`; derived state in `pages/charsheet/state.js`.
- `deriveSheetState(C)` derives current HP, max HP, max HP bonus, temp HP, death saves, inventory/currency, inspiration, conditions, exhaustion, slots, notes, and arcane armor key.
- `summarizeCharacter(C)` derives encounter-relevant sheet vitals from a full character object; `maxHP` is derived, not stored.
- Character local store keys: `gb:char:<id>`, `gb:chars`, `gb:active_char`.
- Cloud characters use Supabase via `shared/cloud/cloudCharacters.js`.

## Encounter Builder

- Feature root: `src/pages/encounterbuilder/`.
- Shell: `EncounterBuilderPage.jsx` resolves `?enc=`, registers save-instance UX, renders MUI tabs: Builder / Library / Encounter.
- State: `state/EncounterBuilderContext.jsx` + `state/reducer.js`.
- Logic: `logic/bestiary.js`, `constants.js`, `combat.js`, `dice.js`, `difficulty.js`, `filters.js`, `markup.js`, `monsterUtils.js`, `storage.js`, `sheetSync.js`.
- Data loading uses `logic/constants.js` `DATA_BASE` / `IMAGE_BASE`; allowed raw source files are loaded from the bestiary index and filtered to `RAW_ALLOWED_SOURCES`.
- Difficulty uses 2024 RAW: raw monster XP sum, no encounter multiplier, `XT[level-1] * party.count`.
- Combat handles initiative, turn wrapping, HP/temp HP, PC death saves, reinforcements, roll log, selected monster/PC statblock panel.
- `modifyHp` damage depletes temp HP first, then current HP; healing only raises current HP. `setHp`/`setTempHp`/`setMaxHp` are direct overrides.

## Combat Sheet Sync

- Character cloud `data` stores top-level `currentHP`, `tempHP`, `maxHPBonus`, and `deathSaves`; `maxHP` is derived.
- Encounter combatants use `hpCurrent`, `hpMax`, `tempHP`, `maxHPBonus`, `deathSaves`, plus `sourceId` / `campaignId`.
- `shared/character/vitals.js` owns `SYNCED_VITALS`, `SYNCED_DATA_KEYS`, `pickCharacterVitals`, and `clampCharacterVitals`.
- `logic/sheetSync.js` maps sheet vitals to combat and patches back through the shared registry.
- Outbound cloud writes live in `hooks/useFightSheetSync.js`, debounced per character, using `patchCharacterData()` / RPC only.
- Inbound realtime lives in `hooks/useSheetRealtime.js`, subscribed only in combat view for linked PCs in the active fight.
- Manual PCs and monsters keep vitals local and do not use cloud I/O.

## Campaign Sheets

- `CampaignSheetView` can render standalone `/campaign-sheet?id=<id>` or embedded via `sheetId`, `editable`, and `embedded`.
- `useCloudCharacterLive` subscribes to `public.characters` updates filtered by character id.
- Read-only mode applies full live row refresh. Editable mode merges only synced vitals so in-progress edits survive.
- `CharacterSheet` accepts `liveVitals` and merges only synced vitals idempotently.

## Cloud / Supabase

- Main schema: `react-app/supabase/schema.sql`; campaign add-on: `react-app/supabase/campaigns.sql`; combat sync add-on: `react-app/supabase/combat_sync.sql`.
- `public.characters`: `id text` PK, `owner uuid`, `data jsonb not null`, `updated_at`, plus campaign columns.
- `patch_character_data(p_id text, p_patch jsonb)` shallow-merges allowlisted top-level data keys: `currentHP`, `tempHP`, `deathSaves`, `maxHPBonus`.
- JS `SYNCED_DATA_KEYS` and SQL allowlist must stay in sync.
- RLS-denied updates can affect zero rows without throwing; permission/no-row handling should be explicit.

## Persistence

- Encounter scoped localStorage keys: `gb:enc:<id>:party:v1`, `gb:enc:<id>:draft:v1`, `gb:enc:<id>:library:v1`, `gb:enc:<id>:fights:v1`.
- Registry keys: `gb_encounter_registry`, `gb_active_encounter_id`.
- Home registry prefix remains `gb:enc:<id>:`.
- Unsaved encounter instances do not auto-persist scoped data; saved instances auto-persist through `useEncounterPersistence`.

## Verification

- Primary build gate: `cd react-app && npm run build` but it writes `dist`.
- Tests: `cd react-app && npm test` runs Node tests, including encounter logic tests.
- `git diff --check` should pass; it does not cover untracked files, so also check `git status --short`.
- In read-only review sandboxes, do not run commands that need to write build output.

## Gotchas

- `public/tools/*.html` are not Vite-bundled; only GM board remains there.
- MUI 9/React 19 can leak `Stack` layout props to DOM; put layout props in `sx`.
- New files may be untracked; verify they are included intentionally before review/commit.
- Registry deletion in `shared/localStorageRegistries.js` removes keys by `gb:enc:<id>:` prefix.
- Keep encounter data runtime-fetched; never vendor 5etools JSON/images.
