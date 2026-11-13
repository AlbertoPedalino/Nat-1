import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFilesMatching } from '../sourceScan.js';

// A lit surface (the combatant whose turn it is, the step to take next, a
// chosen option or row, a hovered card) keeps a solid background: its tone is
// a wash laid OVER a solid base (surfaces.js tintedSurfaceSx, or washImage over
// the element's own fill), never a translucent fill in place of it. A
// translucent fill lets the page's sticker paper, or whatever else is behind,
// show through what is being read (user report 2026-11-12: the GM Board's move
// bar, the active combatant card).

// The files where a translucent fill is written by hand on purpose, each with
// why it is not a surface being read or sits on something solid by design.
const TRANSLUCENT_FILL_ALLOWED = {
  // The recipes: tintedSurfaceSx's wash, and a meter's empty track (its fill is
  // drawn over it).
  'shared/ui/surfaces.js': 'the recipes themselves',
  // Tags and chips: a small tint inside a tag that sits on a solid card,
  // panel, row or menu (the same chip appears on several surfaces, so a fixed
  // base would not match them all).
  'shared/ui/TagChip.jsx': 'tag tint on a solid surface',
  'shared/ui/entityColors.js': "chipTintStyle, the theme's chip tint",
  'shared/character/combat/ConditionChips.jsx': 'condition pills and toggle chips',
  'shared/character/combat/ReminderChips.jsx': 'reminder chips',
  'pages/charsheet/stats/ConditionsBlock.jsx': 'the exhaustion pill, drawn as a condition pill',
  // A dialog's content and action bar, on the dialog's own solid paper.
  'shared/ui/SheetDialog.jsx': "the body over the dialog's solid paper",
  // The battle map's overlays: what is drawn over the board itself, where the
  // map showing through is the point.
  'shared/ui/SelectField.jsx': "an on-map field's dark wash over the board",
  'pages/vtt/tokens/tokenSpriteStyles.js': 'bars, plates and dots drawn over pieces',
  'pages/vtt/tokens/PlacementDialog.jsx': 'the backdrop over the map',
  'pages/vtt/map/LaserOverlay.jsx': 'the laser pointer',
  'pages/vtt/map/sceneViewportStyles.js': 'the selection marquee',
  'pages/vtt/scene/BackgroundStrip.jsx': 'badges laid over a thumbnail picture',
  // Grips and icon hovers: controls with no text to read.
  'pages/vtt/sheets/FloatingSheetPanel.jsx': "the corner resize grip and the close icon's hover",
  'pages/vtt/sheets/BattleMapSheetResizeHandle.jsx': 'the split drag handle',
};

test('a lit surface is a wash over a solid base, not a translucent fill', () => {
  assert.deepEqual(sourceFilesMatching(/(bgcolor|backgroundColor|background):[^,\n]*\b(ui|vtt)?[aA]lpha\(/, {
    allow: Object.keys(TRANSLUCENT_FILL_ALLOWED),
  }), []);
});

// The wash is one gradient, written once: a hand-made `linear-gradient(x, x)`
// of one colour (a wash variable or a translucent colour twice) is washImage.
test('a tone wash over a fill is washImage', () => {
  assert.deepEqual(sourceFilesMatching(/linear-gradient\(\$\{([\w.]+|(?:ui|vtt)?[aA]lpha\([^)]*\))\}, \$\{\1\}\)/, {
    allow: ['shared/ui/colors.js'],
  }), []);
});
