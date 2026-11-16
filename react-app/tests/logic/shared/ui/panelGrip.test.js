import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRIP_KINDS, panelGrip } from '../../../../src/shared/ui/panelGrip.js';
import { UI_COLORS } from '../../../../src/shared/ui/colors.js';

test('a panel with no grip draws nothing', () => {
  assert.equal(panelGrip('none', 360, 200), null);
  assert.deepEqual(GRIP_KINDS, ['none', 'tentacle']);
});

test("the tentacle reaches over the panel's top edge and down its right side, a little past both", () => {
  [[360, 200], [220, 90], [900, 400]].forEach(([width, height]) => {
    const { box } = panelGrip('tentacle', width, height);
    assert.ok(box.left < 0 && box.left > -16, `${width}: past the left edge, slightly (${box.left})`);
    assert.ok(box.top < 0 && box.top > -20, `${width}: over the top edge (${box.top})`);
    const right = box.left + box.width;
    // Its tip stays in the gap between two panels side by side (the box keeps
    // 4px round the ink).
    assert.ok(right > width && right <= width + 14, `${width}: past the right edge, slightly (${right})`);
    assert.ok(box.top + box.height > 40 && box.top + box.height < Math.max(height, 90) + 30, `${width}: down the side (${box.top + box.height})`);
  });
});

test("the same panel size draws the same tentacle, in the palette's roles only", () => {
  const one = panelGrip('tentacle', 360, 200);
  assert.equal(panelGrip('tentacle', 360, 200), one);
  const pieces = one.pieces.flatMap((piece) => (piece.tag === 'g' ? piece.children : [piece]));
  assert.ok(pieces.length > 20);
  pieces.forEach(({ d, fill, stroke }) => {
    assert.match(d, /^M/);
    [fill, stroke].forEach((role) => assert.ok(role === undefined || role === 'none' || role in UI_COLORS, role));
  });
});
