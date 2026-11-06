import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const SRC = new URL('../../../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// What one page may use of another: a page it embeds, a route button, the
// encounter builder's hand-off to the battle map. Everything else two pages
// share lives in shared/.
const PAGE_ENTRY_POINTS = [
  'pages/campaignsheet/CampaignSheetView.jsx',
  'pages/charsheet/CharacterSheet.jsx',
  'pages/compendium/CompendiumButton.jsx',
  'pages/encounterbuilder/state/storage.js',
  'pages/encounterbuilder/sync/handoff.js',
  'pages/notfound/NotFoundPage.jsx',
];

function importEdges() {
  const edges = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!/\.(js|jsx)$/.test(name)) continue;
      const from = relative(SRC, path).replace(/\\/g, '/');
      const code = readFileSync(path, 'utf8');
      for (const m of code.matchAll(/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const to = relative(SRC, resolve(dirname(path), m[1])).replace(/\\/g, '/');
        edges.push({ from, to });
      }
    }
  };
  walk(SRC);
  return edges;
}

const area = (file) => (file.startsWith('pages/') ? file.split('/').slice(0, 2).join('/') : file.split('/')[0]);

test('shared/ and adapters/ never import from pages/', () => {
  const offenders = importEdges()
    .filter(({ from, to }) => ['shared', 'adapters'].includes(area(from)) && to.startsWith('pages/'))
    .map(({ from, to }) => `${from} -> ${to}`);
  assert.deepEqual(offenders, []);
});

test('a page imports another page only through its entry points', () => {
  const offenders = importEdges()
    .filter(({ from, to }) => from.startsWith('pages/') && to.startsWith('pages/') && area(from) !== area(to))
    .filter(({ to }) => !PAGE_ENTRY_POINTS.includes(to))
    .map(({ from, to }) => `${from} -> ${to}`);
  assert.deepEqual(offenders, []);
});
