import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANNER_HEIGHT, BANNER_INSET, BANNER_KINDS, TILE_BANNER_KINDS, bannerReach, bannerSlip, bannerTab, bannerTitle, panelBanner, tileBanner, tileBannerTitle } from '../../../../src/shared/ui/panelBanner.js';
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
    const { on, color, halo, slip, tab } = bannerTitle(kind);
    [on ?? color, halo].filter(Boolean).forEach((role) => assert.ok(role in UI_COLORS, `${kind} title: ${role}`));
    // A banner that letters its title on a slip or stands it on a tab draws each, and no other does.
    assert.equal(Boolean(bannerSlip(kind, 120, 22)), Boolean(slip), `${kind} slip`);
    assert.equal(Boolean(bannerTab(kind, 160, 30)), Boolean(tab), `${kind} tab`);
    [bannerSlip(kind, 120, 22), bannerTab(kind, 160, 30)].filter(Boolean)
      .forEach(({ pieces }) => roles(pieces).forEach((role) => assert.ok(role === undefined || role === 'none' || role in UI_COLORS, `${kind}: ${role}`)));
  });
});

test("a stat tile's bar is drawn across it in the palette's roles, its name lettered in one, or not at all", () => {
  assert.equal(tileBanner('none', 120, 38), null);
  assert.equal(tileBannerTitle('none'), null);
  TILE_BANNER_KINDS.filter((kind) => kind !== 'none').forEach((kind) => {
    [70, 140].forEach((width) => {
      const drawn = tileBanner(kind, width, 38);
      assert.ok(drawn.pieces.length > 3 && drawn.box.width >= width, `${kind} ${width}`);
      assert.equal(tileBanner(kind, width, 38), drawn, `${kind}: the same size draws the same`);
      roles(drawn.pieces).forEach((role) => assert.ok(role === undefined || role === 'none' || role in UI_COLORS, `${kind}: ${role}`));
    });
    const { color, halo } = tileBannerTitle(kind);
    [color, halo].filter(Boolean).forEach((role) => assert.ok(role in UI_COLORS, `${kind} name: ${role}`));
  });
});

// The war's belt holds what it holds on each panel: the same panel draws the
// same belt every time, and the panels do not all hold as many rounds.
test("a belt of rounds is drawn its own way on each panel, the same each time", () => {
  const titles = ['Ability Scores', 'Skills', 'Saving Throws', 'Conditions', 'Reminders', 'Defenses', 'Senses', 'Hit Points'];
  assert.equal(panelBanner('belt', 480, 'war', 'Skills'), panelBanner('belt', 480, 'war', 'Skills'));
  const counts = new Set(titles.map((title) => panelBanner('belt', 480, 'war', title).pieces.length));
  assert.ok(counts.size > 1, 'every panel holds as many rounds');
});

test("only the comic's ribbon reaches past the panel's sides, and only a little", () => {
  assert.deepEqual(BANNER_KINDS.filter((kind) => bannerReach(kind) > 0), ['ribbon']);
  assert.ok(bannerReach('ribbon') < BANNER_INSET);
});
