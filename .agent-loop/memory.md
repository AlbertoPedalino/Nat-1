# Project Memory

GM-Board is React 19 + Vite + MUI 9 + Supabase SPA under `react-app/`. D&D data loads at runtime from 5etools mirrors; never vendor source JSON or image assets.

## Project Rules

- Data repo: `https://github.com/5etools-mirror-3/5etools-src/tree/main/data`.
- Encounter image assets currently use mirror-2; Skeleton fallback uses mirror-3 XMM token URL.
- Allowed sources: `XPHB`, `XMM`, `XDMG`, `FRAIF`, `FRHOF`, `EFA`, `RWH`.
- Raw mappings: `FRAIF -> FRAiF`, `FRHOF -> FRHoF`, `RWH -> RHW`.
- Reject legacy, unofficial, homebrew, and non-whitelisted sources unless explicitly mapped.
- Prefer minimal scoped changes. Do not commit `.agent-loop` artifacts unless requested.

## UI Conventions

- Dark-only fantasy theme: `src/theme.js`.
- Use MUI `sx` and theme tokens; no new CSS, `styled()`, inline `style`, or component color literals.
- Existing `pages/library/styles.js` contains legacy literals; do not spread them.
- Icons: `lucide-react`.
- Entity tinting: `shared/entityColors.js`.
- Toasts: `ToastProvider` / `AppToast`.
- Shared UI: `src/components/`; page-specific UI: page folder.
- Use responsive `sx`; theme radius is 8.
- `theme.palette.gmboard.badge.cloud` owns cloud-origin badge color.
- `react-window` is reserved for new lists expected to render hundreds of rows.

## Entry Points

- `src/main.jsx`: StrictMode → ThemeProvider → CssBaseline → ToastProvider → BrowserRouter → AuthProvider → App.
- `src/App.jsx` mounts `CloudAutoSync` and updates `document.title` from the current route via `shared/pageTitle.js`.
- Routes: `/`, `/charbuilder`, `/charsheet`, `/gmboard`, `/dm-screen`, `/library/:tool`, `/campaigns`, `/campaign-sheet`, `/encounter-builder`.
- `/gmsheets` redirects to `/library/characters`; legacy builder/sheet routes redirect.
- Home is eager; tool pages are route-lazy.
- `AppTopBar` always renders `CloudMenu`.
- GM Board, Encounter Builder, and DM Screen top bars include a back button to their instance picker and `LinkedToolsMenu`.
- `SaveInstanceButton` accepts `{ saved, onClick, buttonSx }`.

## Home and Library

- Home is launcher plus `Clear App Data`.
- Character Sheet, GM Board, Encounter Builder, and DM Screen cards open `/library/<slug>`.
- Character Builder and Campaigns open directly.
- `InstancePickerPage.jsx` resolves `characters`, `gmboard`, `encounters`, and `dmscreen`.
- `logic/tools.js` maps slug to registry/route/icon/color metadata; prototype keys resolve `null`.
- Characters use `CharacterPicker`; other tools use `SectionPicker`.
- `logic/instanceRows.js` owns pure merge, fallback loading, section-delete planning, and freshness logic.
- Cloud wins merge collisions; rows retain `localUpdatedAt`.
- Pull only when cloud `updated_at` is strictly newer. Equal, local-newer, invalid, or missing metadata means no pull.
- Every authenticated section open fetches cloud metadata, including local-origin fallback rows.
- Failed metadata lookup still opens an existing local copy.
- Cloud-list failure preserves the full local list with a non-blocking notice.
- Rows carry accessible `Cloud` or `Local` badges.
- Local-only delete removes local only. Cloud-row delete confirms once and removes cloud plus local.
- Rename is available for local and cloud rows; cloud rename is owner-scoped and mirrors to a local copy when present.
- `InstanceRow` lacks a wrapper `aria-label`, preserving child accessible text.
- Route-param picker reuse may briefly retain prior rows until async refresh completes.

## Linked Tool Groups

- GM Board, Encounter Builder, and DM Screen instances can share an explicit random `linkGroupId`; names never create links.
- Local registries store `linkGroupId`; Supabase rows store `link_group_id` with `(owner, link_group_id)` indexes.
- `components/LinkedToolsMenu.jsx` lists linked instances, links existing saves, creates linked tools, merges groups after confirmation, and unlinks members.
- Groups can contain multiple instances of any supported tool type.
- Opening a linked instance uses a React Router link with `target="_blank"` and `noopener noreferrer`.
- Link management is enabled for a locally saved instance or an authenticated cloud-only instance; unsaved drafts remain disabled.
- The ordinary picker remains local-first: opening a cloud row pulls only that selected instance into localStorage before navigation.
- New linked-instance routes carry `linkGroup` until first save; later saves preserve registry metadata.
- Re-run `supabase/sections.sql` on existing projects to add `link_group_id` and its indexes.

## Registries

- Registry metadata and generic rename/delete: `shared/localStorageRegistries.js`.
- Generic deletion removes scoped keys, clears matching active id, and emits section delete event.
- Generic rename updates `updatedAt` and emits section save event.
- `gb_char_registry` delegates to character store.
- Shared `readRegistry` is uncapped unless `{ limit }` is supplied.
- Section-native registries historically cap at 20.
- `shared/scopedStoragePayload.js` snapshots/restores raw scoped strings and updates registry metadata.
- `shared/sectionRegistry.js` is the lightweight source for section identity, routes, prefixes, table names, and save/delete event names.

## GM Board

- Root: `src/pages/gmboard/`.
- State: `state/GmBoardContext.jsx`, `state/reducer.js`.
- Persistence: `hooks/useGmBoardPersistence.js`, `storage.js`.
- Keys: `gb_board_registry`, `gb_active_board_id`, `gb:board:<id>:state:v1`, `:tables:v1`, `:results:v1`.
- Unsaved boards write nothing before Save.
- Core state/results autosave; tables manual-save.
- Legacy unscoped migration applies only to `default`.
- Events: `gb:board-saved`, `gb:board-deleted`.
- Tests: `pages/gmboard/logic/gmboard.logic.test.js`.

## DM Screen

- Route: `/dm-screen?screen=<id>|new`.
- `screen=new` writes nothing before Save.
- Keys: `gb_dmscreen_registry`, `gb_active_dmscreen_id`, `gb:dmscreen:<id>:notes:v2`.
- V1 notes remain readable and upgrade on save.
- Notes preserve `size: { cols, height }`; height 0 means auto.
- Markdown uses `react-markdown` + `remark-gfm`; no raw HTML.
- Save is atomic via `saveInstanceWithNotes`.
- Events: `gb:dmscreen-saved`, `gb:dmscreen-deleted`.
- Tests cover notes, cards, board behavior, and drag reorder.

## Encounter Builder

- Route: `/encounter-builder?enc=<id>|new`.
- Keys: `gb_encounter_registry`, `gb_active_encounter_id`; scoped `party`, `draft`, `library`, `fights`, `fumbles`, `negotiation` v1 keys.
- Difficulty uses 2024 RAW XP without multipliers.
- Missing-token fallback: XMM Skeleton.
- Conditions sync to sheets; encounter-local effects do not.
- Events: `gb:encounter-saved`, `gb:encounter-deleted`.
- Tests: `pages/encounterbuilder/logic/encounterbuilder.logic.test.js` plus component tests.

## Combat Sheet Sync

- Synced fields: `currentHP`, `tempHP`, `maxHPBonus`, `deathSaves`, `activeConditions`.
- Shared ownership: `shared/character/vitals.js`.
- Outbound: `useFightSheetSync`; inbound realtime: `useSheetRealtime`.
- Manual PCs/monsters retain local vitals.
- `activeEffects` never sync.
- `patch_character_data` shallow-merges allowlisted fields only.

## Campaigns

- `/campaigns` uses shared `AppTopBar`.
- Gate logic: `pages/campaigns/campaignsPageState.js`.
- States: cloud off, auth loading, signed-out dialog, authenticated controls/list.
- Campaign sheet editing is allowed for owner, global GM, or campaign GM.
- `useCloudCharacterLive` fully refreshes read-only sheets and merges synced vitals for editable sheets.

## Character Builder and Sheet

- Builder: `pages/charbuilder/CharBuilder.jsx`.
- Sheet: `pages/charsheet/CharacterSheet.jsx`.
- Keys: `gb:char:<id>`, `gb:chars`, `gb:active_char`.
- Helpers: `shared/character/store.js`.
- Local delete emits `gb:char-deleted`; it never cascades cloud deletion.
- Logged-in saved characters autosync; imported JSON remains a draft until saved/uploaded.

## Cloud and Supabase

- Schemas: `schema.sql`, `sections.sql`, `campaigns.sql`, `combat_sync.sql`.
- `sections.sql` runs after `schema.sql`; `CLOUD_SETUP.md` documents this step.
- `boards`, `encounters`, and `dm_screens` match the character-row shape.
- All three section tables use owner-only RLS with no global-GM escape.
- `cloudCharacters.js` remains the character cloud path.
- `sectionDescriptors.js` binds section identity to storage sanitizer/read/write adapters.
- `cloudSectionCore.js` provides injectable push/pull/meta/list/delete operations.
- Section cloud APIs also provide owner-scoped rename and linked-group updates.
- `cloudSections.js` binds descriptors to Supabase.
- Section payloads store every scoped localStorage key as an unchanged raw string.
- `CloudAutoSync` shares one debounced engine across characters and sections.
- Entry eagerly imports only the lightweight section registry; cloud/storage adapters load dynamically on debounced section push.
- Production chunks keep GM Board defaults and Encounter/DM Screen logic out of the entry bundle.
- Permission/RLS errors block the typed section/id for the browser session.
- Local delete events cancel queued pushes; cloud deletion remains an explicit picker action.
- Pull writes payload and registry without emitting a save event, preventing sync echo.
- Unsaved `new` or generated-but-unregistered instances produce no cloud write.

## Tests

- Section cloud: `src/shared/cloud/cloudSections.test.js`.
- Autosync: `src/shared/cloud/cloudAutoSyncEngine.test.js`.
- Picker/freshness/merge: `src/pages/library/logic/library.logic.test.js`.
- Authenticated local-origin open regression: `src/pages/library/SectionPicker.test.jsx`.
- Linked tools: `src/shared/instanceLinks.test.js` and `src/components/LinkedToolsMenu.test.jsx`.
- Route titles: `src/shared/pageTitle.test.js`.
- SQL assertions: `src/shared/cloud/sectionsSql.test.js`.
- Node tests: `*.test.js`; Vitest/jsdom: `*.test.jsx`.
- Network tests inject/mock Supabase and never hit a live service.

## Verification

- Gates: `git diff --check HEAD`, `npm --prefix react-app test`, `npm --prefix react-app run build`, `git status --short`.
- `git diff --check` without `HEAD` omits staged changes; use `git diff --check HEAD`.
- Always inspect status because new files may be staged or untracked.
- SQL success does not deploy schema; apply `sections.sql` manually to Supabase.
- Live smoke needs configured Supabase: signed-out local behavior, cross-device pull, debounce, freshness, explicit delete, owner isolation, offline fallback, and character/campaign regression checks.

## Gotchas

- New directories may be absent from ordinary unstaged diff.
- Hydration effects key on instance id; saving must not rehydrate fresh state.
- Mirrored local state can overwrite hydrated values.
- MUI layout props can leak to DOM; keep layout values in `sx`.
- Button descendants must remain phrasing content.
- Wrapper `aria-label` replaces subtree accessible text.
- Guard object lookups with `hasOwnProperty.call`.
- Testing Library regex names are substring matches.
- Synchronous localStorage reads should use lazy state initializers.
- Avoid bulk line-ending rewrites.
