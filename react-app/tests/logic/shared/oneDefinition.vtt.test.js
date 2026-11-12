import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFilesMatching } from '../sourceScan.js';

// The battle map's own pieces, each drawn by one component or recipe, so a
// change to how the map's dialogs, menus, panels and controls look is made in
// one place. A copy on one screen is one a restyle never reaches.

const onMap = (files) => files.filter((file) => file.startsWith('pages/vtt/'));

// Every dialog over the map is a SheetDialog on the map's surface: one title
// bar and action bar for the whole app. The map's second dialog shell and its
// hand-built pieces are gone.
test('a dialog over the map is SheetDialog with surface="map"', () => {
  assert.deepEqual(sourceFilesMatching(/BattleMapDialog|battleMapDialog\w*Sx|battleMapMenuPaperSx/), []);
  assert.deepEqual(onMap(sourceFilesMatching(/<Dialog\b/)), []);
});

// The map's floating paper is MAP_PAPER_SX (shared/ui/mapPaper.js); a screen
// only sizes or pads it, never spreads the map's glass into a paper itself.
test("the map's floating paper is MAP_PAPER_SX", () => {
  assert.deepEqual(onMap(sourceFilesMatching(/paper: \{[^}]*sx: \{[^}]*\.\.\.SURFACES\.map\b/)), []);
});

// A menu on the map, a form at a press or a list under a button, is a MapMenu:
// one paper, one placement, one layout for its controls.
test('a menu on the map is a MapMenu', () => {
  assert.deepEqual(onMap(sourceFilesMatching(/<Menu\b|MuiMenu-list|useMenuPlacement\(/, {
    allow: ['pages/vtt/map/MapMenu.jsx', 'pages/vtt/map/menuPlacement.js'],
  })), []);
});

// The footer of a form menu (Done and what can be done to the thing) is
// MenuFooterActions, and the GM's visibility tick HiddenFromPlayersToggle.
test("a map menu's footer and visibility tick are written once", () => {
  assert.deepEqual(onMap(sourceFilesMatching(/>Done<\/Button>[\s\S]*startIcon/, {
    allow: ['pages/vtt/map/MapMenu.jsx'],
  })), []);
  assert.deepEqual(onMap(sourceFilesMatching(/["'>]Hidden from the players["'<]/, {
    allow: ['pages/vtt/map/MapMenu.jsx'],
  })), []);
});

// An on/off setting with its name beside it is a ToggleRow; the placement
// dialogs' GM layer switch is GmLayerSwitch.
test('an on/off row on the map is a ToggleRow', () => {
  assert.deepEqual(onMap(sourceFilesMatching(/<FormControlLabel\b/)), []);
  assert.deepEqual(onMap(sourceFilesMatching(/GM layer"|The party sees/, {
    allow: ['pages/vtt/tokens/GmLayerSwitch.jsx'],
  })), []);
});

test('a slider on the map is a LabeledSlider', () => {
  assert.deepEqual(onMap(sourceFilesMatching(/<Slider\b|from '@mui\/material\/Slider'/)), []);
});

// A panel floating over the map is MapFloatingPanel (a corner's is
// MapCornerPopout), on mapPanelSx, its title mapPanelTitleSx.
test("a floating map panel and its title are battleMapSurface's recipes", () => {
  assert.deepEqual(sourceFilesMatching(/TEXT_STYLES\.title,\s*fontSize: FONT_SIZES\.md,\s*color: 'primary\.main'/, {
    allow: ['pages/vtt/map/battleMapSurface.js'],
  }), []);
  assert.deepEqual(onMap(sourceFilesMatching(/export const ICON_STRIP\b/, {
    allow: ['pages/vtt/map/MapCornerPopout.jsx'],
  })), []);
});

// The round buttons on the map take mapIconButtonSx; the raised map control
// is spread by hand only for what is not a button (the background strip's
// frame, the atmosphere picker's tiles).
test('a round map button is mapIconButtonSx', () => {
  assert.deepEqual(onMap(sourceFilesMatching(/\.\.\.SURFACES\.mapControl\b/, {
    allow: [
      'pages/vtt/map/battleMapSurface.js',
      'pages/vtt/scene/BackgroundStrip.jsx',
      'pages/vtt/scene/AtmospherePicker.jsx',
    ],
  })), []);
  assert.deepEqual(onMap(sourceFilesMatching(/bgcolor: mapIconButtonSx\.bgcolor|border: mapIconButtonSx\.border/)), []);
});

// A section heading on the map is MapSectionTitle: the scene panel's labels,
// the piece menu's sections, the hexcrawl's.
test('a section heading on the map is MapSectionTitle', () => {
  assert.deepEqual(onMap(sourceFilesMatching(/\bSectionLabel\b|tokenMenuStyles|sectionTitleSx\b(?![^\n]*\{\s*$)/, {
    allow: ['pages/vtt/scene/ScenePanelSection.jsx'],
  })), []);
});

// Whose sheet is on show is picked in one place, with one rule for when the
// picker shows.
test('the character sheet picker is SheetCharacterSelect', () => {
  assert.deepEqual(sourceFilesMatching(/ariaLabel="Character sheet"/, {
    allow: ['pages/vtt/sheets/SheetCharacterSelect.jsx'],
  }), []);
});

// A walked hex is named by hexLabel ("Hex 2, -1 · Forest (4h)"), and the
// weather it was walked under is a WeatherTag.
test('the hexcrawl readouts are hexLabel and WeatherTag', () => {
  assert.deepEqual(onMap(sourceFilesMatching(/`Hex \$\{|>\s*Hex \{/, {
    allow: ['pages/vtt/hexcrawl/hexLabel.js'],
  })), []);
  assert.deepEqual(onMap(sourceFilesMatching(/\bweatherName\(|hasWeatherDisadvantage\(/, {
    allow: ['pages/vtt/hexcrawl/WeatherTag.jsx'],
  })), []);
});
