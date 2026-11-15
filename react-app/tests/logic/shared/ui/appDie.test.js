import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appDieSvg } from '../../../../src/shared/ui/appDie.js';
import { DICE_COLORS } from '../../../../src/shared/ui/diceSets.js';

// The tab's icon index.html links before the app draws (public/favicon.svg) is
// the app's d20 in the comic dice, the very drawing appDie.js makes: a new
// die is redrawn there too, never left behind.
test('the icon file is the app die in the comic dice', () => {
  const { logo, edge } = DICE_COLORS.comic;
  assert.equal(readFileSync('public/favicon.svg', 'utf8').trim(), appDieSvg(logo, edge));
});
