import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLinesMatching } from '../../sourceScan.js';

// The builder's text takes the sheet's roles (PanelHeader, sheetBoxTitleSx,
// sheetSectionHeaderSx, cardTitleSx): a heading variant brings the theme's
// page-title size into a panel. Only the page title and the app bar use one.
test('builder headings take a shared role, not a heading variant', () => {
  const hits = sourceLinesMatching(/variant="h[1-6]"/, {
    allow: ['pages/charbuilder/CharBuilder.jsx', 'pages/charbuilder/layout/BuilderAppBar.jsx'],
  }).filter((hit) => hit.startsWith('pages/charbuilder/'));
  assert.deepEqual(hits, []);
});
