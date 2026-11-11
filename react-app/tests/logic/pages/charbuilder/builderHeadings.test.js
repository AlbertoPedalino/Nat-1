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

// Every builder text takes its size from BUILDER_TEXT (layout/builderText.js):
// no size written in a component, no text variant bringing the theme's own.
test('builder text sizes come only from builderText.js', () => {
  const inBuilder = (hit) => hit.startsWith('pages/charbuilder/');
  assert.deepEqual(sourceLinesMatching(/fontSize\s*:/, { allow: ['pages/charbuilder/layout/builderText.js'] }).filter(inBuilder), []);
  assert.deepEqual(sourceLinesMatching(/variant="(body1|body2|caption|subtitle1|subtitle2|overline)"/).filter(inBuilder), []);
});
