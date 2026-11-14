# Source map

Organize code by the feature it belongs to. Within a feature, keep components,
hooks, styles, and pure logic together so a change to one element can be found
in one folder.

## Top level

| Path | Responsibility |
| --- | --- |
| `main.jsx` | Browser entry point and provider composition |
| `app/` | Application routes (`App.jsx`), theme, and navigation widgets |
| `pages/` | Routed features and their implementation |
| `shared/` | Reusable UI, domain rules, storage, and cloud services; see [shared modules](shared/README.md) |
| `adapters/` | D&D rule adapters, grouped by class, species, feat, spell, or item |

`app/navigation/` contains the app top bar, the linked-tool menu and `toolCatalog.js`
(each tool's name, colour and icon — the icons are `TOOL_ICONS` in `shared/ui/gameIcons.js`). Generic inputs
such as `ColorField` and `InfoHint` belong to `shared/ui/`, with the one piece for
each recurring job (guarded by `tests/logic/shared/oneDefinition*.test.js`):
`ToggleRow` (an on/off setting), `LabeledSlider` (a dragged value, `marks` for
labelled stops), `TipIconButton` (an icon button, `danger` for one that removes; every icon button
stands raised from the theme, `PART_ICON_BUTTON_SX` only for an icon that is part of
something else), `CloseButton` / `CornerCloseButton` (every X), `RowExpandButton` (a
row's chevron),
`DisclosureButton` + `CollapsibleBody` / `ExpandableCard` (what opens and closes),
`ScrollingName` (a card name on one line), `ScrollWell` (a list that scrolls, opened on
its chosen row), `centerInScroller` (`scrollReveal.js`: the current item of a scrolling
list or strip kept in the middle, only that box scrolling), `SearchField` / `DraftSearchField` (every search, "Search <what>…"), `PickableRow` + `entryCard.js` (an
action, spell or item card: owned = raised card, pickable = ruled row),
`CardSection` (a ruled part of a card, `dense` in a packed block), `TagChip`,
`Panel` / `SidePanel` / `PageHeader` (given the page's `tool`, a `TOOL_CATALOG` entry, so its
mark matches the home's card; `usePanelsWithoutLayers` for a page over a moving board),
`ListFilterBar` + `useListFilter` (every main page's list: a search and its filters), `liveStyle.js` (whatever moves every frame: `useLiveStyle`, `writeLiveStyle`,
`useRootStyle`; never sx), `CornerCloseButton`, and the recipes in
`interactive.js` (`focusRingSx` with an optional `tone`, `LIST_ROW_SX`,
`CARD_PART_RULE_SX`, `readoutSx`). The weather card is `WeatherCard` in
`shared/gmboard/ui/WeatherSummary.jsx`.

## Page features

The page entry component stays directly inside its page folder. Subfolders own
the elements below; they are not separated into parallel `components/`, `hooks/`,
and `logic/` trees.

| Page | Subfolders and responsibility |
| --- | --- |
| `vtt/` | `scene/`: editing, selection (`ScenePicker`: one campaign's scenes, the second step), creation, and image stitching; `map/`: viewport, grids, fog, drawing, and laser; `tokens/`: roster, token interaction, and encounter import; `objects/`: map objects; `atmosphere/`: overlay and shaders; `sheets/`: floating sheets; `rolls/`: dice and roll feed; `initiative/`: turn-order strip and the scene's shown fight; `session/`: access and campaign selection (`CampaignTablePicker`: every table, the first step — one you run opens its scenes, one you play at joins it); `dungeon/` and `hexcrawl/`: linked exploration panels |
| `charsheet/` | `actions/`, `spells/`, `inventory/`, and `forms/`: respective tabs and controls; `resources/`: HP, hit dice, and rests; `stats/`: scores, saves, skills, movement, and senses; `proficiency/`: proficiency rules and context; `details/`: background, features, and notes; `layout/`: header and tab layout; `layout/layout.js`: the sheet grid and column, and `sheetResponsive` / `sheetGridSx` (an embedded sheet takes the phone's layout); `state/`: derived sheet state, effects, action context, and the sheet's hooks (`useSheetCloudSave`: content save and conflicts; `useSheetRolls`: dice, toast, roll log; `useSheetVitals`: HP, death saves, conditions; `sheetLoad.js`: opening a character) |
| `charbuilder/` | `choices/`: selection controls and feat prerequisites; `progression/`: classes, levels, XP, and calculations; `spells/`: spell selection and slots; `preview/`: preview UI and model; `data/`: reference-data loading and item variants; `state/`: reducer (`state.js`, with `classHandlers.js`, `stateHandlers.js`, `choiceCleanup.js`, `equipmentChoices.js`, `initialState.js`), persistence (`persistence.js`, `sheetImport.js`, `proficiencyPersistence.js`), and export; `layout/`: builder panels; `steps/`: wizard steps |
| `encounterbuilder/` | `bestiary/`: monster browsing, stat blocks, and data; `builder/`: party setup and difficulty; `combat/`: combatants, effects, and reinforcements; `rolls/`: rolls, sharing, and fumbles; `campaign/`: campaign players and sheet synchronization; `library/`: saved fights; `negotiation/`: negotiation dialog and rules; `sync/`: cloud/external fight and map synchronization; `state/`: context, reducer (with `partyState.js`, `combatState.js`, `libraryState.js`), persistence, and constants |
| `gmboard/` | `dungeon/`, `hexcrawl/`, and `quests/`: generation and result views; `tables/`: the table catalog (icons, editor columns), editing, and single-table rolls; `session/`: date and time, weather, and the session log; `ui/`: BoardPanel, the result card parts, and the guide; `state/`: context (one `editClock` for every hand edit of the campaign clock), reducer, defaults, migration, and persistence. Table rules (BOARD_TABLES, event kinds, loot), result text and visuals live in `shared/gmboard/` |
| `dmscreen/` | `notes/`: note board, cards, and layout; `search/`: filtering and highlighting; `drag/`: drag/reorder behavior and styles; `state/`: context, reducer, and persistence |

`compendium/` is one search over the supported 5etools records, with catalogs and books. The
root holds the tabs (`CompendiumHome.jsx`), the `/compendium` page, the session side panel
(`CompendiumPanel.jsx`, opened by `CompendiumButton.jsx` in every top bar) and the styles its
parts share (`compendiumStyles.js`). `search/`: `compendiumIndex.js` (pure index and ranking)
and `CompendiumBrowser.jsx` (search, kind toggles, paged results, entry). `catalogs/`: one
definition per catalog (`spellCatalog.js`, `monsterCatalog.js`, `itemCatalog.js`: what it
lists, its filter fields — select, yes/no, typed min–max range — and sorts), run by
`catalogFilter.js` (fields engine in `shared/content/filterFields.js`, controls in
`shared/ui/FilterFieldControls.jsx`; the monster fields are the bestiary's
`MONSTER_FILTER_FIELDS`) and drawn by the generic `Catalog.jsx` (react-window list), with the columns
and the tab list in `catalogColumns.jsx`. `detail/`: `CompendiumDetail.jsx`. `books/`:
`books.js` + `BookLinks.jsx`. `data/`: `loadCompendium.js` (every kind once per tab through the
existing loaders, `useCompendium`) and `itemPictures.js`.

The smaller `campaigns/`, `campaignsheet/`, `home/`, `library/`, and `notfound/`
pages retain their compact structure. Add subfolders when a distinct element
has enough related files to benefit from a group.

Examples:

- A VTT token change starts in `pages/vtt/tokens/`, including
  `TokenLayer.jsx` and `TokenMenu.jsx`.
- Spell-list rendering and its filtering rules are together in
  `pages/charsheet/spells/`.
- Quest generation and its result cards are together in `pages/gmboard/quests/`.
- Shared token synchronization rules are in `shared/vtt/tokens/`.

## Class features on the sheet

What a class, subclass, species or feat adds to the sheet is declared in its
adapter (`adapters/classes/<class>/<subclass>.js`, `adapters/feats/`,
`adapters/species/`): action cards, resources, effects, proficiencies, item
flags (`registerItemFlagDef`) and what spending a resource triggers
(`registerResourceSideEffect`). An adapter destructures from
`createAdapterBindings` only the names it calls. The register/get pairs are
generated from `KEYED_SLOTS` in `adapters/registry.js`; a new kind of
per-owner data is one row there. Class runtime config (spellcasting tables,
prerequisites) lives in `adapters/classes/runtime-config.js`; a subclass's in
its own file. New sheet code reads what
the registry returns instead of checking a class or feature name.

A feature with its own state and an interactive panel (Wild Shape, Wild
Companion, Primal Companion, Eldritch Cannon, Magic Item Tinker) takes these
pieces; Primal Companion is a complete example:

1. **Rules and state:** `shared/character/forms/<feature>Form.js`
   (`primalCompanionForm.js`). The state lives on the character
   (`C.primalCompanion`), is read through one accessor (`getPrimalCompanion`)
   and changed through patch builders (`summonPrimalBeastPatch`) that the panel
   hands to `onUpdateCharacter`. Pure functions, tested in
   `tests/logic/shared/character/forms/`.
2. **Card:** the adapter's action card declares `detailType: '<feature>'`.
3. **Panel:** `pages/charsheet/forms/<Feature>Panel.jsx`, registered under that
   `detailType` in `pages/charsheet/actions/actionDetailRenderers.js`. It
   receives `{ action, character, sheet, resources, onResChange, resMax }`,
   writes through `useSheetActions()`, and spends slots with
   `shared/character/spells/spellSlots.js` (`consumeSlot`,
   `lowestAvailableSlotLevel`). Creature panels reuse
   `useSummonedCreatureRecords`, `useCreatureRolls` and `BeastStatBlock.jsx`.
4. **Rest:** a state that ends or resets on a Long Rest adds one line to
   `shared/character/resources/longRest.js`.
5. **Export:** the state field joins `CHARACTER_PLAY_STATE_FIELDS` in
   `shared/character/profile/characterExport.js`.
6. **Numbers:** a feature that changes the character's numbers (Wild Shape's
   AC, speeds, saves, skills) does it through its module's accessors, called by
   the one calculation that owns each number (`shared/character/combat/ac.js`,
   `shared/character/sheet/sheetStats.js`), never inside a panel.

Rules stay in `shared/` because the battle map and the encounter builder read
them too; adapters hold no React, since they are loaded as rule modules.

## Boundaries and imports

- Use `shared/` for reusable capabilities, and `app/` for application composition
  and navigation. Page-specific components stay with their page feature.
- Import the defining module directly, including its extension. Avoid adding
  compatibility modules at retired paths or broad barrels across features.
- Keep existing lazy route imports and adapter discovery intact. Adapter
  filenames are discovered by `adapters/index.js`; class and subclass adapters
  already have their own class folders. Individual feats and spells remain
  directly searchable by name in their existing domain folders.
- `shared/` never imports from `pages/`, and a page imports another page only
  through that page's public entry points (an embedded page, a route button,
  the encounter hand-off). Code two pages need lives in `shared/`.
  `tests/logic/shared/layers.test.js` enforces both rules.

## Tests

`tests/logic/` and `tests/ui/` mirror the source feature paths. For example:

```text
src/pages/vtt/tokens/TokenLayer.jsx
tests/ui/pages/vtt/tokens/TokenLayer.test.jsx

src/pages/gmboard/state/useGmBoardPersistence.js
tests/ui/pages/gmboard/state/useGmBoardPersistence.test.jsx
```

Existing suites covering several page features remain in that page's
`tests/logic/.../logic/` folder. Browser canvas checks remain in `tests/browser/`.
Whenever a source file moves, update test imports, mocks, browser fixtures, and
documentation too. From `react-app/`, run `npm test` and `npm run build`.
