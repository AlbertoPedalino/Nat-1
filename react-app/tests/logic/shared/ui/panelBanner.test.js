import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANNER_HEIGHT, BANNER_INSET, BANNER_KINDS, bannerReach, bannerTitle, panelBanner } from '../../../../src/shared/ui/panelBanner.js';
import { UI_COLORS } from '../../../../src/shared/ui/colors.js';

// A piece's colours: a role, or a shaded fill's roles (a metal's sheen).
const colours = (paint) => (paint && typeof paint === 'object' ? paint.shade.map(([, role]) => role) : [paint]);
const roles = (pieces) => pieces.flatMap((piece) => (piece.tag === 'g' ? roles(piece.children) : [...colours(piece.fill), ...colours(piece.stroke)]));

test('a bar with no banner draws nothing', () => {
  assert.equal(panelBanner('none', 300, 'comic'), null);
  assert.equal(bannerTitle('none'), null);
});

test('every banner stretches across its bar in the palette\'s roles, its title lettered in one', () => {
  BANNER_KINDS.filter((kind) => kind !== 'none').forEach((kind) => {
    [220, 480].forEach((width) => {
      const banner = panelBanner(kind, width, 'comic');
      assert.deepEqual(banner.box, { left: bannerReach(kind) - BANNER_INSET, top: 0, width, height: BANNER_HEIGHT }, kind);
      assert.equal(panelBanner(kind, width, 'comic'), banner, `${kind}: the same size draws the same`);
      roles(banner.pieces).forEach((role) => assert.ok(role === undefined || role === 'none' || role in UI_COLORS, `${kind}: ${role}`));
    });
    const { on, color, halo } = bannerTitle(kind);
    [on ?? color, halo].filter(Boolean).forEach((role) => assert.ok(role in UI_COLORS, `${kind} title: ${role}`));
  });
});

test("only the comic's ribbon reaches past the panel's sides, and only a little", () => {
  assert.deepEqual(BANNER_KINDS.filter((kind) => bannerReach(kind) > 0), ['ribbon']);
  assert.ok(bannerReach('ribbon') < BANNER_INSET);
});
