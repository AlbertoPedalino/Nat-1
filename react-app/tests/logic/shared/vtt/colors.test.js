import test from 'node:test';
import assert from 'node:assert/strict';
import { VTT_COLORS, vttAlpha } from '../../../../src/shared/vtt/colors.js';

test('VTT alpha colours derive from the shared opaque palette', () => {
  assert.equal(vttAlpha('#e8c96a', 0.25), 'rgba(232, 201, 106, 0.25)');
  assert.equal(vttAlpha(VTT_COLORS.black, 2), 'rgba(0, 0, 0, 1)');
  assert.equal(vttAlpha(VTT_COLORS.white, -1), 'rgba(255, 255, 255, 0)');
});

test('an unsupported colour is returned unchanged', () => {
  assert.equal(vttAlpha('currentColor', 0.5), 'currentColor');
});

// Colours are named by role, so a new palette never leaves a name that lies
// ("gold" on a blue accent). Hue words belong to data palettes only.
test('interface colours are named by role, not hue', async () => {
  const { UI_COLORS } = await import('../../../../src/shared/ui/colors.js');
  const HUE = /gold|amber|teal|blue|purple|orange|parchment|ink|brown|stone/i;
  assert.deepEqual(Object.keys(UI_COLORS).filter((key) => HUE.test(key)), []);
  assert.deepEqual(Object.keys(VTT_COLORS).filter((key) => HUE.test(key)), []);
});
