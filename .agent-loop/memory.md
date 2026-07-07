# Project Memory

App is React 19 + Vite + MUI 9 + Supabase SPA in `react-app/`. D&D data is fetched live from 5etools mirrors and must not be vendored. Builder and Sheet share one unified character object persisted locally or in cloud.

## Project Rules

- Data repo: `https://github.com/5etools-mirror-3/5etools-src/tree/main/data`; code fetches equivalent raw URLs.
- Image repo: `https://github.com/5etools-mirror-2/5etools-img`; encounter tokens resolve from equivalent raw URLs, with a mirror-3 XMM Skeleton raw URL as missing-token fallback.
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
- Unknown routes currently redirect to `/`.
- `CloudAutoSync` mounts from `App`.
- `components/AppTopBar.jsx` provides fixed top bar and `APP_TOP_BAR_HEIGHT`.

## Encounter Builder

- Feature root: `src/pages/encounterbuilder/`.
- Shell: `EncounterBuilderPage.jsx` resolves `?enc=`, registers save-instance UX, renders Builder / Library / Encounter tabs.
- State: `state/EncounterBuilderContext.jsx` + `state/reducer.js`.
- Hooks: `hooks/useMonsterDb.js`, `hooks/useEncounterPersistence.js`, `hooks/useCampaignPlayers.js`, `hooks/useFightSheetSync.js`, `hooks/useSheetRealtime.js`.
- Logic: `logic/bestiary.js`, `campaignSheetUrl.js`, `constants.js`, `combat.js`, `dice.js`, `difficulty.js`, `filters.js`, `markup.js`, `monsterUtils.js`, `storage.js`, `sheetSync.js`.
- Data loading uses `DATA_BASE` / `IMAGE_BASE`; allowed raw source files are loaded from the bestiary index and filtered to `RAW_ALLOWED_SOURCES`.
- Tokens use the image repo mirror at runtime. Missing-token fallback is `https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/bestiary/tokens/XMM/Skeleton.webp`; never restore `bestiary/tokens/MM/...`.
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
- Registry keys: `gb_encounter_registry`, `gb_active_encounter_id`.
- Home registry prefix remains `gb:enc:<id>:` via `shared/localStorageRegistries.js`.
- Unsaved encounter instances do not auto-persist scoped data; saved instances auto-persist through `useEncounterPersistence`.

## Verification

- Configured gates in `.agent-loop/config.yaml`: `git diff --check`, `npm --prefix react-app test`, `npm --prefix react-app run build`.
- `npm --prefix react-app test` runs package script `node --test`; current tests include encounter logic/sync/markup and shared beast action parsing.
- Build writes `react-app/dist`.
- `git diff --check` should pass; it does not cover untracked files, so also check `git status --short`.
- In read-only review sandboxes, do not run commands that need to write build output.

## Gotchas

- `react-app/public/tools/*.html` are not Vite-bundled; only GM board remains there.
- `react-app/public/tools/gmboard.html` is standalone HTML/CSS/JS with inline styles and lucide UMD; React UI conventions do not fully apply inside it.
- MUI 9/React 19 can leak `Stack` layout props to DOM; prefer putting layout props in `sx`.
- New files may be untracked; verify they are included intentionally before review/commit.
- Registry deletion in `shared/localStorageRegistries.js` removes keys by `gb:enc:<id>:` prefix.
- Keep encounter data runtime-fetched; never vendor 5etools JSON/images.
- Monster token fallback is the XMM Skeleton raw URL; keep it 2024-safe and never point it back at `bestiary/tokens/MM/...`.
