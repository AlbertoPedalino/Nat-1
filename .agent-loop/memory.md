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

- Dark-only fantasy theme: `src/app/theme.js`.
- Use MUI `sx` and theme tokens; no new CSS, `styled()`, inline `style`, or component color literals.
- Existing `pages/library/styles.js` contains legacy literals; do not spread them.
- Icons: `lucide-react`.
- Entity tinting: `shared/ui/entityColors.js`.
- Toasts: `ToastProvider` / `AppToast`.
- Application routes/theme: `src/app/`; navigation: `src/app/navigation/`; reusable presentation primitives/hooks: `src/shared/ui/`; page-specific UI: page feature folder.
- Use responsive `sx`; theme radius is 8.
- `theme.palette.gmboard.badge.cloud` owns cloud-origin badge color.
- `react-window` is reserved for new lists expected to render hundreds of rows.

## Source Code Layout

- Structure guides: `react-app/src/README.md` and `react-app/src/shared/README.md`. Group shared modules by responsibility; keep imports direct rather than adding compatibility barrels at retired paths.
- `shared/character/`: `combat`, `dice`, `forms`, `inventory`, `profile`, `progression`, `resources`, `spells`. Domain components stay beside their rules.
- `shared/content/`: entry rendering, 5etools links, source filtering/priority, text search. These are shared by multiple tools, not specific to character sheets.
- `shared/ui/`: generic components/hooks, toast provider, entity colors, route titles.
- `shared/instances/`: section identity, linked tool groups, instance creation. `shared/storage/`: generic localStorage, registry persistence, scoped payloads.
- `shared/cloud/`: `api` for resource operations, `auth` for authentication/account UI, `sections` for generic tool adapters, `sync` for autosync/realtime. The common `supabaseClient.js` stays at the cloud root.
- `shared/vtt/`: `map`, `scene`, `session`, `tokens`, `sheets`, `rolls`; palette stays in `colors.js`. `shared/campaign`, `dungeon`, and `hexcrawl` retain their compact domain structure.
- Large pages group related components, hooks, styles, and logic together by feature. VTT: `scene`, `map`, `tokens`, `objects`, `atmosphere/shaders`, `sheets`, `rolls`, `session`, `dungeon`, `hexcrawl`. Character sheet: `actions`, `spells`, `inventory`, `forms`, `resources`, `stats`, `proficiency`, `details`, `layout`, `state`.
- Builder, encounter builder, GM Board, and DM Screen follow the same feature grouping; see the source guide for their folder maps. Small pages retain their compact layout. Existing cross-page dependencies and adapter discovery remain unchanged; deleted charbuilder barrels must not be recreated.
- Keep `src/` free of tests and empty placeholder folders; tests mirror source categories under `tests/logic` and `tests/ui`.

## Entry Points

- `src/main.jsx`: StrictMode → ThemeProvider → CssBaseline → ToastProvider → BrowserRouter → AuthProvider → App.
- `src/app/App.jsx` mounts `CloudAutoSync` and updates `document.title` from the current route via `shared/ui/pageTitle.js`.
- Routes: `/`, `/charbuilder`, `/charsheet`, `/gmboard`, `/dm-screen`, `/library/:tool`, `/campaigns`, `/campaign-sheet`, `/vtt`, `/encounter-builder`.
- Route strings are relative to `BrowserRouter`'s basename, derived from `import.meta.env.BASE_URL` (`/Nat-1/` in Vite). Native links must include that base; `pages/encounterbuilder/campaign/campaignSheetUrl.js` builds `/Nat-1/campaign-sheet?id=<id>&edit=1` with encoded ids.
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
- `app/navigation/LinkedToolsMenu.jsx` lists linked instances, links existing saves, creates linked tools, merges groups after confirmation, and unlinks members.
- Groups can contain multiple instances of any supported tool type.
- Opening a linked instance uses a React Router link with `target="_blank"` and `noopener noreferrer`.
- Link management is enabled for a locally saved instance or an authenticated cloud-only instance; unsaved drafts remain disabled.
- The ordinary picker remains local-first: opening a cloud row pulls only that selected instance into localStorage before navigation.
- New linked-instance routes carry `linkGroup` until first save; later saves preserve registry metadata.
- Re-run `supabase/02_sections.sql` on existing projects to add `link_group_id` and its indexes.

## Registries

- Registry metadata and generic rename/delete: `shared/storage/localStorageRegistries.js`.
- Generic deletion removes scoped keys, clears matching active id, and emits section delete event.
- Generic rename updates `updatedAt` and emits section save event.
- `gb_char_registry` delegates to character store.
- Shared `readRegistry` is uncapped unless `{ limit }` is supplied.
- Section-native registries historically cap at 20.
- `shared/storage/scopedStoragePayload.js` snapshots/restores raw scoped strings and updates registry metadata.
- `shared/instances/sectionRegistry.js` is the lightweight source for section identity, routes, prefixes, table names, and save/delete event names.

## GM Board

- Root: `src/pages/gmboard/`.
- State: `state/GmBoardContext.jsx`, `state/reducer.js`.
- Persistence: `state/useGmBoardPersistence.js`, `state/storage.js`.
- Keys: `gb_board_registry`, `gb_active_board_id`, `gb:board:<id>:state:v1`, `:tables:v1`, `:results:v1`.
- Unsaved boards write nothing before Save.
- Core state/results autosave; tables manual-save.
- Legacy unscoped migration applies only to `default`.
- Events: `gb:board-saved`, `gb:board-deleted`.
- Tests: `tests/logic/pages/gmboard/logic/gmboard.logic.test.js`.

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

- Root/entry: `src/pages/encounterbuilder/EncounterBuilderPage.jsx`; state wiring: `state/EncounterBuilderContext.jsx` and `state/reducer.js`; persistence: `state/useEncounterPersistence.js` and `state/storage.js`.
- Route: `/encounter-builder?enc=<id>|new`.
- The library entry is `/library/encounters`; canonical existing/new links come from `shared/instances/sectionRegistry.js`. Optional `linkGroup` links instances. `resolveInstance` normalizes `enc=new` to a generated id or restores a known active id when `enc` is absent; the provider remounts on instance-id changes. `useSeedInstance` saves an unsaved or empty instance when its page opens.
- Keys: `gb_encounter_registry`, `gb_active_encounter_id`; scoped `party`, `draft`, `library`, `fights`, `fumbles`, `negotiation` v1 keys.
- Difficulty uses 2024 RAW XP without multipliers.
- Missing-token fallback: XMM Skeleton.
- Conditions sync to sheets; encounter-local effects do not.
- Events: `gb:encounter-saved`, `gb:encounter-deleted`.
- `useEncounterPersistence` batches all six local payload writes before announcing a save, so listeners never read a half-written library/fight set. `sync/useExternalFightSync.js` merges externally created fights/library entries and refreshes the active fight from same-tab save events or cross-tab storage events.
- Cloud fights: `sync/useCloudFights.js` → `shared/cloud/api/encounterFights.js` → `encounter_fights` rows; `library/fightRecord.js` defines row/entry conversion and embedded library-card recovery. These per-fight rows complement the instance's local payload and section cloud sync.
- Tests: `tests/logic/pages/encounterbuilder/logic/encounterbuilder.logic.test.js` plus component tests under `tests/ui/pages/encounterbuilder/`.

## Battle Map / VTT

- Root/entry: `src/pages/vtt/VttPage.jsx`; scene orchestration: `scene/SceneEditor.jsx`; rendering: `map/SceneViewport.jsx` / `tokens/TokenSprite.jsx`.
- `/vtt` shows the scene/table picker; `/vtt?scene=<id>` requests a scene directly; `/vtt?campaign=<id>` follows that campaign's live scene via `shared/vtt/session/useLiveSession.js`. Campaign-following takes precedence if both parameters exist. VTT requires configured cloud access and authentication; scene permissions still come from Supabase and `shared/vtt/session/useSceneRole.js`.
- Projector links are `/vtt?campaign=<id>&spectator=<cameraSource>`, built by `shared/vtt/session/spectator.js` from the current URL so the deployment base survives. They replace scene/query selection, require both campaign and a valid presenter source, and follow live-scene changes. Scene operations live in `shared/cloud/api/vtt.js`; scene realtime state in `shared/vtt/session/useSceneLive.js`.
- Fog strokes sweep a round brush along fractional fog-cell coordinates between pointer events, so fast diagonal motion has no gaps. Each new drag resets its previous point. `FogCanvas` adds a light blur proportional to the fog-cell size, zoom, and device pixel ratio. Saved fog bitsets and resolution remain compatible; regressions cover reveal/hide, fast motion, and separate strokes.
- Fog rendering covers the entire viewport and erases only revealed cells using a blurred `destination-out` mask. Never blur the outer covered rectangle: that exposes the map perimeter. Grid-offset margins and areas beyond old fog dimensions stay covered; fill the complete rounded-up backing store before applying view transforms so fractional device pixel ratios cannot leave a translucent edge.
- Atmosphere must remain visible in Player view and on the projector even over unexplored fog. Public fog, atmosphere, then rulers/lasers share z-index 4 in that DOM order; controls stay higher. Atmosphere's WebGL canvas and static fallback use the same layer. Never raise hidden map pieces above fog to fix weather visibility.
- The right tool rail has an explicit cursor tool. Selecting draw, erase, text, fog, ruler, or laser activates that behavior immediately; laser stays active until another tool is selected. While any non-cursor tool is active, the entire token/object interaction subtree becomes pointer-transparent, so the selected tool can start directly over a piece; token drag, resize, death-save dots, pills, and context menus return only with the cursor tool.
- A GM-only projector mode opens a campaign-bound spectator view whose only control is the bottom-right fullscreen button. It is started explicitly from the compact scene-actions menu, independently of `Go live`; only after that opt-in do the `Spectator` and `Freeze projector` / `Resume projector` controls appear, and the opt-in survives a GM-page refresh for the tab. The projector follows whichever scene is currently Live (including later live-scene switches), reproduces the player boundary explicitly even under the GM session (no GM-layer/staged tokens, GM drawings, or secret labels), and keeps ordinary player views unchanged. The GM-window camera source lives in per-tab `sessionStorage`, survives refresh and scene-editor remounts, and is re-announced when realtime reconnects. Freeze snapshots or reconnects both camera and Map/Background selection; tokens, fog, live-scene selection, and other scene state remain live while frozen. Sync targets that exact GM window through ephemeral Supabase broadcast, sends the world-space centre plus zoom, interpolates on the spectator, adapts to different viewport sizes, and never persists presenter data to Supabase.
- The scene header is a compact translucent battle-map surface: scene title and stats form one identity block, role is a small badge, GM live/projector actions are grouped, and the Map/Sheet switch is aligned as the final control with responsive wrapping.
- Starting a custom roll closes the custom-roll panel so only the physical dice and final toast remain visible.
- Dice results wait for the physical settle/paint hold; dice and coins are never snapped or forcibly straightened to the chosen face after motion. A d100 uses the shared neutral `D100Orb`: one clipped faceted texture rather than 100 composited face trees. On the battle map its texture follows the physics while its authoritative value fades in separately on the final frame, so no face alignment or snap is required; roll toasts use the same already-settled orb with its result visible.
- Token condition pills stay mounted across the hover gap and expose rules tooltips. Expanded pills collapse while dragging; the movement-distance badge is centred over the token.
- Battle-map dialogs share the translucent black/gold surface from `map/battleMapSurface.js`, including Pieces, encounter import, monster placement, token menu, roll log, and embedded sheet dialogs.
- Pieces has a transparent inner surface. Character previews use the sheet portrait, the same 5px player-colour ring as the map, and the shared primary-class icon fallback from `shared/character/profile/classIcon.js` instead of initials.
- Pieces, monster placement, and encounter import support native drag placement. The viewport shows the actual token preview at grid scale under the pointer and drops at the hovered cell.
- The token context menu is a compact 360px surface: reduced typography/controls, 19–20px pills, and side-by-side Conditions and Advantage/Disadvantage columns.
- `Dead` is a shared assignable condition. Dead tokens are dimmed/grayscaled and wear a skull badge; `Dead` is not also counted in the numbered conditions badge.
- Death saves for linked characters are shown and editable in the battle-map token menu at 0 HP and sync with the character sheet and active Encounter Builder fight. The menu receives the same sheet-enriched token as the viewport (never the raw `map_tokens` row); defensively, `Dead` always opens/saves as three failed death saves so merely opening or blurring the menu cannot revive a character.
- At 0 HP a character token replaces its HP bar with two clickable three-dot tracks: green successes and red failures. Clicking a dot sets/unsets that count through the same sheet/encounter synchronization; the third failure activates the synchronized Dead skull and removes the dot tracks from the token.
- The right rail has an Objects panel for GM and players. It exposes Lucide's complete dynamic outline-icon catalog with text search, 32-item pagination, a smooth color picker, and a `0.5–4.0` stroke-width slider; an icon can be clicked or dragged onto the currently selected layer (`map`, `tokens`, or GM-only `gm`; players use `tokens`). Lucide has no official filled variant, so do not fake one by filling the SVG paths.
- Map objects render as dynamic SVG, move like owned markers, resize from the bottom-right handle in 0.1-cell increments, and rotate around their centre from the top-right handle. The Vite build buckets dynamic Lucide modules by initial so the whole catalog is not added to the initial vendor chunk.
- Map objects show their label below the icon and reuse `map_tokens` geometry, persisting only `icon_key`, `icon_stroke_width`, label, colour, position, dimensions, and normalized `rotation`. No SVG or image bytes are uploaded. `shared/vtt/map/mapObjects.js` sanitizes names/clamps stroke width and `MapObjectGlyph.jsx` resolves Lucide dynamically. Color inputs stay uncontrolled while the native palette moves; Draw and the placed-object menu debounce propagation to avoid palette stutter and write bursts.
- Scene-owned uploads use unique `map-images/<campaign>/<scene>/<file>` paths and are cleaned across both Supabase services: replacing map/background deletes the previous file, a failed row write rolls its new upload back, removing an uploaded-image token deletes its exact file, and deleting a scene removes the whole validated scene folder after the database cascade. Storage cleanup failures do not misreport an already-deleted row; the UI removes it and shows a cleanup warning. Character portraits/bestiary URLs are not scene-owned and are never deleted with a token.
- Mortality invariant: monsters at 0 HP are `Dead`; setting `Dead` puts them at 0 HP; removing it restores 1 HP. Characters at 0 HP are only dying, become `Dead` at three failed death saves or by explicit assignment, and explicit removal restores 1 HP plus resets death saves.
- The top-right `Sheet` button opens an external side panel without unmounting or covering the battle map. Players can open only campaign sheets they own; the GM can choose any campaign PC from a compact selector. The embedded sheet remains editable/live-synced, uses an independent scroll area, and stacks below the map only on narrower screens. On desktop a keyboard-accessible draggable divider resizes map/sheet within useful bounds; double-click or Home resets 60/40 and the per-user preference is local-only. In browser fullscreen (and its mobile covering fallback), a separate `Sheet` button stays at the viewport's top-right and opens the selected sheet in a draggable, resizable, independently scrolling panel over the map; it may move partly outside the viewport while retaining a reachable header grip, and the side and floating instances are mutually exclusive. The fullscreen GM character picker is a native select, avoiding portalled-menu pointer conflicts while dragging. Global MUI modal/popover/popper portals target the active fullscreen element so sheet menus and dialogs remain visible. Dice rolled from either embedded sheet are handed directly to the local map (realtime broadcasts suppress self-echo) and published with a stable roll ID plus physical-playback flag, so local and remote maps animate the same reported result. The embedded sheet suppresses its own roll toast; both map and sheet rolls use the map's single toast, revealed after physical settling.
- Embedded sheets are memoized and character changes run as non-urgent transitions. The floating panel moves/resizes with animation-frame DOM writes, has no large live backdrop blur, and both sheet layouts use paint/layout containment so map updates invalidate less work. Character-sheet reference data (items, optional features, and conditions) is processed once per browser tab and reused when the GM switches characters instead of rebuilding all three datasets for every sheet mount.
- The viewport's non-passive wheel listener zooms only the map surface. Events whose pointer target is inside a viewport control, floating sheet, MUI dialog, popover, or popper are left untouched so the scrollable UI directly under the cursor receives the wheel, including while fullscreen portals live inside the map element.
- The map/sheet divider previews its grid ratio through a CSS custom property at most once per animation frame and commits React state only on release, avoiding full SceneEditor rerenders during drag. Roll Log history never remounts animated 3D dice: each saved result is a static accessible 2D die silhouette with its landed value; only the live map throw uses physics/3D. Rolls originated on the current battle-map screen remain in its log/toast/physical-dice queue but suppress their token speech bubble; remote screens still show that bubble, based on local event origin rather than character ownership (so GM rolls from a PC sheet are also suppressed for the GM).
- Encounter↔map bridge supports imported monster `sourceRef`s and roster character `sourceId`s in both directions. Character HP/death-save/condition writes go through the sheet source of truth; monster values remain on the token/fight.
- Enemy vitals (HP, max, temp, conditions, effects, dead) have one authority: the combatant inside its `encounter_fights` row. Builder (`pages/encounterbuilder/sync/useMonsterVitalDispatch.js`) and battle map (`SceneEditor.commitLinkedMonster`) write them only through `commit_fight_combatant_vitals` (`shared/cloud/api/encounterFights.js`, pure helpers in `shared/vtt/tokens/fightVitals.js`): one call per edit, a base-value check, no retry; conflict/error/timeout realigns on the row. Real HP never live on a player-readable row: linked monsters' in their fight, every other piece's in GM-only `map_token_secrets.hp_current/hp_max` (written by `setTokenHp`; `createToken` moves HP there). `map_tokens.hp_current/hp_max` are a public projection recomputed by the `guard_token_public_vitals` trigger on every write: real values only while `show_hp` is on, NULL otherwise; client-written HP are discarded (`supabase/14_token_vitals.sql`). A fight counts for a piece only if its owner is that campaign's GM. The GM view overlays real HP at render via `pages/vtt/tokens/useGmTokenVitals.js` (secrets + owned fights, GM-only realtime); never in player preview/projector. Player marks on linked pieces are forwarded to the combatant. Local storage never supplies enemy vitals (the builder keeps them in `syncExternalFight`; the map's `useEncounterBridge` only carries encounter effects for character pieces). `encounterSync.js` owns `instanceId:fightId:combatantId` references; linked PCs match sheet identity.
- Dungeon→encounter path: `pages/vtt/dungeon/useSceneDungeon.js` → `pages/encounterbuilder/sync/handoff.js` → local library/fight persistence and `shared/cloud/api/encounterFights.js`. A room stores the resulting fight link, not another fight snapshot; sending a room preserves the builder's active fight. If the cloud save fails, the local fight remains and the UI reports that only this browser received it. `tokens/EncounterImportDialog.jsx` reads saved local fights through builder storage/combat helpers and converts combatants using `shared/vtt/tokens/encounterImport.js`.
- Scene recovery (`useSceneLive` → `SceneEditor.reconcilePersistentState({ reason })`, every 30s plus focus/online/visibility/SUBSCRIBED) is version-first: `fetchSceneRevision` (`updated_at`), `useSceneContent.reconcileContent` (token `id, updated_at`; sheet `id, row_revision`; stroke ids) and `useGmTokenVitals.reconcile` (fight `id, updated_at`) read full rows only for what moved; >50 changed ids falls back to one full list (`shared/vtt/session/revisionDiff.js`). Strokes have no version, so only `reason: 'subscribed'` re-reads them all; before the first full load, and on mount, the full `loadContent`/`reload` still run. Never add a revision column to `map_scenes`: every row write re-broadcasts the fog.
- Realtime traffic rules (branch perf/light-vtt-reconcile): fog painting sends `fogDelta` frames (flipped-cell runs, `stroke`+`seq`, ≤12.5/s) and one full `{ fog }` snapshot + `updateScene` when the brush lifts; nothing if no bit flipped (`applyCells`/`sameFog`); receivers drop a stroke after a seq gap and wait for the snapshot (`shared/vtt/map/fogStream.js`). Fog handlers read `fogRef`, never do I/O inside state updaters. The ruler goes through `shared/vtt/map/measureSync.js` (60 ms throttle + trailing, dedupe, null on release/cancel/tool change/unmount, 1.5 s keepalive; receivers drop after `REMOTE_MEASURE_TTL_MS`). `useLiveSession` follows only `campaign_live_scenes` (15_live_scenes.sql: one row per campaign, kept by a deferred trigger from `map_scenes.is_live`, one change per switch); `useSceneLive` is the only follower of the current scene row. The presenter streams camera only while a follower is known (camera-request, `camera-follower` heartbeat every 30 s, `camera-follower-query` on presenter resubscribe) or the projector was opened from that window (`cameraFollowers`). The campaign clock runs only on hex scenes, polls every 60 s as fallback, re-reads on SUBSCRIBED (after the first) and focus; the GM log is read on mount/focus/remote clock change. `useCloudFights` applies complete INSERT/UPDATE payloads directly, fetches one row via `getInstanceFight` when Realtime trimmed it, and re-reads the list only for DELETE, pending local deletes, before first load, or on SUBSCRIBED. Focus+visibility recoveries are coalesced by `shared/cloud/sync/returnGate.js`.
- Traffic diagnostics: `shared/cloud/sync/realtimeStats.js`, attached in `supabaseClient.js` only when `localStorage['gb:rt-debug']='1'` or `?rtdebug=1` (then reload). Counts Realtime frames via the realtime-js `logger` and REST bytes via `global.fetch`; console `__gbRt.table()` / `.snapshot()` / `.reset()`. Stores sizes only, masks ids in topics, strips REST queries.
- Roll sharing: `pages/vtt/rolls/useVttRolls.js` and `pages/encounterbuilder/rolls/useEncounterRolls.js` both use `shared/cloud/sync/useRollChannel.js`; roll identity/presentation lives in `shared/character/dice/` and map feed state in `shared/vtt/rolls/rollFeed.js`.
- Relevant tests: logic under `tests/logic/shared/vtt/`, cloud VTT operations at `tests/ui/shared/cloud/api/vtt.test.jsx`, and map components under `tests/ui/pages/vtt/` grouped by the corresponding source feature (including viewport, tokens, pieces, dice, roll log, sheet resize).

## Combat Sheet Sync

- Synced fields: `currentHP`, `tempHP`, `maxHPBonus`, `deathSaves`, `activeConditions` (`shared/character/combat/vitals.js`; must match the allowlist in `supabase/13_character_vitals.sql`).
- Writes: every client sends an intent through `commandCharacterVitals(charId, command, { digest, base })` (`shared/cloud/api/cloudCharacters.js`) → RPC `commit_character_vitals(p_id, p_digest_revision, p_hp_basis, p_patch)`: absolute patch computed from the held digest + base max for its `hpBasis` (sheet: local `maxHP - maxHPBonus`; VTT: `useCampaignRoster().baseMax`; builder: `useCharacterVitalSync` via `characterVitalsRef`), no pre-read; answer `{ applied, characterId, vitals, digestRevision, hpBasis }`, never `data`. Token = `character_digests.row_revision` (notes/resources autosave never conflicts; inventory does via hpBasis). One recompute on explicit refusal for relative commands only (`RELATIVE_COMMANDS`); no retry on timeout/error → `CHARACTER_RECHECK_EVENT` (light recovery). In-tab events in `shared/cloud/sync/characterEvents.js`: `CHARACTER_VITALS_EVENT` (digest preview via `digestFromVitalsAnswer`, never a sheet) — `CHARACTER_ROW_EVENT`/`publishCharacterRow` are retired. Legacy full-row path only when `healthCommandRoute` ≠ 'digest' (no digest, no/other-basis base max, longRest without exhaustionLevel); `healthCommandStats()` counts. The `protect_character_vitals` trigger keeps ordinary sheet saves from changing health. Builder: `encounterbuilder/campaign/useCharacterVitalDispatch.js`.
- Reads: one strategy per view. Read-only viewer (`CampaignSheetView` without edit) = `shared/cloud/sync/useCloudCharacterRow.js` with `live`: 1 full GET on mount, Realtime UPDATE by id, recovery (SUBSCRIBED/focus/visibility/online/30 s) = `getCloudCharacterRevision` (`row_revision` only), full GET only if it moved; rows ordered by `row_revision` alone. Editable sheet (standalone `/charsheet`, `campaign-sheet?edit=1`, VTT embedded, builder `PlayerSheetPanel`) = read once (external char: `useCloudCharacterRow` without `live`; local: store) and then only vitals from the digest: parent's `liveDigest` (VTT `useCampaignRoster().digests`, builder `characterDigests` in context) or its own `useCharacterDigests({ characterIds:[id], deriveMaxHp:false })`; max HP = local base + digest `maxHPBonus`, never a sheet download. Editable sheets deliberately do NOT adopt remote non-vital edits (user decision 2026-09-24). No full-row polling anywhere. `13_character_vitals.sql` trigger: every changing UPDATE +1 `row_revision`, no-op keeps it, client values discarded (`tests/logic/shared/cloud/character-revision.sql.test.js`). Everyone who only needs roster/vitals — the battle map (`pages/vtt/scene/useCampaignRoster.js`) and the encounter builder (`pages/encounterbuilder/campaign/useCharacterVitalSync.js`, one channel for all linked PCs) — follows `character_digests` through `shared/cloud/sync/useCharacterDigests.js`, never `characters`. A digest (`shared/campaign/characterDigest.js`) carries name/owner/class/colour/portrait, the synced vitals and `hpBasis`; base max HP is derived in JS (`readBaseMaxHp`: runtime adapters + `calcMaxHP`, as `commandCharacterVitals` does) and a full sheet is read only when `hpBasis` changes; `maxHP = max(1, base + maxHPBonus)`. Health-command answers (`publishCharacterRow`) preview a digest locally; the database digest of the same `row_revision` settles it. Received rows never trigger a write.
- Manual PCs keep local vitals; enemies follow the Battle Map / VTT enemy-vitals rules.
- `activeEffects` never sync to sheets.
- `Dead` travels inside `activeConditions` and is kept consistent with HP/death saves by sheet, encounter, and VTT handlers. A player at 0 HP with fewer than three failures is not automatically dead.

## Campaigns

- `/campaigns` uses shared `AppTopBar`.
- Gate logic: `pages/campaigns/campaignsPageState.js`.
- States: cloud off, auth loading, signed-out dialog, authenticated controls/list.
- Campaign sheet editing is allowed for owner, global GM, or campaign GM.
- `useCloudCharacterRow` feeds read-only sheets whole rows; editable sheets merge only digest vitals.

## Character Builder and Sheet

- Builder: `pages/charbuilder/CharBuilder.jsx`.
- Sheet: `pages/charsheet/CharacterSheet.jsx`.
- Keys: `gb:char:<id>`, `gb:chars`, `gb:active_char`.
- Helpers: `shared/character/profile/store.js`.
- Local delete emits `gb:char-deleted`; it never cascades cloud deletion.
- Logged-in saved characters autosync; imported JSON remains a draft until saved/uploaded.

## Cloud and Supabase

- SQL files in `react-app/supabase/` carry their run order in a two-digit prefix (`01_schema.sql` … `16_character_digests.sql`); run them in name order, all are re-runnable (purpose of each in `CLOUD_SETUP.md`). A new script takes the next number; `tests/logic/shared/cloud/schema-order.sql.test.js` fails on an unnumbered or duplicate-numbered file and applies the whole sequence twice. The player mark RPCs (`set_token_conditions/effects`) are defined once in `06_vtt.sql` and find `forward_token_marks` at call time, so re-run order is free. `patch_character_data` is retired (dropped by `04_characters_realtime.sql`). `uuid_or_null` is intentionally defined in both `05_character_art.sql` and `06_vtt.sql` so each stands alone.
- `02_sections.sql` runs after `01_schema.sql`; `CLOUD_SETUP.md` documents this step.
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

- Section cloud: `tests/logic/shared/cloud/sections/cloudSections.test.js`.
- Autosync: `tests/logic/shared/cloud/sync/cloudAutoSyncEngine.test.js`.
- Picker/freshness/merge: `tests/logic/pages/library/logic/library.logic.test.js`.
- Authenticated local-origin open regression: `tests/ui/pages/library/SectionPicker.test.jsx`.
- Linked tools: `tests/logic/shared/instances/instanceLinks.test.js` and `tests/ui/app/navigation/LinkedToolsMenu.test.jsx`.
- Route titles: `tests/logic/shared/ui/pageTitle.test.js`.
- SQL assertions: `tests/logic/shared/cloud/sections/sectionsSql.test.js` and `tests/logic/shared/cloud/api/`.
- Node suites: `tests/logic/**/*.test.js`; Vitest/jsdom suites: `tests/ui/**/*.test.jsx`; shared UI setup: `tests/setup.js`. Each tree mirrors `src/`.
- `npm test` runs VTT hygiene, logic and UI; `npm run test:logic` runs `node --test tests/logic`; `npm run test:ui` runs Vitest. Runner instructions: `tests/README.md`.
- Network tests inject/mock Supabase and never hit a live service.
- Fog pixel checks run separately in a real browser at `/Nat-1/tests/browser/vtt/fog.html` through the Vite dev server; `tests/browser/vtt/fog.js` checks covered borders, offsets, zoom/pan, old fog dimensions, fractional pixel ratios, reveal softness, disabling fog, and resize.

## Verification

- Gates: `git diff --check HEAD`, `npm --prefix react-app test`, `npm --prefix react-app run build`, `git status --short`.
- `git diff --check` without `HEAD` omits staged changes; use `git diff --check HEAD`.
- Always inspect status because new files may be staged or untracked.
- SQL success does not deploy schema; apply `02_sections.sql` manually to Supabase.
- Battle-map Lucide objects require reapplying `supabase/06_vtt.sql` so existing databases receive `map_tokens.icon_key`, `map_tokens.icon_stroke_width`, and `map_tokens.rotation`.
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
