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
`KeyBar` (a bar of keys pressed one at a time: the rests, the dice — one
raised pill, `look` raised, gold or a screen's own; no hand-built ButtonGroup,
guarded), `DoneButton` / `CancelButton` / `ResetButton` (a dialog's ways out, in
`SheetDialog.jsx`: nothing to confirm, nothing done, start over; guarded),
`ChoiceToggle` (one choice among a few, a bar of keys) and `SelectorGroup`
(`shared/gmboard/ui/`: a choice whose options carry a tone or a second line —
an NPC's attitude, starting equipment, the board's options), an on/off toggle
inside a panel is `goldToggleSx` while a bar's own key flips contained/outlined
(TopBarButton, the map's `MAP_SHEET_TOGGLE_SX`), `QuickHourButtons` (letting
the campaign's time pass), `ToggleRow` (an on/off setting), `LabeledSlider` (a dragged value, `marks` for
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
`ListFilterBar` + `useListFilter` (every main page's list: a search and its filters),
`SegmentedMeter` (a meter strip on `meterTrackSx`: share and tone through `useLiveStyle`, never a
rule per value; every hit point bar is `shared/character/combat/HitPointBars.jsx` over it, guarded), `liveStyle.js` (whatever moves every frame: `useLiveStyle`, `writeLiveStyle`,
`useRootStyle`; never sx), `CornerCloseButton`, and the recipes in
`interactive.js` (`focusRingSx` with an optional `tone`, `LIST_ROW_SX`,
`CARD_PART_RULE_SX`, `readoutSx`). The weather card is `WeatherCard` in
`shared/gmboard/ui/WeatherSummary.jsx`.

## The look

A new theme is a change to these files only; every component reads its look
from them and holds none of its own (guarded by the oneDefinition tests).

The viewer picks two things apart in the top bar's settings (the gear,
`app/navigation/SettingsMenu.jsx`, beside the account button: its Theme item
opens the theme panel, `ThemeDialog.jsx`, where
every style shows as a card drawn in its own theme): the **style**
(`SHAPE_STYLES` in `shapes.js`: Comic fantasy, the base; Comic gothic; Sci-fi;
War horror; Arcane astral; Pirate seas; Steampunk; Dwarven forge; Feywild;
Abyssal horror; Pixel retro; Cyberpunk; Comic superhero; Noir detective) and the **mode** (System, Dark, Light). Each style
draws each mode in a palette of its own (its `palettes`: comic in `dark` and
`light`, the parchment; gothic in `dread` and `mist`; sci-fi in `neon` and
`neonLight`; war in `trench` and `dossier`; astral in `starlight` and
`vellum`; pirate in `deepSea` and `seaChart`; steampunk in `foundry` and
`patent`; dwarven in `forge` and `granite`; fey in `twilight` and `blossom`;
abyssal in `abyss` and `asylum`; pixel in `arcade` and `cartridge`; cyberpunk
in `overdrive` and `daylight`; superhero in `heroNight` and `newsprint`; noir in `midnight` and `caseFile`; every light
one tints its panel bars in its accent and lays a page of its own colour). A new style is data only: its palettes in
`colors.js`, its cut in `shapes.js`, its faces in `fonts.js`, its icon sets in
`gameIcons.js` (a set may spread the comic one and redraw some roles) and,
with sticker paper, its papers (`PAPER_PICTURES`); no component changes,
so the palette follows from the two (`paletteForStyle` in `shapes.js`: the one way from a style to its palette, for the page, the theme panel's samples and the dice). The choice lives in
`app/themeChoice.js` (localStorage `gb:theme`, read by `index.html` before the
first paint); `app/ThemeChoiceProvider.jsx` builds the theme for it
(`buildTheme` in `app/theme.js`) and writes the palette on the page's root.
`UI_COLORS.<role>` is that palette's CSS variable (`var(--gb-accent)`), so:
work a colour out only with `uiAlpha` / `uiMix` / `uiLighten` / `uiDarken`
(never MUI's `alpha`/`lighten`/`darken`, guarded); a canvas takes
`vttCanvasColors(usePaletteId())`; a colour saved in data takes `storedColor`
(a hex in the base palette, never a variable); a picture built from markup
(`svgPicture`) and the ink on a fill (`inkOn`) are drawn per palette by
`shared/ui/themedValues.js`, no extra work at the call. Three such values
keep a colour of meaning readable on any palette (`pressable.js`): `inkOn`
picks the lettering for a fill (on a light palette the page's surface too,
for a deep fill); `stickerSx(tone)` fills a solid chip or a map mark (the
tone itself on a dark palette, a pale wash of it on a light one, where the
tones read as text are deep); `textTone(colour)` writes a colour of meaning
as plain text (an entity's colour, a tier, a panel's tone in a row: on a
light palette as deep a shade as reads at AA). A die is dark in every
palette, so what is drawn on it takes the style's dark palette's colours
(`shared/character/dice/dieColors.js`: `dieColor`, `diePicture`).

The dice a player rolls with are theirs (`shared/ui/diceSets.js`, chosen in
the theme panel's Dice style and Dice colors tabs, kept in `gb:theme` as `diceStyle` and
`diceColors`, each the look's own unless picked): a style's cut (`DICE_STYLES`:
the figures' face, the rim's thickness) and a set of colours (`DICE_COLORS`:
face, lit face, number, edge, and the logo's ramp). The viewer's are the die
roles' variables on the root and the `DiceSetProvider` context; a roll sent to
the table carries its roller's (`rollFeed.js`: `dice`), and the toast, the
bubble, the thrown dice and the log draw it in them (`DiceSetScope`). The
app's d20 (`appDie.js`: the home logo, the busy die, the tab's icon) wears the
viewer's colours.

Every palette (`PALETTES` in `colors.js`) fills the same roles and its text roles read on its surfaces at WCAG
AA (both tested in `tests/logic/shared/ui/paletteColors.test.js`). The default
choice is Dark. On a light palette the accent itself is too pale to read as
plain lettering: a label, a link or an icon in the accent with no ink round
it is `accentPlain` (the accent itself on the dark palette), while inked
lettering keeps the accent. Inked lettering (`inkLettering`) is lettered by
the palette's mode (colors.js `LETTERINGS`): on a dark palette the letters
keep their colour, outlined in the ink over their solid shadow; on a light
one a dark neutral (the text's browns) is printed plain, with no outline, a
tone is outlined thinly in a deep shade of itself (a title matches its badge
and its fine strokes do not fill in), and no shadow falls. The page's
drawings take `pageDrawing` and `pageLine`; `edge` is the line round things
(a palette may light it, as neon's cyan) and `onFill` the dark lettering on a
fill (inkOn's dark choice); a rule's own marks (sub-headings,
bold, references) `ruleEmphasis` (RICH_TEXT_ACCENT); the AC tile `armor`.

A style is one entry of `SHAPE_STYLES` with the same keys as `comic` (guarded
in `tests/logic/shared/ui/shapeStyles.test.js`). As with the palette, a shape
that is a CSS value is the chosen style's variable (`SEAL_RADIUS`, `CREST`,
`RIBBON`, `FOCUS_RING`, `CHOICE_MARK`, `MOMENT_BURST`: `var(--gb-shape-…)`); a
shape worked out in code is read from the style (`useStyleShapes()` in
`shared/ui/themeIds.js`: GemPip's cuts — a cut gem, or a token the style
draws (`outline` and `shading`, `tones` by kind over GEM_TONES: gothic's
drops of blood, candles and crosses, war's cartridges, grenades and chevrons,
sci-fi's power cells); a slot's counter and a feature's uses differ in their
cut or their colour —,
SegmentedMeter's counts — pass it a
`METER_SEGMENTS` kind, not a number); the theme's own controls (tabs,
switches, sliders, the chosen row's bookmark) take `styleShapes(styleId)` in
`buildTheme`; a picture cut in the style's shapes (ornament, die glyph,
bursts) is `svgStylePicture`. A roll's natural 20 and natural 1 are the
style's `moments` (`nat20`, `nat1`), each data only: a `burst` behind the
total (a kind of `BURSTS` in `shared/ui/rollMoment.js` and its measures:
kapow, crash, star, lobes, splat, gear, crescent, lens, virus, notched,
polygon, stairs), its `fill` role, the technique it is painted in (`paint`,
`BURST_PAINTS`: comic, engraving, hologram, stencil, stamp,
starlight, chart, brass, molten, stone, watercolor, inkbleed, pixel, neon),
how the total is lettered on it (`number`, `NUMBER_LOOK_KINDS`), its `turn`,
how the bubble moves (`motion`, `BUBBLE_MOTIONS` in `bubble.js`, every one
settling at `--gb-bubble-rest`) and the particles round it (`effect`: a
glyph, a mode and a look of `momentParticles.js`, drawn by
`MomentParticles.jsx`, the comic's sparkles and circling stars among them;
its glyphs are the app's one drawing of each, a gem's sparkle and the home
die's stars too). What a moment says and its colours are `MOMENT_WORDS`
(the toast, a bubble and the roll log). Stars and crescents are cut by the
hand-drawing kit (`handDrawing.js` `starCorners`, `crescentPoints`). Every roll that shouts
(the dice toast, a roll bubble on the map) takes them through `rollMoment`,
`momentBurstSx`, `useRollMoment` and `RollMomentEffect`, never on its own; a
new look is an entry in one of those lists and data in `shapes.js`. A roll
sent to the table carries its roller's style (`style`, `viewerStyleId`), and
the map draws its bubble in it (`app/StyleScope.jsx`: a part of the page in
another style, the theme panel's samples too), so every player sees a roll
as its roller does.

Every speech bubble (the dice toast and its game notices, the app's
notices, a roll's or a hex's bubble on the map) is the style's `bubble`
(`shapes.js`): its `fill` role and `texture`, a drawn `frame` (cut corners,
a torn edge, a riveted plate…) or none, its `radius`, `border`, `outline`,
`tilt`, `shadow`, `tail` (or `none`) and `decor` (tape, brackets, a case
folder's labelled tab: CSS, or a `picture` drawn in the palette's roles),
each a name from the lists in `shared/ui/bubbleLooks.js` (`BUBBLE_TEXTURES`,
`BUBBLE_FRAMES`, `BUBBLE_SHADOWS`, `BUBBLE_TAILS`, `BUBBLE_DECORS`), worked
out per style and palette as themed values. `bubble.js` `bubbleSx` draws it
and `bubbleToneSx` sets the colour its shadow falls in (a roll's kind, a
natural 20 or 1, a notice's severity); `bubbleTailSx` gives it a tail only
where it speaks from something on the screen (a piece, a hex, the dice
dock), never on the app's notices. A roll's coloured lettering on a bubble
(its title, total, modifier) goes through `bubbleTone(tone)`: the colour
itself, but on a paper bubble over a dark page darkened towards its ink, so
it reads on the paper.

The style also inks (`ink` in `shapes.js`: `edge` width, `drop` share of the
solid shadows, `depth` of the soft ones, `lettering` how strongly titles and
figures are inked, 0 printed plain, as `--gb-ink-*`) and builds its panels
(`panel`: the title `bar` a filled strip or only a rule in the panel's tone,
its `hatch`, a `frame` solid or double `frameWidth` wide, the icon on a seal
in the panel's tone or `bare` (`BADGES` in `surfaces.js`), a soft `float` shadow, the title's `flourish`: a line of stars,
rivets, a vine, a tentacle, a glitch, drawn in `panelOrnaments.js`), written as whole
values by `surfaceVariables` (`--gb-panel-*`), the comic's own where a style
builds as the comic does, so its panels stay exactly as they were. Each bar's
ends are cut its own way (`ribbon.ends`: the comic's swallowtail, a spear
point, a folder tab, a scroll, a pixel stair; `ribbonEndsClip`, inked by
`barEndInkSvg`), and each style cuts its own ability crest (`crest`, `side`
keeping the figures inside). Each style lays its own page (`surface.paper`):
the comic's sticker paper, or a scene from `pageScenes.js` laid once behind
the whole app by the theme's `body::before`, the page letting it through: an
inked 1-bit picture recoloured per palette (gothic's graveyard) or a painted
one per mode under a veil of the page's colour (`public/scenes`, every other
style's: CraftPix free assets, credited in the root README). Every length in
`shadows.js` is the comic one times the style's share, and an ink line is
never written by hand (guarded): `INK_EDGE` (the line in ink), `INK_SOLID`
(width and style, colour set apart), `INK_WIDTH` (a width alone),
`inkEdge(px, colour)` (another line of the comic cut, as a bubble's 3px).

A style may light its surfaces instead of drawing them (`light` in
`shapes.js`; the comic's is none of it, and every style that does not name
its own takes the comic's, so it is drawn as before). What makes a style read
as a comic is the ink — a line round every shape, a solid shadow set off from
it, one flat colour inside — so a style that is no comic turns the ink down
(`ink.edge` a hairline in a palette `edge` a shade off its surfaces,
`ink.drop` 0, no `hatch`, a halftone `dot` and `rays` of 0, `motion.hop` 0)
and the light up: `finish` shades a main panel and a box, a card or what
floats (`SURFACE_FINISHES` in `surfaces.js`, read by `surfaceFinish(kind)` in
`panelFrameSx`, `SURFACES.panel` / `card` / `floating` and the theme's cards);
`soft` and `bevel` ride on every solid shadow (`inkShadow`, `UI_SHADOWS.press`
/ `box` / `panel` in `shadows.js`), so whatever was raised by the ink is
raised by a soft shadow and the light along its top edge with no change where
it is used; `well` shades the inside of what is sunken (`wellShadow()`:
`SURFACES.inset`, every field); `page` throws a light on the page behind the
app (`PAGE_LIGHTS`, laid by the theme's `body::after` over the style's scene).
Written as `--gb-light-*` and `--gb-surface-finish-*` by `surfaceVariables`,
shades at a fifth on a light palette (`shadeShare`). A new look is an
entry in `SURFACE_FINISHES` or `PAGE_LIGHTS` and a name in the style's
`light`; no component changes. Every style but the comic ones (Comic
fantasy, Comic gothic, Comic superhero) and Pixel retro is built this way: noir a desk
`lamp` and the `blinds` on its page, war `grime` and `smoke` over its ruins,
the others a `glow` from overhead, an `ember` below or a `lamp`, their scene
under a `vignette`; their palettes are `litPalette`s (the `edge` a hairline
worked out from the surface and the lettering, the colours of meaning faded
as far as each asks: `FADE`, applied where `PALETTES` lists them, `lit(…)`),
and their banners (`panelBanner.js`) clean shapes shaded top to foot, with
volume and detail (a soft shadow under them, `softShadow`; lights caught on
what is round, `glint`, `stud`) and no sketched line. What they all lay the
same way is named once in `shapes.js` and never repeated in a style:
`LIT_INK`, `STRAIGHT_BAR`, `litPanel({ banner, badge, grip, double })` and
`unprinted(paper)`; a style writes only what is its own. What a
style stops using (a banner, a flourish, a bubble's texture, a particle) is
removed from its list: a list holds only what some style draws.

The colours of meaning (a class, a feat, an action's cost, a damage type, a
roll's kind, an item's rarity, a treasure tier) are palette roles too
(`MEANING_COLORS` in `colors.js`: one hex each, carried by every palette), so
they are never a hex in a component: `entityColors.js` (`ENTITY_COLORS`,
`ACTION_COLORS`, `DAMAGE_TYPE_COLORS`, `ROLL_TONES`…), `itemRarity.js`
(`RARITY_COLORS`) and the theme's tiers only name them. They are the same in
every palette, apart from every interface role, unless a palette fades them
into its own light (`litPalette(colors, { mode, fade })`: noir's and war's
about half the way to their quiet text, the others less), so a style that keeps one bright colour is not
lit up by a dozen others.

The six ability scores stand as the style stands them (`abilities` in
`shapes.js`): cut as a crest (`drawing: 'none'`, the `crest`'s clip) or each
drawn as a thing of its own with the hand-drawing kit (`abilityDrawing.js`:
the gothic's `headstones`, six stones in a row, each its cut, lean and
mark), their `figures`
the score beside its modifier (`split`) or the modifier large over the score
(`stacked`). `StatTile` frames a tile either way and `AbilityScores` lays the
figures; a new drawing is an entry in `abilityDrawing.js` and a name in the
style. A roll's toast is the style's bubble or one drawn thing in its place
(`rollToast.drawing`, `toastDrawing.js`: the gothic's `tombstone`, drawn by `DrawnToast.jsx` for the sheet's `DiceToast`
and, smaller, for the map's `RollBubble`); each says the same things on either, the dice over
the total, and a drawn toast shows a natural 20 and a natural 1 its own way:
roses climbing its sides, each on its own stem; the stone split, leaning, a black hand clawing
up before it). What the gothic's stones share is `stonework.js`. An
app notice is the style's bubble too, or one drawn thing (`notice.drawing`,
`noticeDrawing.js`: the gothic's `sealed` strip of parchment, a seal of wax in
the notice's colour hanging from it, its mark pressed in it; in `AppToast`),
so a notice is never taken for a roll. All three are drawn by the one
`MeasuredDrawing.jsx` (a drawing made to the size of the box it is in), each
module answering the same way: its kinds (`…_DRAWING_KINDS`), whether a kind
draws (`draws…`), and its pieces for a size.
A mark or an ornament on a themed piece is always drawn with that kit
(`handDrawing.js`: `sketch`, `brushPath`), never as a shape written in CSS.

It sets the corner `radius` (the theme's, so every sx `borderRadius: n`) and
lays the surfaces (`surface`): the page's `paper` (the stickers, painted per
palette: `PAPER_PICTURES` in `stickerPaper.js`, rebuilt for every palette by
`scripts/build-sticker-paper.mjs`; a palette without its own lays the dark
one), the page's `halftone`, the panel bars' `screentone` and the cover
`rays`, written as `--gb-surface-*` / `--gb-screentone-*` by
`surfaceVariables` (`surfaces.js`) and `shapeVariables`.

It letters in its own faces: `FONT_STYLES` in `fonts.js` (font names live
there only, guarded) gives each style its stacks by role and the stylesheet
that loads them; `UI_FONTS.<role>` is `var(--gb-font-<role>)`; a canvas takes
`fontStacks(useStyleId())`. The base style's stylesheet is the one
`index.html` links (tested); another style's is linked by the provider when
chosen. The type scale (`FONT_SIZES`…) stays one for every style; a style
fits its faces to it (`fits`: font-size-adjust by role over the comic's,
`FONT_FITS`), so a condensed blackletter or a wide sign reads as large as the
comic face at the same size. The prose (descriptions, notes) is fitted as the
style's text unless it fits it apart (`prose`): a typewriter face, wide and
short in its lower case, needs its own or it comes out huge.

Its ink may `glow` (a lit line's halo: every solid shadow and inked lettering
blurs out by `--gb-ink-glow`, 0 in Comic). A theme's variables are composed
once (`themeVariables` in `ThemeChoiceProvider.jsx`) for the page's root and
for each style's sample in the theme panel, so a sample wears its own theme.
No variable may be named `…label`: Emotion reads `label:` in a style as the
class's name and the class stops matching (tested).

It moves at its own `motion`: `pace` scales every time (`--gb-motion-pace`;
0 is no motion), so a time is always `motionTime(DURATIONS.fast)`, never a
constant followed by `ms` (guarded); `hop` is how far a pressed thing hops
and squashes (`PRESS_MOTION_SX`).

| File (`shared/ui/`) | What it decides |
| --- | --- |
| `colors.js`, `entityColors.js`, `../vtt/colors.js` | the palettes (`PALETTES`: each role's hex per palette) and the interface roles and the colours of meaning as variables, what each colour of meaning is the colour of, the map's tones (derived from the interface's) |
| `fonts.js`, `textStyles.js` | the faces (per style: `FONT_STYLES`), the type scale, each text role |
| `shadows.js`, `surfaces.js` | the ink (scaled by the style's `ink`): edges, solid shadows, surfaces (paper, stripe), the meter track; the light (the style's `light`): the soft shadow and bevel on every solid shadow, a well's shade, the surfaces' finishes, the page's light |
| `shapes.js` | the styles (`SHAPE_STYLES`) and every cut shape: a panel bar's ribbon, the seal (badges, counts, a radio, a slider's thumb), the ability crest, the bookmark tab and mark, the gems' cuts, a meter's segments, a roll's moments (`moments`: its bursts, motion and effect), a switch, a checkbox, the ornament, the focus ring, a formula's die |
| `ornament.js`, `ruleText.js`, `rollToken.js` | the ornament drawn once (card rules, page and section titles, a rule's list); a rule's list, boxed text and table in both renderers; a dice formula in the rules' text |
| `gameIcons.js` | every drawing of the game's world: roles, tools (`TOOL_ICONS`), classes — each role drawn in the chosen style's set (comic: game-icons.net and lucide; sci-fi: Tabler line icons), the same role keys in every set (`ICON_SETS`, tested); a role is a component that picks its drawing by `useStyleId()` |
| `motion.js` | how long things move (`motionTime`: at the style's pace), and an animation left out for whoever asked for less motion (`STILL_WHEN_REDUCED`) |
| `app/theme.js` | how MUI's own components take the above (tabs, switches, checkboxes and radios via `ChoiceMarks`, sliders, dialogs, links, menus and chosen rows, focused fields, the focus ring, scrollbars, text selection, chips) |

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
(`registerResourceSideEffect`). What a card sets off with no count of its own
(Font of Magic's Create Slot, Font of Inspiration, Wild Resurgence's slot for a
Wild Shape use) is listed in its `effects` (`{ key, label }`, the side
effect's key), with no stand-in resource: one row each, its label saying the
exchange ("Spell Slot → Wild Shape") and a Use button, beside the row of the
card's own uses when it has some (`resLabel` says what a use does). A side effect returns what follows (a dialog, a recovery, a created
slot, or `{ type: 'notice' }` when it cannot happen). An adapter destructures from
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
