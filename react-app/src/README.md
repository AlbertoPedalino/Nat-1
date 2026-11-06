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

`app/navigation/` contains the app top bar and linked-tool menu. Generic inputs
such as `ColorField` and `InfoHint` belong to `shared/ui/`.

## Page features

The page entry component stays directly inside its page folder. Subfolders own
the elements below; they are not separated into parallel `components/`, `hooks/`,
and `logic/` trees.

| Page | Subfolders and responsibility |
| --- | --- |
| `vtt/` | `scene/`: editing, selection, creation, and image stitching; `map/`: viewport, grids, fog, drawing, and laser; `tokens/`: roster, token interaction, and encounter import; `objects/`: map objects; `atmosphere/`: overlay and shaders; `sheets/`: floating sheets; `rolls/`: dice and roll feed; `initiative/`: turn-order strip and the scene's shown fight; `session/`: access and campaign selection; `dungeon/` and `hexcrawl/`: linked exploration panels |
| `charsheet/` | `actions/`, `spells/`, `inventory/`, and `forms/`: respective tabs and controls; `resources/`: HP, hit dice, and rests; `stats/`: scores, saves, skills, movement, and senses; `proficiency/`: proficiency rules and context; `details/`: background, features, and notes; `layout/`: header and tab layout; `state/`: derived sheet state, effects, action context, and the sheet's hooks (`useSheetCloudSave`: content save and conflicts; `useSheetRolls`: dice, toast, roll log; `useSheetVitals`: HP, death saves, conditions; `sheetLoad.js`: opening a character) |
| `charbuilder/` | `choices/`: selection controls and feat prerequisites; `progression/`: classes, levels, XP, and calculations; `spells/`: spell selection and slots; `preview/`: preview UI and model; `data/`: reference-data loading and item variants; `state/`: reducer, persistence, import, and export; `layout/`: builder panels; `steps/`: wizard steps |
| `encounterbuilder/` | `bestiary/`: monster browsing, stat blocks, and data; `builder/`: party setup and difficulty; `combat/`: combatants, effects, and reinforcements; `rolls/`: rolls, sharing, and fumbles; `campaign/`: campaign players and sheet synchronization; `library/`: saved fights; `negotiation/`: negotiation dialog and rules; `sync/`: cloud/external fight and map synchronization; `state/`: context, reducer, persistence, and constants |
| `gmboard/` | `dungeon/`, `hexcrawl/`, and `quests/`: generation and result views; `tables/`: tables, editing, and single-table rolls; `session/`: time, weather, log, and campaign link; `ui/`: controls used across the page; `state/`: context, reducer, defaults, migration, and persistence; `logic/`: common RNG |
| `dmscreen/` | `notes/`: note board, cards, and layout; `search/`: filtering and highlighting; `drag/`: drag/reorder behavior and styles; `state/`: context, reducer, and persistence |

`compendium/` is one search over the supported 5etools records: `compendiumIndex.js`
(pure index and ranking), `loadCompendium.js` (loads every kind once per tab through
the existing loaders), `CompendiumBrowser.jsx` (search, kind filter, results, entry),
`CompendiumDetail.jsx`, the catalogs (generic `Catalog.jsx` with a react-window list; filters in
`spellCatalog.js`, `monsterCatalog.js`, `itemCatalog.js`; tabs in `SpellMonsterCatalogs.jsx` and
`ItemCatalogs.jsx`), the Books tab (`books.js` + `BookLinks.jsx`: the supported books
as links to their 5etools pages), the tabs (`CompendiumHome.jsx`), the `/compendium` page and the session side panel
(`CompendiumPanel.jsx`, opened by `CompendiumButton.jsx` in the battle map's and DM
Screen's top bars).

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
`createAdapterBindings` only the names it calls. New sheet code reads what
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
