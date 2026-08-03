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

## Battle Map / VTT

- Root: `src/pages/vtt/`; scene orchestration is `components/SceneEditor.jsx` and rendering is `SceneViewport.jsx` / `TokenSprite.jsx`.
- The right tool rail has an explicit cursor tool. Selecting draw, erase, text, fog, ruler, or laser activates that behavior immediately; laser stays active until another tool is selected. While any non-cursor tool is active, the entire token/object interaction subtree becomes pointer-transparent, so the selected tool can start directly over a piece; token drag, resize, death-save dots, pills, and context menus return only with the cursor tool.
- A GM-only projector mode opens a campaign-bound spectator view whose only control is the bottom-right fullscreen button. It is started explicitly from the compact scene-actions menu, independently of `Go live`; only after that opt-in do the `Spectator` and `Freeze projector` / `Resume projector` controls appear, and the opt-in survives a GM-page refresh for the tab. The projector follows whichever scene is currently Live (including later live-scene switches), reproduces the player boundary explicitly even under the GM session (no GM-layer/staged tokens, GM drawings, or secret labels), and keeps ordinary player views unchanged. The GM-window camera source lives in per-tab `sessionStorage`, survives refresh and scene-editor remounts, and is re-announced when realtime reconnects. Freeze snapshots or reconnects both camera and Map/Background selection; tokens, fog, live-scene selection, and other scene state remain live while frozen. Sync targets that exact GM window through ephemeral Supabase broadcast, sends the world-space centre plus zoom, interpolates on the spectator, adapts to different viewport sizes, and never persists presenter data to Supabase.
- The scene header is a compact translucent battle-map surface: scene title and stats form one identity block, role is a small badge, GM live/projector actions are grouped, and the Map/Sheet switch is aligned as the final control with responsive wrapping.
- Starting a custom roll closes the custom-roll panel so only the physical dice and final toast remain visible.
- Dice results wait for the physical settle/paint hold; dice and coins are never snapped or forcibly straightened to the chosen face after motion. A d100 uses the shared neutral `D100Orb`: one clipped faceted texture rather than 100 composited face trees. On the battle map its texture follows the physics while its authoritative value fades in separately on the final frame, so no face alignment or snap is required; roll toasts use the same already-settled orb with its result visible.
- Token condition pills stay mounted across the hover gap and expose rules tooltips. Expanded pills collapse while dragging; the movement-distance badge is centred over the token.
- Battle-map dialogs share the translucent black/gold surface from `components/battleMapSurface.js`, including Pieces, encounter import, monster placement, token menu, roll log, and embedded sheet dialogs.
- Pieces has a transparent inner surface. Character previews use the sheet portrait, the same 5px player-colour ring as the map, and the shared primary-class icon fallback from `shared/character/classIcon.js` instead of initials.
- Pieces, monster placement, and encounter import support native drag placement. The viewport shows the actual token preview at grid scale under the pointer and drops at the hovered cell.
- The token context menu is a compact 360px surface: reduced typography/controls, 19–20px pills, and side-by-side Conditions and Advantage/Disadvantage columns.
- `Dead` is a shared assignable condition. Dead tokens are dimmed/grayscaled and wear a skull badge; `Dead` is not also counted in the numbered conditions badge.
- Death saves for linked characters are shown and editable in the battle-map token menu at 0 HP and sync with the character sheet and active Encounter Builder fight. The menu receives the same sheet-enriched token as the viewport (never the raw `map_tokens` row); defensively, `Dead` always opens/saves as three failed death saves so merely opening or blurring the menu cannot revive a character.
- At 0 HP a character token replaces its HP bar with two clickable three-dot tracks: green successes and red failures. Clicking a dot sets/unsets that count through the same sheet/encounter synchronization; the third failure activates the synchronized Dead skull and removes the dot tracks from the token.
- The right rail has an Objects panel for GM and players. It exposes Lucide's complete dynamic outline-icon catalog with text search, 32-item pagination, a smooth color picker, and a `0.5–4.0` stroke-width slider; an icon can be clicked or dragged onto the currently selected layer (`map`, `tokens`, or GM-only `gm`; players use `tokens`). Lucide has no official filled variant, so do not fake one by filling the SVG paths.
- Map objects render as dynamic SVG, move like owned markers, resize from the bottom-right handle in 0.1-cell increments, and rotate around their centre from the top-right handle. The Vite build buckets dynamic Lucide modules by initial so the whole catalog is not added to the initial vendor chunk.
- Map objects show their label below the icon and reuse `map_tokens` geometry, persisting only `icon_key`, `icon_stroke_width`, label, colour, position, dimensions, and normalized `rotation`. No SVG or image bytes are uploaded. `shared/vtt/mapObjects.js` sanitizes names/clamps stroke width and `MapObjectGlyph.jsx` resolves Lucide dynamically. Color inputs stay uncontrolled while the native palette moves; Draw and the placed-object menu debounce propagation to avoid palette stutter and write bursts.
- Scene-owned uploads use unique `map-images/<campaign>/<scene>/<file>` paths and are cleaned across both Supabase services: replacing map/background deletes the previous file, a failed row write rolls its new upload back, removing an uploaded-image token deletes its exact file, and deleting a scene removes the whole validated scene folder after the database cascade. Storage cleanup failures do not misreport an already-deleted row; the UI removes it and shows a cleanup warning. Character portraits/bestiary URLs are not scene-owned and are never deleted with a token.
- Mortality invariant: monsters at 0 HP are `Dead`; setting `Dead` puts them at 0 HP; removing it restores 1 HP. Characters at 0 HP are only dying, become `Dead` at three failed death saves or by explicit assignment, and explicit removal restores 1 HP plus resets death saves.
- The top-right `Sheet` button opens an external side panel without unmounting or covering the battle map. Players can open only campaign sheets they own; the GM can choose any campaign PC from a compact selector. The embedded sheet remains editable/live-synced, uses an independent scroll area, and stacks below the map only on narrower screens. On desktop a keyboard-accessible draggable divider resizes map/sheet within useful bounds; double-click or Home resets 60/40 and the per-user preference is local-only. In browser fullscreen (and its mobile covering fallback), a separate `Sheet` button stays at the viewport's top-right and opens the selected sheet in a draggable, resizable, independently scrolling panel over the map; it may move partly outside the viewport while retaining a reachable header grip, and the side and floating instances are mutually exclusive. The fullscreen GM character picker is a native select, avoiding portalled-menu pointer conflicts while dragging. Global MUI modal/popover/popper portals target the active fullscreen element so sheet menus and dialogs remain visible. Dice rolled from either embedded sheet are handed directly to the local map (realtime broadcasts suppress self-echo) and published with a stable roll ID plus physical-playback flag, so local and remote maps animate the same reported result. The embedded sheet suppresses its own roll toast; both map and sheet rolls use the map's single toast, revealed after physical settling.
- Embedded sheets are memoized and character changes run as non-urgent transitions. The floating panel moves/resizes with animation-frame DOM writes, has no large live backdrop blur, and both sheet layouts use paint/layout containment so map updates invalidate less work. Character-sheet reference data (items, optional features, and conditions) is processed once per browser tab and reused when the GM switches characters instead of rebuilding all three datasets for every sheet mount.
- The viewport's non-passive wheel listener zooms only the map surface. Events whose pointer target is inside a viewport control, floating sheet, MUI dialog, popover, or popper are left untouched so the scrollable UI directly under the cursor receives the wheel, including while fullscreen portals live inside the map element.
- The map/sheet divider previews its grid ratio through a CSS custom property at most once per animation frame and commits React state only on release, avoiding full SceneEditor rerenders during drag. Roll Log history never remounts animated 3D dice: each saved result is a static accessible 2D die silhouette with its landed value; only the live map throw uses physics/3D. Rolls originated on the current battle-map screen remain in its log/toast/physical-dice queue but suppress their token speech bubble; remote screens still show that bubble, based on local event origin rather than character ownership (so GM rolls from a PC sheet are also suppressed for the GM).
- Encounter↔map bridge supports imported monster `sourceRef`s and roster character `sourceId`s in both directions. Character HP/death-save/condition writes go through the sheet source of truth; monster values remain on the token/fight.
- Relevant tests: `shared/vtt/encounterSync.test.js`, `rollFeed.test.js`, `sheetLayout.test.js`, `shared/cloud/vtt.test.jsx`, `components/TokenMenu.test.jsx`, `TokenSprite.test.jsx`, `RosterPanel.test.jsx`, `SceneViewport.test.jsx`, `SceneToolRail.test.jsx`, `DiceTray.test.jsx`, `RollLogPanel.test.jsx`, and `BattleMapSheetResizeHandle.test.jsx`.

## Combat Sheet Sync

- Synced fields: `currentHP`, `tempHP`, `maxHPBonus`, `deathSaves`, `activeConditions`.
- Shared ownership: `shared/character/vitals.js`.
- Outbound: `useFightSheetSync`; inbound realtime: `useSheetRealtime`.
- Manual PCs/monsters retain local vitals.
- `activeEffects` never sync.
- `patch_character_data` shallow-merges allowlisted fields only.
- `Dead` travels inside `activeConditions` and is kept consistent with HP/death saves by sheet, encounter, and VTT handlers. A player at 0 HP with fewer than three failures is not automatically dead.

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
- Battle-map Lucide objects require reapplying `supabase/vtt.sql` so existing databases receive `map_tokens.icon_key`, `map_tokens.icon_stroke_width`, and `map_tokens.rotation`.
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
