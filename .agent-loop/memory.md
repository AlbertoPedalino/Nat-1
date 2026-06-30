# Project Memory - GM-Board

App = React 19 + Vite + MUI + Supabase SPA in `react-app/`. D&D data is fetched live from 5etools mirrors and must not be vendored. Builder and Sheet share one unified character object.

## Project Rules

- Data repo: `https://github.com/5etools-mirror-3/5etools-src/tree/main/data`
- Image repo: `https://github.com/5etools-mirror-2/5etools-img`
- Runtime fetch only; do not copy or commit 5etools JSON/image assets.
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

## Encounter Builder Architecture

- Feature root: `src/pages/encounterbuilder/`.
- Shell: `EncounterBuilderPage.jsx` resolves `?enc=`, registers save-instance UX, renders MUI tabs: Builder / Library / Encounter.
- State: `state/EncounterBuilderContext.jsx` + `state/reducer.js`.
- Hooks: `hooks/useMonsterDb.js`, `hooks/useEncounterPersistence.js`, `hooks/useCampaignPlayers.js`, `hooks/useFightSheetSync.js`, `hooks/useSheetRealtime.js`.
- Logic: `logic/bestiary.js`, `constants.js`, `combat.js`, `dice.js`, `difficulty.js`, `filters.js`, `markup.js`, `monsterUtils.js`, `storage.js`, `sheetSync.js`.
- Components include Builder/Library/Combat views, MonsterList, EncounterList, PartyConfig, CampaignImport, Reinforcements, CombatantCard, StatBlockDialog, PlayerSheetPanel, RollLog.
- No `postMessage`, no `StandaloneHtmlFrame`, no `innerHTML` in the React encounter feature.

## Encounter Data Loading

- `logic/constants.js`: `DATA_BASE`, `IMAGE_BASE`, `CR_XP`, `XT`, raw/project source mappings, type options.
- `logic/bestiary.js`: memoized `getJson`, loads `bestiary/index.json` and `bestiary/legendarygroups.json`.
- Allowed raw source files are loaded from the index; monsters are filtered to `RAW_ALLOWED_SOURCES`.
- Legendary groups support `_copy` inheritance and array mods for lair/regional/mythic text.
- Tokens use the image repo mirror at runtime; fallback token paths must not use legacy source folders.

## Encounter Builder Behavior

- Builder view supports source chips, search, CR/type filters, lightweight encounter rows, hydrated monster data while DB is available.
- Difficulty uses 2024 RAW: raw monster XP sum, no encounter multiplier, `XT[level-1] * party.count`.
- Library view stores lightweight saved encounters, supports load/delete/launch/resume, and keeps one fight per encounter.
- Combat view handles initiative, turn wrapping, monster death at 0 HP, PC death saves, reinforcements, roll log, and selected monster/PC statblock panel.
- Selecting a linked player combatant renders `PlayerSheetPanel`; manual PCs without `sourceId` show a compact fallback.
- Combatant rows keep HP bar, HP/Max/Temp fields (Max is editable; on a linked PC it round-trips as a `maxHPBonus` delta), heal/damage controls, death saves, and remove action in one HP/action row.
- `modifyHp` damage depletes temporary HP first (D&D RAW), then current HP; healing only raises current HP. `setHp`/`setTempHp`/`setMaxHp` are direct field overrides.

## Combat Sheet Sync

- Character cloud `data` stores top-level `currentHP`, `tempHP`, `maxHPBonus`, and `deathSaves: { success, fail }`; `maxHP` is derived (`calcMaxHP` + `maxHPBonus`), not stored — so max HP round-trips as a `maxHPBonus` delta (combat `setMaxHp` on a linked PC applies the delta to `maxHPBonus`).
- Encounter combatants use `hpCurrent`, `hpMax`, `tempHP`, `maxHPBonus`, `deathSaves: { s, f }`, plus `sourceId` / `campaignId` for imported campaign PCs.
- The synced-field contract is the declarative `SYNCED_VITALS` registry in `shared/character/vitals.js` (single source of truth). Each descriptor owns its `data`/`combat` key names + clamps (`toCombat`/`toData`/`clampData`/`normalize`), so every consumer stays generic:
  - sheet side: `pickCharacterVitals` / `clampCharacterVitals` (in `vitals.js`) iterate the registry.
  - encounter side: `logic/sheetSync.js` imports the registry for the combat mappers (`sheetVitalsToCombat`, `resolveCombatVitals`, `combatantToSheetPatch`, `sheetPatchKey`, `combatVitalsMatch`). Layering is encounter -> shared (no inversion).
  - Synced fields (all bidirectional): `currentHP`, `tempHP`, `maxHPBonus`, `deathSaves`. `maxHP` is never written directly.
  - `resolveCombatVitals(combatant, vitals)` is the one place that derives a combatant's synced fields (used by both `buildCombat` seeding and `applySheetVitals`); `combatVitalsMatch` derives the idempotence guard from it.
  - Adding a synced field = one descriptor in `SYNCED_VITALS` + its key in the `patch_character_data` SQL allowlist. `SYNCED_DATA_KEYS` (derived) and a test assert the JS set and the SQL allowlist never drift.
- Campaign import uses `summarizeCharacter` and `sheetVitalsToCombat` to carry current HP, max HP, max HP bonus, temp HP, death saves, AC, and initiative into encounter players.
- `buildCombat` seeds linked players from imported sheet vitals rather than always max HP.
- `applySheetVitals(combat, sourceId, vitals)` updates linked PCs by `sourceId`, clamps values, and is idempotent when values match.
- Outbound cloud writes live in `hooks/useFightSheetSync.js`, not the reducer:
  - debounced per character (coalesces rapid HP taps into one write);
  - skips monsters and manual PCs with no `sourceId`;
  - writes only through `patchCharacterData()` / RPC;
  - echo suppression tracks a SET of recently written values per character (not just the last), so a lagged/out-of-order realtime echo of an earlier write is recognized and does NOT bounce local HP back to a stale value.
- Inbound realtime for combat lives in `hooks/useSheetRealtime.js`:
  - opens only in combat view for linked PCs in the active fight;
  - subscribes to Supabase `postgres_changes` UPDATE on `public.characters`, filtered by character id;
  - derives vitals from incoming row `data` through `summarizeCharacter` + `sheetSync`;
  - dispatches `syncCombatantVitals`;
  - ignores self-originated echoes (set membership) while applying genuine external changes;
  - fail-soft on bad payloads/socket cleanup.
- Manual PCs and monsters keep temp/max HP local and do not use cloud I/O.

## Campaign Sheets

- `CampaignSheetView` can render standalone `/campaign-sheet?id=<id>` or embedded via `sheetId`, `editable`, and `embedded` props.
- Embedded read-only PC sheets render inside `PlayerSheetPanel` with `<CampaignSheetView sheetId={sourceId} editable={false} embedded />`.
- `CampaignSheetView` loads once with `getCloudCharacter(id)` and subscribes via `shared/cloud/useCloudCharacterLive.js` in BOTH modes:
  - read-only: applies the whole live `UPDATE` row to `state.char` (full refresh).
  - editable (`edit=1`): extracts only vitals with `pickCharacterVitals(row.data)` and passes them as the `liveVitals` prop, leaving `state.char` (the initial load) untouched so in-progress edits to other fields survive.
- `useCloudCharacterLive` is a reusable shared hook gated by `useAuth` (`cloudEnabled`, `status === 'authed'`, user id) and the shared Supabase client; it subscribes to `public.characters` updates filtered by `id=eq.<charId>` and removes the channel on unmount/char change.
- `shared/character/vitals.js` is the cross-subsystem synced-vitals contract (the `SYNCED_VITALS` registry above): `pickCharacterVitals(data)` and `clampCharacterVitals(raw, { maxHP, fallback })` both derive from it.
- `CharacterSheet` accepts a `liveVitals` prop: an effect merges ONLY the synced vitals (`currentHP`, `tempHP`, `maxHPBonus`, `deathSaves`) into `sheet` + `C` (via `clampCharacterVitals`); applying `maxHPBonus` recomputes `maxHP` from base + bonus and re-clamps current HP. It runs only on a new `liveVitals` (reads `sheet` through a ref, not on local edits), is idempotent (equality guard) so save echoes are no-ops, and is last-writer-wins on the synced fields; other in-progress edits are preserved. The resulting autosave re-writes whole `data` once per change (the sheet's pre-existing autosave path); the echo is idempotent so it does not loop.
- `CharacterSheet` must re-derive when the `externalChar` prop changes so read-only realtime updates are visible.
- `CharacterSheet` supports `embedded` layout and read-only no-op mutation handlers.

## Character Builder / Sheet

- Builder shell: `pages/charbuilder/CharBuilder.jsx`; reducer `pages/charbuilder/state.js`; steps in `pages/charbuilder/steps/`.
- Builder logic: `pages/charbuilder/logic/*`; shared character logic in `src/shared/character/*`.
- Sheet shell: `pages/charsheet/CharacterSheet.jsx`; derived state in `pages/charsheet/state.js`.
- `deriveSheetState(C)` derives current HP, max HP, max HP bonus, temp HP, death saves, inventory/currency, inspiration, conditions, exhaustion, slots, notes, and arcane armor key.
- `summarizeCharacter(C)` derives encounter-relevant sheet vitals from a full character object; `maxHP` is derived, not stored.
- Sheet tabs: Actions, Spells, Inventory, Features, Notes.
- Runtime adapters: `adapters/index.js`, `registry.js`, `adapterBindings.js`, `adapterPipeline.js`.
- Character local store keys: `gb:char:<id>`, `gb:chars`, `gb:active_char`.
- Cloud characters use Supabase via `shared/cloud/cloudCharacters.js`.
- `getCloudCharacter(charId)` selects `id`, `name`, `owner`, `owner_username`, `updated_at`, and `data` for realtime/load race handling.

## Cloud / Supabase

- Main schema: `react-app/supabase/schema.sql`; campaign add-on: `react-app/supabase/campaigns.sql`; combat sync add-on: `react-app/supabase/combat_sync.sql`.
- `public.characters`: `id text` PK, `owner uuid`, `data jsonb not null`, `updated_at`, plus campaign columns from campaign SQL.
- Character RLS update policy allows `owner = auth.uid()` or `public.is_gm()`.
- `patch_character_data(p_id text, p_patch jsonb)` is the generic partial patch RPC for syncable top-level sheet fields.
- RPC is `security invoker` so RLS still governs rows; allowlist is `currentHP`, `tempHP`, `deathSaves`, `maxHPBonus`. This allowlist must stay equal to `SYNCED_DATA_KEYS` (a test reads the SQL and asserts it); after editing it, re-run `combat_sync.sql` on Supabase.
- RPC uses shallow `jsonb ||` merge; object-valued keys like `deathSaves` must be sent as complete sub-objects.
- `combat_sync.sql` idempotently adds `public.characters` to `supabase_realtime`; run/re-run it once on Supabase to enable live sheet updates.
- Cloud full-data write paths still exist for character autosave/import flows; combat sync must use the RPC helper only.
- Permission/no-row handling should be explicit because an RLS-denied `UPDATE` can affect zero rows without throwing.

## Encounter Persistence

- Scoped localStorage keys:
  - `gb:enc:<id>:party:v1`
  - `gb:enc:<id>:draft:v1`
  - `gb:enc:<id>:library:v1`
  - `gb:enc:<id>:fights:v1`
- Registry contract preserved:
  - `gb_encounter_registry`
  - `gb_active_encounter_id`
  - Home registry prefix remains `gb:enc:<id>:`.
- Unsaved instances do not auto-persist scoped data; Save Instance registers and persists current state.
- Saved instances auto-persist state through `useEncounterPersistence`.

## Encounter Dice / Markup

- `logic/dice.js`: dice formulas, d20 modifiers, result classing, roll log cap `LOG_MAX=60`.
- Encounter roll toasts reuse the character sheet `DiceToast` style through `EncounterDiceToast`.
- `EncounterBuilderContext.roll()` returns roll result plus actor; actor comes from selected combatant, selected monster, or current turn.
- `logic/markup.js` parses 5etools tags into safe React tokens.
- Supported tags include `{@hit}`, `{@damage}`, `{@d20}`, `{@spell}`, `{@dc}`, `{@h}`, `{@atk}`, `{@recharge}`, `{@i}`, `{@b}`, `{@filter}`, action save tags.
- `StatBlockDialog` renders statblocks with clickable abilities, saves, skills, HP formula, action text rolls, spell links, lair/regional/mythic sections.

## Verification

- `cd react-app && npm run build` is the real build gate, but it writes `dist`.
- `cd react-app && npm test` runs encounter logic tests under `src/pages/encounterbuilder/logic/*.test.js`.
- `git diff --check` should pass; note it does not cover untracked files (check `git status --short` for new files before review/commit).
- Manual encounter checks: `/encounter-builder?enc=new`, load monsters, filter/add, difficulty, launch, turns, HP/death saves/temp HP, reinforcements, save instance, reload persistence, Home listing, Library load/resume, GM campaign import/open sheet, click PC in combat panel, click monster statblock.
- Combat sync manual checks:
  - import campaign players, launch, verify current HP/temp HP/death saves/max HP seed from sheet;
  - HP/temp HP/death-save combat edits patch cloud after debounce;
  - sheet edits in another tab update open combat live without reload;
  - combat edits update embedded and standalone read-only campaign sheets live without reload;
  - editable `edit=1` does not lose local edits from remote live rows;
  - max HP changes from level/CON/max HP bonus update combat hpMax and reclamp hpCurrent;
  - no oscillation/echo loop;
  - monsters/manual PCs do not subscribe or write;
  - Realtime off/socket drop leaves combat and sheet usable;
  - patch RPC ignores non-allowlisted keys and does not clobber unrelated `data` fields.

## Gotchas

- `public/tools/*.html` are not Vite-bundled; only GM board remains there.
- MUI 9/React 19 can leak `Stack` layout props to DOM; put `alignItems`, `justifyContent`, `flexWrap`, `minHeight`, `gap` in `sx`.
- Build may not be runnable in read-only review because Vite writes `dist`; tests may also need writable caches depending on environment.
- New shared hooks/files (e.g. under `shared/cloud/`, `shared/character/`) start untracked; track them before a final diff/commit so they aren't omitted.
- Registry deletion in `shared/localStorageRegistries.js` removes keys by `gb:enc:<id>:` prefix, compatible with encounter keys.
- Keep encounter data runtime-fetched; never vendor 5etools JSON/images.
