import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFilesMatching } from '../sourceScan.js';

// The panel that opens under a sheet row (a beast form, a familiar, a summon,
// a cannon, created items, an action's details) is DetailPanel. Its surface,
// header row and footnote were copied into each panel and drifted; they now
// live only in DetailPanel.jsx.

const DETAIL_PANEL = 'pages/charsheet/layout/DetailPanel.jsx';

test('the detail panel surface is used only by DetailPanel', () => {
  assert.deepEqual(sourceFilesMatching(/\bdetailPanelSx\b/, { allow: [DETAIL_PANEL] }), []);
});

test('the detail panel title and quiet text are defined only in DetailPanel', () => {
  assert.deepEqual(sourceFilesMatching(/(const|let|var)\s+(detailTitleSx|detailMetaSx)\s*=\s*\{/, {
    allow: [DETAIL_PANEL],
  }), []);
});

test('the detail panel header row is built only by DetailPanel', () => {
  assert.deepEqual(sourceFilesMatching(/display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*0\.5,\s*mb:\s*0\.5\s*\}/, {
    allow: [DETAIL_PANEL],
  }), []);
});

// The quiet italic footnote of a detail panel is a DetailNote.
test('the detail panel footnote is a DetailNote', () => {
  assert.deepEqual(sourceFilesMatching(/\.\.\.TEXT_STYLES\.note,\s*\.\.\.(subSx|detailMetaSx)\b/, {
    allow: [DETAIL_PANEL],
  }), []);
});

// "Spend a use or a spell slot" is picked and paid through useCostMode.
test('a use-or-slot cost falls back in useCostMode only', () => {
  assert.deepEqual(sourceFilesMatching(/costMode\s*===\s*'slot'|effectiveCost\b/, {
    allow: ['pages/charsheet/forms/useCostMode.js'],
  }), []);
});

test('a beast summary line is built only by beastSummary', () => {
  assert.deepEqual(sourceFilesMatching(/`CR \$\{[^}]+\.cr\} · \$\{[^}]+\.size\}/, {
    allow: ['shared/character/forms/beasts.js'],
  }), []);
});
