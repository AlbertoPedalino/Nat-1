import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFilesMatching } from '../sourceScan.js';

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

// A light tile is SURFACES.wash and a meter's empty track is meterTrackSx:
// their white washes are written only in surfaces.js.
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
