import test from 'node:test';
import assert from 'node:assert/strict';
import { VTT_COLORS, vttAlpha } from './colors.js';

test('VTT alpha colours derive from the shared opaque palette', () => {
  assert.equal(vttAlpha(VTT_COLORS.gold, 0.25), 'rgba(232, 201, 106, 0.25)');
  assert.equal(vttAlpha(VTT_COLORS.black, 2), 'rgba(0, 0, 0, 1)');
  assert.equal(vttAlpha(VTT_COLORS.white, -1), 'rgba(255, 255, 255, 0)');
});

test('an unsupported colour is returned unchanged', () => {
  assert.equal(vttAlpha('currentColor', 0.5), 'currentColor');
});
