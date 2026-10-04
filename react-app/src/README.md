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
| `vtt/` | `scene/`: editing, selection, creation, and image stitching; `map/`: viewport, grids, fog, drawing, and laser; `tokens/`: roster, token interaction, and encounter import; `objects/`: map objects; `atmosphere/`: overlay and shaders; `sheets/`: floating sheets; `rolls/`: dice and roll feed; `session/`: access and campaign selection; `dungeon/` and `hexcrawl/`: linked exploration panels |
| `charsheet/` | `actions/`, `spells/`, `inventory/`, and `forms/`: respective tabs and controls; `resources/`: HP, hit dice, and rests; `stats/`: scores, saves, skills, movement, and senses; `proficiency/`: proficiency rules and context; `details/`: background, features, and notes; `layout/`: header and tab layout; `state/`: derived sheet state, effects, and action context |
| `charbuilder/` | `choices/`: selection controls and feat prerequisites; `progression/`: classes, levels, XP, and calculations; `spells/`: spell selection and slots; `preview/`: preview UI and model; `data/`: reference-data loading and item variants; `state/`: reducer, persistence, import, and export; `layout/`: builder panels; `steps/`: wizard steps |
| `encounterbuilder/` | `bestiary/`: monster browsing, stat blocks, and data; `builder/`: party setup and difficulty; `combat/`: combatants, effects, and reinforcements; `rolls/`: rolls, sharing, and fumbles; `campaign/`: campaign players and sheet synchronization; `library/`: saved fights; `negotiation/`: negotiation dialog and rules; `sync/`: cloud/external fight and map synchronization; `state/`: context, reducer, persistence, and constants |
| `gmboard/` | `dungeon/`, `hexcrawl/`, and `quests/`: generation and result views; `tables/`: tables, editing, and single-table rolls; `session/`: time, weather, log, and campaign link; `ui/`: controls used across the page; `state/`: context, reducer, defaults, migration, and persistence; `logic/`: common RNG |
| `dmscreen/` | `notes/`: note board, cards, and layout; `search/`: filtering and highlighting; `drag/`: drag/reorder behavior and styles; `state/`: context, reducer, and persistence |

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

## Boundaries and imports

- Use `shared/` for reusable capabilities, and `app/` for application composition
  and navigation. Page-specific components stay with their page feature.
- Import the defining module directly, including its extension. Avoid adding
  compatibility modules at retired paths or broad barrels across features.
- Keep existing lazy route imports and adapter discovery intact. Adapter
  filenames are discovered by `adapters/index.js`; class and subclass adapters
  already have their own class folders. Individual feats and spells remain
  directly searchable by name in their existing domain folders.
- This reorganization preserves behavior and existing dependencies. Some page
  modules, such as character data loaders and sheet calculations, already have
  consumers on other pages. Moving them here does not make those dependencies
  private or change their API.

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
