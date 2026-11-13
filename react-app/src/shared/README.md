# Shared modules

Code used by multiple pages belongs here, grouped by responsibility. Keep
page-specific code in `src/pages/` and app navigation in `src/app/navigation/`.
See the [source map](../README.md) for the page feature folders.

| Folder | Responsibility |
| --- | --- |
| `bestiary/` | Monster records: database loader and hook, CR/XP, types, sizes, sources, markup and the stat block sheet every page shows |
| `campaign/` | Campaign roster, shared character vitals and sheet summaries, campaign selection |
| `character/` | Character rules and the UI tied to those rules; see below |
| `cloud/` | Supabase access, authentication, and synchronization; see below |
| `numbers.js` | `clamp` / `clampInt`, the one way to keep a number in range |
| `valueStore.js` | `createValueStore` + `useStoreValue`: one value outside React state, redrawing only its readers (a sheet's dice toast and roll log) |
| `content/` | D&D entry rendering (`entryText.js`, stat-block tag labels in `statBlockTags.js`), `stripMarkup` for labels and keys (`markupText.js`), the rules vocabulary (`rulesVocabulary.js`: abilities, skills, tools, languages, sizes, schools, damage and creature types), 5etools links and loading (`gameData.js`), loaders run once and retried after a failure (`cachedLoader.js`: `cachedLoader`, `cachedLoaderByKey`, `fetchJsonOnce`), catalogs built from it (`catalogs/`: classes — `classScope.js` for a class's features and subclasses, class skins included — species, backgrounds, feats, spells, items, rules, beasts), the one 5etools `_copy` resolver (`copyRecords.js`), name keys, source filtering, text search |
| `dungeon/` | Dungeon generation (`dungeon.js`), room markers, linked encounters |
| `encounter/` | The combat model: building and snapshotting fights (`combat.js`), initiative and turns (`initiative.js`), combatant vitals (`combatantVitals.js`: `hpCommandFields`, the one hit point command rule for the builder and the map, `HP_COMMANDS`/`MARK_COMMANDS`); fight entries and rows (`fightRecord.js`: `makeFightEntry`, `freeId`); combatant labels, fight records, the encounter library, sheet-vitals sync |
| `gmboard/` | What other pages read of a GM Board: options, storage format, default state and tables, table dice, campaign time, weather (`weather.js` + `ui/WeatherSummary.jsx`: `WeatherSummary` and the `WeatherCard` the GM Board and the map share), table registry and row rules (`tables.js`: `BOARD_TABLES`, `eventKind`, loot), rolled-result text (`resultText.js`: encounter, loot, dice) and visuals (`ui/resultVisuals.js`), selector UI (`ui/TierSelector.jsx` and others) |
| `hexcrawl/` | Hex data, hex travel rules (`hexRules.js`), icons, hex result and mount UI |
| `instances/` | GM Board / Encounter Builder / DM Screen instances: identity, local store, sync engine, page hook, links; see below |
| `storage/` | Generic localStorage helpers and character registry metadata |
| `ui/` | Reusable presentation components/hooks, the app toast (`ToastProvider` + `AppToast`, `notify(severity, message)`: success when an action the user asked for worked, error "Could not …: reason" when it failed, warning when it partly worked, info only for what the app did by itself; painted in the fullscreen element too; `runBusy(..., { success })` for busy actions — gameplay notices on the sheet use its dice toast through `onNotice`, never the roll log), colors (`colors.js`: `UI_COLORS`, `uiAlpha`, the source the theme is built from), route titles, number/date/text formatting, `confirmAction` / `promptText`, `useEventListener` (DOM listeners for a mounted component), `useDebouncedCallback`, `useLoaded` + `LoadStatus` (async loads and their status), `ConflictBanner` (pick one of two copies), long-press timing (`longPress.js`), an SVG built in code as a CSS image (`svgPicture.js`), a one-line card name that scrolls under the finger (`ScrollingName.jsx`), entry cards (`entryCard.js`: owned card, head row, body, buttons, `entryCardWellSx`; `PickableRow.jsx`: a row to pick), buttons (`pressable.js`: `iconButtonLook` the theme gives every icon button, `stepButtonSx`, `PART_ICON_BUTTON_SX` for an icon part of something else; `CornerCloseButton.jsx`: `CloseButton` / `CornerCloseButton`; `RowExpandButton.jsx`), styles written onto elements (`liveStyle.js`: `useLiveStyle` from a render, `writeLiveStyle` from a gesture or animation frame, `useRootStyle` for a page-wide setting — the only writes to `element.style`), panel layers (`PanelHeader.jsx`: `panelFrameSx`, `usePanelsWithoutLayers`), inked lettering (`shadows.js`: `inkLettering`, `APPLE_WEBKIT_QUERY`), the app's Emotion cache (`hoverOnlyWithHover.js`: `createAppStyleCache`, provided in main.jsx — every `:hover` rule, ours and MUI's, is written under `@media (hover: hover)`, so a tap never leaves a hover look behind; never write that query by hand) |
| `vtt/` | Battle-map geometry, fog, scenes (`scene/scene.js`: `isSecretPiece`, the one test of a piece kept from the players), dice physics, sheets, and realtime state |

## Character

| Folder | Responsibility |
| --- | --- |
| `combat/` | AC, HP, conditions, reminders, initiative, weapon mastery |
| `dice/` | The one dice engine (`dice.js`: `rollDie`, `rollPool`, `rollD20`, `rollFormula`, each with an optional `rng`; every die in the app is rolled here; the battle map's dice tray only animates the result), notation rolls for logs and creatures (`rollNotation.js`), dice rendering and toasts; the dice control every rolling screen shows (`DiceControl.jsx`: Roll then Log, the custom roll picker and the log popover) and the one roll log (`RollLogList.jsx`, entries in the `rollFeed.normalizeRoll` shape, added with `rollFeed.addRoll`) |
| `forms/` | Wild Shape, companions, summons, and cannon forms |
| `inventory/` | Items, crafting, currency, attunement, charges, inventory filtering |
| `profile/` | Character persistence, export, portraits, class icons |
| `proficiency/` | Weapon and armor proficiency rules and queries; the proficiencies a character already holds, per kind (`heldProficiencies.js`) |
| `progression/` | Levels, ability bonuses, choices, feats, proficiencies, languages, XP |
| `resources/` | Rest and recharge rules, resource definitions (`restResources.js`) |
| `sheet/` | The sheet's numbers: stats (`sheetStats.js`), effects, defenses, effect bonuses, runtime adapters, derived state |
| `spells/` | Spell grants, metadata, slots, caster progression (`casterProgression.js`), a character's spellcasting for the builder and the sheet (`spellcasting.js`: casting entities, adapter profile, `getSpellSlots`, limits), attack and DC (`spellcastingNumbers.js`), a class entry's spell picks (`spellBuckets.js`), Pact Magic, free casts, spell references |

Keep domain UI alongside its rules (for example, `combat/ConditionChips.jsx`).
General-purpose presentation belongs in `ui/`; shared entry/source handling
belongs in `content/`.

## Cloud

| Folder/file | Responsibility |
| --- | --- |
| `api/` | Resource operations for campaigns, characters (`cloudCharacters.js`; vitals commands in `healthCommands.js`), art, fights, dungeons, hexcrawls, VTT |
| `auth/` | Auth provider, sign-in dialog, account/cloud menu |
| `sync/` | Autosync engine, the editors' cloud save (`useCharacterCloudSave.js` on `cloudSaveQueue.js`: one queue, conflict hold, retry on the recovery triggers), the recovery heartbeat (`recoveryTriggers.js`: one 30 s timer and return/online triggers for the whole client; `watchRevisions(keys, onChange)` for server state — one `sync_digest` read per trigger, keys from `syncKeys.js`, a view called only when its keys moved — and `listenForRecovery(run)` for local work), `keyed.js` (`createKeyedQueue`: one task per key at a time; `createKeyedDebounce`: one pending run per key — every sync path's lock and edit debounce), sync exclusions/ownership, realtime character and roll hooks; who sees a roll (`rollVisibility.js`: `rollVisibility(kind)` — player rolls public, GM rolls by the campaign's "show my rolls to players" switch `useGmRollsShown`, table rolls GM-only; the switch is `character/dice/GmRollsShownSwitch.jsx`) |
| `supabaseClient.js` | Shared Supabase client configuration |
| `realtimeChannel.js` | `openRealtimeChannel`: the one way to open a realtime channel (topic rule, guarded listeners, SUBSCRIBED status, fail-soft close) |

## Instances

One local-first model for every tool instance. Tools only add a payload
adapter (`pages/<tool>/state/storage.js`) that writes through `saveLocal`.

| File | Responsibility |
| --- | --- |
| `sectionRegistry.js` | Tool identity: routes, URL param, key prefixes, tables, id helpers |
| `instanceStore.js` | Local repository: registry entries (cloud state, dirty flags), payload writes with no-op detection, legacy migration, change feed |
| `instanceCloud.js` | The only Supabase path: INSERT, conditional UPDATE by version, metadata update, fetch, list, delete |
| `instanceSync.js` | Sync engine: open, sync (insert/update/conflict), pull, refresh, conflict resolution, delete, listings |
| `useToolInstance.js` | Page hook: URL resolution, cloud-first open of unknown ids, revision, conflict state |
| `instanceLinks.js`, `linkGroupId.js` | Linked tool groups |
| `InstanceConflictBanner.jsx`, `CloudInstanceLoading.jsx` | Conflict choice and open-wait UI |

## VTT

| Folder/file | Responsibility |
| --- | --- |
| `map/` | Geometry, hexes, measurement, fog, drawing, and map objects |
| `scene/` | Scene data and atmosphere definitions |
| `session/` | Live sessions/scenes, roles, spectator links, and camera synchronization |
| `tokens/` | Token bridge and encounter import/synchronization |
| `sheets/` | Sheet frame, layout, and view state |
| `rolls/` | Roll feed, thrown rolls, and dice physics |
| `colors.js` | Palette shared across VTT features |

## Imports and tests

Import the defining module directly; avoid compatibility re-exports at retired
paths and broad barrel files that pull unrelated features into the entry bundle.

The test trees mirror the production paths:

- `src/shared/character/combat/conditions.js` → `tests/logic/shared/character/combat/conditions.test.js`
- `src/shared/character/dice/DiceRow.jsx` → `tests/ui/shared/character/dice/DiceRow.test.jsx`

Use `npm test` for hygiene, logic and UI checks, and `npm run build` to verify
production imports. See `tests/README.md` for runner commands.
