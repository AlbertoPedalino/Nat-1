import test from 'node:test';
import assert from 'node:assert/strict';
import { readSource, sourceFilesMatching, sourceLinesMatching } from '../sourceScan.js';

// Looks and jobs drawn by one shared component each (disclosures, card
// sections, side panels, corner close buttons, callouts, meters, dialog
// sections). A local copy is one a restyle never reaches.

// What opens and closes goes through CollapsibleBody, which also drops a
// fully collapsed box out of the layout (MUI leaves a zero-height one behind).
test('a collapsing body is a CollapsibleBody', () => {
  assert.deepEqual(sourceFilesMatching(/MuiCollapse-hidden/, { allow: ['shared/ui/CollapsibleBody.jsx'] }), []);
  assert.deepEqual(sourceFilesMatching(/<Collapse\b/, { allow: ['shared/ui/CollapsibleBody.jsx'] }), []);
});

// A button that opens what sits under it is a DisclosureButton: one chevron
// convention, aria-expanded, a label.
test('a disclosure toggle is a DisclosureButton', () => {
  assert.deepEqual(sourceFilesMatching(/(start|end)Icon=\{\w+ \? <(Chevron(Up|Down|Right)|X|Plus)\b|<Button\b[^>]*aria-expanded/, {
    allow: ['shared/ui/DisclosureButton.jsx'],
  }), []);
});

// A panel is the shared Panel (or a SidePanel), never an Accordion dressed up
// as one.
test('a folding panel is a Panel with a DisclosureButton, not an Accordion', () => {
  assert.deepEqual(sourceFilesMatching(/<Accordion\b/, { allow: ['shared/content/EntryAccordion.jsx'] }), []);
});

// A ruled part of an opened card under a small accent title is a CardSection
// (its title alone, cardSectionTitleSx); a ruled row of controls without a
// title is one too, `dense` inside a packed block.
test('a ruled card part is a CardSection', () => {
  assert.deepEqual(sourceFilesMatching(/mt: [\d.]+, pt: [\d.]+, \.\.\.CARD_PART_RULE_SX/, {
    allow: ['shared/ui/CardSection.jsx'],
  }), []);
  assert.deepEqual(sourceFilesMatching(/const SECTION_HEADING_SX\b/), []);
});

// The X in a corner is the CornerCloseButton, so every one sits, sizes and
// names itself the same.
test('a corner close button is the CornerCloseButton', () => {
  assert.deepEqual(sourceFilesMatching(/top: 8, right: 8/, { allow: ['shared/ui/CornerCloseButton.jsx'] }), []);
  assert.deepEqual(sourceFilesMatching(/\b(const|function)\s+(cornerCloseSx|closeButtonSx|removeButtonSx)\b/), []);
});

// A side panel beside a page's main column is the SidePanel: its header and
// scrolling body are not written twice.
test('a side panel is the SidePanel', () => {
  assert.deepEqual(sourceFilesMatching(/maxHeight: \{ xs: 520, lg: 'calc\(100vh - 218px\)' \}/, {
    allow: ['shared/ui/SidePanel.jsx'],
  }), []);
});

// A light tile is SURFACES.wash: its white wash is written only in
// surfaces.js, as a meter's empty track (meterTrackSx) is.
test('the wash and the meter track are drawn only by surfaces.js', () => {
  assert.deepEqual(sourceFilesMatching(/uiAlpha\(UI_COLORS\.white, OPACITY\.(faint|soft)\)/, { allow: ['shared/ui/surfaces.js'] }), []);
});

// A dialog section's title (and its hint) is a DialogSection, and a dialog
// that is a whole tool fills a phone through SheetDialog's phoneFullScreen.
test('dialog sections and the phone full screen go through SheetDialog', () => {
  assert.deepEqual(sourceFilesMatching(/\bdialogSectionTitleSx\b/, { allow: ['shared/ui/SheetDialog.jsx'] }), []);
  assert.deepEqual(sourceFilesMatching(/fullScreen=\{/, { allow: ['shared/ui/SheetDialog.jsx'] }), []);
});

// An on/off setting with its name beside it is a ToggleRow, and a value picked
// by dragging a LabeledSlider, on every page: one row and one slider look.
test('an on/off row is a ToggleRow and a slider a LabeledSlider', () => {
  assert.deepEqual(sourceFilesMatching(/<FormControlLabel\b|<Switch\b/, { allow: ['shared/ui/ToggleRow.jsx'] }), []);
  assert.deepEqual(sourceFilesMatching(/<Slider\b|from '@mui\/material\/Slider'/, { allow: ['shared/ui/LabeledSlider.jsx'] }), []);
});

// The keyboard's focus ring is focusRingSx (shared/ui/interactive.js), in a
// tone when the thing wears one: no ring is drawn by hand.
test('a focus ring is focusRingSx', () => {
  assert.deepEqual(sourceFilesMatching(/['"]&(:focus-visible|\.Mui-focusVisible)['"]: \{ outline|outline: ['`]2px solid/, {
    allow: ['shared/ui/interactive.js'],
  }), []);
});

// The weather card (the WeatherSummary in a callout of its tone, the date and
// the next weather check under it) is WeatherCard, on the GM Board and the map.
test('the weather card is WeatherCard', () => {
  assert.deepEqual(sourceFilesMatching(/weatherTimerLabel\(/, {
    allow: ['shared/gmboard/weather.js', 'shared/gmboard/ui/WeatherSummary.jsx'],
  }), []);
});

// A scrolling list is a ScrollWell: it opens on its chosen row, so a choice
// made earlier is in view without scrolling for it. A well drawn with
// scrollWellSx by hand would open at the top again.
test('a scrolling list is a ScrollWell', () => {
  assert.deepEqual(sourceFilesMatching(/\bscrollWellSx\(/, {
    allow: ['shared/ui/surfaces.js', 'shared/ui/ScrollWell.jsx', 'shared/ui/entryCard.js'],
  }), []);
  // Nor a bare box capped and scrolled on the spot, in the builder and the
  // sheet: the list would scroll with neither the well nor its chosen row.
  const handScrolled = /maxHeight: [^,}]+, overflow(Y)?: 'auto'/;
  assert.deepEqual(sourceLinesMatching(handScrolled).filter((hit) => /^pages\/(charbuilder|charsheet)\//.test(hit)), []);
});

// The current one of a scrolling list (a ScrollWell's choice, the turn in the
// encounter's roster and the map's initiative strip, the background on show)
// is brought to the middle by centerInScroller alone: only that box scrolls.
// scrollIntoView moved every box around it, the map included.
test('a list keeps its current item in view through centerInScroller', () => {
  assert.deepEqual(sourceLinesMatching(/\(\s*\w+\.client(Height|Width) - /, { allow: ['shared/ui/scrollReveal.js'] }), []);
  assert.deepEqual(sourceLinesMatching(/scrollIntoView\(/, {
    // A result just rolled, shown inside its own dialog: no list to keep.
    allow: ['pages/encounterbuilder/rolls/CriticalFumblesDialog.jsx'],
  }), []);
});

// A creature's markers sit in one frame, MarkerManager (pills in view, the
// surface that adds more, the clear): the sheet's panels and an encounter
// combatant's lines alike. Reminders always come as a ReminderEditor (the
// frame with its chips and field), and the condition grid only inside the
// frame — or as the map piece menu's own column, where every condition is a
// switch in view and there is nothing to frame.
test('a marker frame is MarkerManager', () => {
  assert.deepEqual(sourceFilesMatching(/<ReminderField\b/, { allow: ['shared/character/combat/ReminderChips.jsx'] }), []);
  const grids = sourceFilesMatching(/<ConditionToggleGrid\b/, { allow: ['pages/vtt/tokens/TokenMarkers.jsx'] });
  assert.deepEqual(grids.filter((file) => !/<MarkerManager\b/.test(readSource(file))), []);
  assert.deepEqual(sourceFilesMatching(/\bfunction MarkerRow\b|MarkerRow\.jsx/), []);
});
