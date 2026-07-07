# Project Memory

App is React 19 + Vite + MUI 9 + Supabase SPA in `react-app/`. D&D data is fetched live from 5etools mirrors where loaders exist and must not be vendored. Builder and Sheet share one unified character object persisted locally or in cloud.

## Project Rules

- Data repo: `https://github.com/5etools-mirror-3/5etools-src/tree/main/data`; code fetches equivalent raw URLs.
- Configured image repo: `https://github.com/5etools-mirror-3/5etools-img`.
- Current Encounter `IMAGE_BASE` is still `5etools-mirror-2/5etools-img`; fallback monster token is mirror-3 XMM Skeleton. Treat this as an existing code/config mismatch, not a silent refactor target.
- Runtime fetch only; do not copy or commit 5etools JSON/image assets.
- Allowed source codes: `XPHB`, `XMM`, `XDMG`, `FRAIF`, `FRHOF`, `EFA`, `RWH`.
- Raw 5etools codes may differ: `FRAIF -> FRAiF`, `FRHOF -> FRHoF`, `RWH -> RHW`.
- Encounter bestiary maps project source codes to raw source codes in `react-app/src/pages/encounterbuilder/logic/constants.js`.
- Character/player-content loaders mostly use raw 5etools codes directly via `react-app/src/shared/character/sourcePriority.js`.
- Ignore/reject non-whitelisted sources; no homebrew; no legacy `PHB/DMG/MM` unless explicitly mapped.
- Prefer minimal, scoped changes. Avoid committing `.agent-loop` artifacts unless explicitly requested.

## UI Conventions

- GM-Board is dark-only fantasy UI; theme tokens live in `react-app/src/theme.js`.
- React UI should prefer MUI `sx` and theme tokens over hardcoded component colors.
- Icons in React UI come from `lucide-react`.
- Entity tinting goes through `react-app/src/shared/entityColors.js`.
- `react-window` is installed but not currently imported in `src`; use it for new/refactored long data lists where virtualization is needed.
- Toasts go through `ToastProvider` / `AppToast`.
- Current repo still has older hardcoded hex/inline style usage; avoid adding more.

## Entry Points

- `src/main.jsx`: React.StrictMode -> ThemeProvider -> CssBaseline -> ToastProvider -> BrowserRouter basename from `BASE_URL` -> AuthProvider -> App.
- `src/App.jsx`: routes `/`, `/charbuilder`, `/charsheet`, `/gmboard`, `/gmsheets`, `/campaigns`, `/campaign-sheet`, `/encounter-builder`; legacy `/builder` and `/sheet` redirect.
- Unknown routes render `NotFoundPage`.
- `CloudAutoSync` mounts from `App`.
- `components/AppTopBar.jsx` provides fixed top bar and `APP_TOP_BAR_HEIGHT`.

## GM Board

- Main implementation: `react-app/public/tools/gmboard.html`, standalone vanilla HTML/CSS/JS, not Vite-bundled.
- Route: `/gmboard` in `App.jsx` renders `pages/gmboard/GmBoardPage.jsx`.
- React shell: `GmBoardPage.jsx` builds iframe `src` as `${BASE_URL}tools/gmboard.html${location.search}`, renders `AppTopBar`, `SaveInstanceButton`, and `StandaloneHtmlFrame`.
- `StandaloneHtmlFrame.jsx` is a thin MUI iframe wrapper with `allow="storage-access"`.
- `SaveInstanceButton.jsx` shows enabled "Save instance" until iframe reports saved, then disabled "Saved instance".
- `HomePage.jsx` reads `gb_board_registry` for Continue rows. Its GM Board card describes HEXcrawl, dungeon, quest, and table tools; the standalone GM Board has no initiative/combat/condition tracker.
- GM Board external assets are Google Fonts and lucide UMD from unpkg. It does not fetch 5etools D&D JSON or image data in current code.
- Default GM Board roll data is embedded in `gmboard.html`: weather, events, loot, complications, four encounter tiers, four trap tiers, environment severity.

## GM Board Views

- HEXcrawl: season/weather override, population, terrain, encounter tier, date/time, Proceed, Advance Only, manual +1h/+4h, result steps, session log.
- Dungeon: room count 1-40, population/rolls per room, encounter tier, generated room cards, clear.
- Quest: quest scope from 1-3 d8 or random, encounter tier, generated quest cards, clear.
- Tables: editable tables for seasonal weather, event, loot, complication, encounter tiers 1-4, trap tiers 1-4, environment severity.
- Guide: static reference for HEXcrawl, Dungeon, and table editor flows.

## GM Board State

- Runtime state object `S` in `gmboard.html` holds:
  - HEX: `pop`, `popThr`, `terrain`, `terrainH`, `hexTier`, `season`, `meteo`, `intensita`, weather counters, date/time, `log`, `rolling`.
  - Dungeon: `dPop`, `dThr`, `dTier`, `dRooms`, latest generated `dungeon`.
  - Quest: `qPop`, `qThr`, `qTier`, latest generated `quest`.
- `saveState()` persists `S` to `gm_state`; `loadState()` restores state, active buttons, weather display, time display, log, dungeon, and quest.
- `gm_state` stores latest generated Dungeon room data and Quest card data, not only selections.
- Session log is stored in `S.log`, capped at 50 entries, displayed at 30 entries.

## GM Board Tables

- Runtime table object `T` holds `weather`, `events`, `loot`, `compl`, `enc[4]`, `trap[4]`, `env`.
- Table storage keys: `gm_wea`, `gm_ev`, `gm_lo`, `gm_co`, `gm_env`, `gm_enc0..3`, `gm_trap0..3`.
- `loadTables()` reads stored JSON or deep-copies `DEF_*` arrays.
- `buildEditor()` renders table inputs with `data-tbl`, `data-r`/`data-s`, and `data-f`.
- `readEditor()` copies edited input values into `T`; weather/xp/dc are numeric-coerced, most other fields remain strings.
- `saveTables()` calls `readEditor()`, refuses to persist if the board instance is unsaved, then writes all table keys.
- `resetTables()` confirms, resets `T` to defaults, removes table keys, rebuilds editor, and does not reset `gm_state`.
- Migrations in `migrateStorage()` translate older Italian values to English for `gm_state` weather/intensity, loot type/rarity/quality, complication `Niente`, and environment severity.

## GM Board Persistence

- Board registry key: `gb_board_registry`.
- Active board key: `gb_active_board_id`.
- Scoped board prefix: `gb:board:<id>:`.
- Registry route metadata lives in `shared/localStorageRegistries.js`: route `/gmboard?board=<id>`, new route `/gmboard?board=new`, prefix `gb:board:<id>:`.
- At iframe bootstrap, `gmboard.html` monkey-patches `Storage.prototype.getItem/setItem/removeItem` so legacy GM keys are transparently scoped to `gb:board:<id>:<legacyKey>`.
- Scoped keys include `gm_state`, `gm_wea`, `gm_ev`, `gm_lo`, `gm_co`, `gm_env`, `gm_enc*`, `gm_trap*`.
- `?board=new` generates an id like `gm_<time>_<rand>`, updates URL, starts unsaved.
- `?board=<id>` is saved if id exists in registry, has scoped data, or is `default` with legacy data.
- No `board` query uses active saved board when known; else legacy data becomes `board=default`; else a new unsaved id is generated.
- Unsaved board writes/removes for scoped keys are no-ops. UI state can change in memory, but `gm_state` and table keys do not persist until Save.
- Save message calls `gbRegisterBoardScope()`, sets active id, upserts registry entry, then saves tables and state.
- Legacy default migration copies unscoped legacy keys into `gb:board:default:*` once, guarded by `gb_board_migrated_v1`.
- `shared/storage.js` treats `gb:`, `gb_`, `5e_`, and `gm_` as app localStorage keys; Clear App Data removes scoped and legacy app data.
- `deleteRegistryEntry()` removes keys by registry metadata prefix, clears matching active id, and removes registry entry. Applies to GM Board and Encounter.

## GM Board postMessage

- Host -> iframe:
  - `{ type: 'gb:save-instance' }`
  - `{ type: 'gb:request-instance-state' }`
- Iframe -> host:
  - `{ type: 'gb:instance-state', kind: 'gmboard', id, saved }`
- Both sides require `event.origin === window.location.origin` / `location.origin`.
- `GmBoardPage.jsx` updates save button state from `gb:instance-state`.

## GM Board Mechanics

- Weather checks happen after enough travel hours accumulate. Each check rolls d20 against editable season thresholds: `<= sole` Clear, `<= pioggia` Rain, otherwise Snow.
- Weather check interval is `1d6 + 2` travel hours.
- Rain Light is x1 travel, Rain Moderate/Heavy x2, Rain Heavy adds Perception/Investigation disadvantage note.
- Snow Light/Moderate is x2, Snow Heavy x4, Snow Moderate/Heavy adds Perception/Investigation disadvantage note.
- HEX Proceed validates season, population, terrain, tier; advances effective terrain hours; checks weather; rolls population d6; on trigger rolls event 2d20.
- Event types drive resolution: encounter rolls tier encounter 2d20; loot rolls 1d8+1d12 and maybe DC; enemy camp rolls detection DC, encounter, camp loot; trap/environment/other use complication-specific rolls and DCs.
- Dice helpers include d6, d20+d20, d8+d12, animated die display, and result cards.
- Dungeon generation validates room count 1-40, population, tier. Each room rolls 1-3 complication slots from `T.compl`, resolves encounter/trap/environment, then rolls one loot result and optional loot DC.
- Quest generation rolls 1-3 d8, uses max as quest count, then each quest rolls event 2d20, optional encounter 2d20, reward 1d8+1d12, with minimum reward fallback when loot is "Nothing found".
- GM Board has no initiative, turn order, rounds, combatant HP, death saves, statblock, or combat sync logic. React Encounter Builder owns combat logic.

## Encounter Builder

- Feature root: `src/pages/encounterbuilder/`.
- Shell: `EncounterBuilderPage.jsx` resolves `?enc=`, registers save-instance UX, renders Builder / Library / Encounter tabs.
- State: `state/EncounterBuilderContext.jsx` + `state/reducer.js`.
- Hooks: `hooks/useMonsterDb.js`, `hooks/useEncounterPersistence.js`, `hooks/useCampaignPlayers.js`, `hooks/useFightSheetSync.js`, `hooks/useSheetRealtime.js`.
- Logic: `logic/bestiary.js`, `campaignSheetUrl.js`, `constants.js`, `combat.js`, `dice.js`, `difficulty.js`, `filters.js`, `markup.js`, `monsterUtils.js`, `storage.js`, `sheetSync.js`.
- Data loading uses `DATA_BASE` / `IMAGE_BASE`; allowed raw source files are loaded from the bestiary index and filtered to `RAW_ALLOWED_SOURCES`.
- Missing-token fallback is `https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/bestiary/tokens/XMM/Skeleton.webp`; never restore `bestiary/tokens/MM/...`.
- Difficulty uses 2024 RAW: raw monster XP sum, no encounter multiplier, `XT[level-1] * party.count`.
- Combat handles initiative, turn wrapping, HP/temp HP, PC death saves, reinforcements, roll log, selected monster/PC statblock panel.
- `modifyHp` damage depletes temp HP first, then current HP; healing only raises current HP. `setHp`/`setTempHp`/`setMaxHp` are direct overrides.
- `logic/markup.js` parses 5etools tags into safe React tokens; statblock actions support clickable rolls and links.

## Combat Sheet Sync

- Combat sync reads/writes character `data` top-level `currentHP`, `tempHP`, `maxHPBonus`, and `deathSaves`; sheet `maxHP` is derived at runtime and is not written by sync patches.
- Encounter combatants use `hpCurrent`, `hpMax`, `tempHP`, `maxHPBonus`, `deathSaves`, plus `sourceId` / `campaignId`.
- `shared/character/vitals.js` owns `SYNCED_VITALS`, `SYNCED_DATA_KEYS`, `pickCharacterVitals`, and `clampCharacterVitals`.
- `logic/sheetSync.js` maps sheet vitals to combat and patches back through the shared vitals registry.
- Outbound cloud writes live in `hooks/useFightSheetSync.js`, debounced per character, using `patchCharacterData()` / RPC only; it suppresses delayed outbound realtime echoes.
- Inbound realtime lives in `hooks/useSheetRealtime.js`, subscribed only in combat view for linked PCs in the active fight.
- Manual PCs and monsters keep vitals local and do not use cloud I/O.

## Campaign Sheets

- `CampaignSheetView` can render standalone `/campaign-sheet?id=<id>` or embedded via `sheetId`, `editable`, and `embedded`.
- `useCloudCharacterLive` subscribes to `public.characters` updates filtered by character id.
- Read-only mode applies full live row refresh. Editable mode merges only synced vitals so in-progress edits survive.
- `CharacterSheet` accepts `liveVitals` and merges only synced vitals idempotently when external and editable.
- Embedded combat PC sheets render inside `PlayerSheetPanel` as `CampaignSheetView sheetId={sourceId} editable embedded`; the external link uses `?edit=1`.
- Campaign/GMsheet pages open editable sheets for owner, global GM, or campaign GM; others open read-only.

## Character Builder / Sheet

- Builder shell: `pages/charbuilder/CharBuilder.jsx`; reducer `pages/charbuilder/state.js`; steps in `pages/charbuilder/steps/`.
- Builder logic: `pages/charbuilder/logic/*`; shared character logic in `src/shared/character/*`.
- When logged in, the builder autosaves to Supabase via `pushCharacterData()` / `updateCloudCharacterData()` and does not write localStorage except local-only/import flows. Logged out uses `shared/character/store.js`.
- Imported JSON is a draft until explicit Save local or Upload to cloud.
- Sheet shell: `pages/charsheet/CharacterSheet.jsx`; derived state in `pages/charsheet/state.js`.
- `deriveSheetState(C)` derives current HP, max HP, max HP bonus, temp HP, death saves, inventory/currency, inspiration, conditions, exhaustion, spell slots, notes, and arcane armor key.
- `summarizeCharacter(C)` lives in `pages/campaigns/sheetSummary.js` and derives encounter-relevant sheet vitals; `maxHP` is derived, not synced as a stored patch field.
- Character local store keys: `gb:char:<id>`, `gb:chars`, `gb:active_char`.
- Cloud characters use Supabase via `shared/cloud/cloudCharacters.js`.

## Cloud / Supabase

- Main schema: `react-app/supabase/schema.sql`; campaign add-on: `react-app/supabase/campaigns.sql`; combat sync add-on: `react-app/supabase/combat_sync.sql`.
- `public.characters`: `id text` PK, `owner uuid`, `owner_username`, `name`, `data jsonb not null`, `updated_at`; `campaigns.sql` adds `campaign_id`.
- `patch_character_data(p_id text, p_patch jsonb)` shallow-merges allowlisted top-level data keys: `currentHP`, `tempHP`, `deathSaves`, `maxHPBonus`.
- JS `SYNCED_DATA_KEYS` and SQL allowlist must stay in sync; encounter tests assert this.
- `combat_sync.sql` also adds `public.characters` to the Supabase Realtime publication when available.
- `patch_character_data` returns void, so RLS-denied/no-row updates can affect zero rows without throwing; explicit permission/no-row handling is needed when callers must know the result.

## Persistence

- Encounter scoped localStorage keys: `gb:enc:<id>:party:v1`, `gb:enc:<id>:draft:v1`, `gb:enc:<id>:library:v1`, `gb:enc:<id>:fights:v1`.
- Encounter registry keys: `gb_encounter_registry`, `gb_active_encounter_id`.
- Home registry prefixes live in `shared/localStorageRegistries.js`.
- Unsaved encounter instances do not auto-persist scoped data; saved instances auto-persist through `useEncounterPersistence`.

## Verification

- Configured gates in `.agent-loop/config.yaml`: `git diff --check`, `npm --prefix react-app test`, `npm --prefix react-app run build`.
- `npm --prefix react-app test` runs package script `node --test`; current tests include encounter logic/sync/markup and shared beast action parsing.
- There are currently no GM Board-specific automated tests.
- Build writes `react-app/dist`.
- `git diff --check` should pass; it does not cover untracked files, so also check `git status --short`.
- In read-only review sandboxes, do not run commands that need to write build output.

## Gotchas

- `react-app/public/tools/*.html` are not Vite-bundled; only GM board remains there.
- `gmboard.html` is standalone and monkey-patches `Storage.prototype` early; save/persistence changes must account for that bootstrap order.
- Unsaved GM Board instances intentionally drop scoped localStorage writes until Save.
- GM Board current code does not fetch external 5etools data despite project rules saying GM-Board fetches D&D data at runtime.
- GM Board card text on Home should stay aligned with the standalone HEX/Dungeon/Quest/Tables implementation.
- MUI 9/React 19 can leak `Stack` layout props to DOM; prefer putting layout props in `sx`.
- New files may be untracked; verify they are included intentionally before review/commit.
- Keep encounter data runtime-fetched; never vendor 5etools JSON/images.
- Monster token fallback is the XMM Skeleton raw URL; keep it 2024-safe and never point it back at `bestiary/tokens/MM/...`.
