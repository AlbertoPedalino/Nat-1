import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_STYLE_ID, BURST_ASPECT, CHOICE_MARK, CREST, FOCUS_RING, RIBBON, SEAL_RADIUS, SHAPE_STYLES,
  shapeVariables, styleShapes,
} from '../../../../src/shared/ui/shapes.js';
import { UI_COLORS, resolveColors } from '../../../../src/shared/ui/colors.js';
import { GEM_TONES } from '../../../../src/shared/ui/entityColors.js';

// The keys of a shapes object, nested, as paths ('crest.clip', …). A gem's
// cut is one shape, cut (`sides`) or drawn (`outline`), whichever a style picks.
function shapeKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || /^gemCuts\./.test(prefix)) return [prefix];
  return Object.entries(value).flatMap(([key, inner]) => shapeKeys(inner, prefix ? `${prefix}.${key}` : key));
}

test('every style cuts the same shapes as the base one', () => {
  const base = shapeKeys(styleShapes(BASE_STYLE_ID)).sort();
  Object.values(SHAPE_STYLES).forEach((style) => {
    assert.deepEqual(shapeKeys(style.shapes).sort(), base, style.id);
  });
});

test('every gem cut is cut or drawn whole', () => {
  Object.values(SHAPE_STYLES).forEach(({ id, shapes }) => {
    Object.entries(shapes.gemCuts).forEach(([kind, cut]) => {
      const keys = Object.keys(cut).filter((key) => key !== 'tones').sort();
      const cutGem = ['inner', 'outer', 'shadowDrop', 'sides'];
      const drawn = ['centre', 'glint', 'outline', 'shading', 'shadowDrop'];
      assert.ok(
        String(keys) === String(cutGem) || String(keys) === String(drawn),
        `${id} ${kind}: ${keys}`,
      );
      (cut.shading || []).forEach(([shade]) => assert.ok(['light', 'dark', 'table'].includes(shade), `${id} ${kind} ${shade}`));
      Object.entries(cut.tones || {}).forEach(([counted, role]) => {
        assert.ok(GEM_TONES[counted], `${id} ${kind} colours ${counted}, no counter's kind`);
        assert.ok(UI_COLORS[role], `${id} ${kind} ${counted}: ${role} is no palette role`);
      });
    });
  });
});

// A colour's hue in degrees, from its hex.
function hueOf(hex) {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const span = max - Math.min(r, g, b);
  if (!span) return 0;
  const sector = max === r ? ((g - b) / span) % 6 : max === g ? (b - r) / span + 2 : (r - g) / span + 4;
  return (sector * 60 + 360) % 360;
}

// Two colours told apart at a glance: hues at least 25 degrees round the
// wheel from each other (two reds of different depth read as one).
function assertApart(first, second, message) {
  const turn = Math.abs(hueOf(first) - hueOf(second));
  assert.ok(Math.min(turn, 360 - turn) >= 25, `${message} (${first}, ${second})`);
}

// A slot's counter and a feature's uses sit side by side on a sheet: each
// style tells them apart by their cut or, sharing one, by every colour, as
// its own palettes paint them (a gothic accent is blood's red).
test("a style's counters and uses never look alike", () => {
  const drawing = ({ tones, ...cut }) => JSON.stringify(cut);
  const colour = (cut, kind, paletteId) => resolveColors(UI_COLORS[(cut.tones || {})[kind]] || GEM_TONES[kind], paletteId);
  Object.values(SHAPE_STYLES).forEach(({ id, palettes, shapes: { gemCuts: { counter, uses } } }) => {
    Object.values(palettes).forEach((paletteId) => {
      const usesColour = colour(uses, 'uses', paletteId);
      Object.keys(GEM_TONES).filter((kind) => kind !== 'uses').forEach((kind) => {
        if (drawing(counter) === drawing(uses)) {
          assertApart(colour(counter, kind, paletteId), usesColour, `${id} ${paletteId}: ${kind} and uses share a cut and a colour`);
        }
      });
      // Even drawn apart, a slot and a use are never one colour.
      assertApart(colour(counter, 'slot', paletteId), usesColour, `${id} ${paletteId}: a slot and a use share a colour`);
    });
  });
});

test('every shape given as a CSS variable is filled by every style', () => {
  const used = [
    RIBBON.panel.notch, RIBBON.panel.pad, RIBBON.tile.notch, RIBBON.tile.pad, SEAL_RADIUS,
    CREST.clip, CREST.edge, CREST.foot, FOCUS_RING.width, FOCUS_RING.gap, CHOICE_MARK.size,
    BURST_ASPECT.kapow, BURST_ASPECT.crash,
  ].map((variable) => /^var\((--gb-shape-[a-z-]+)\)$/.exec(variable)?.[1]);
  assert.ok(used.every(Boolean));
  Object.keys(SHAPE_STYLES).forEach((styleId) => {
    const filled = shapeVariables(styleId);
    assert.deepEqual(used.filter((name) => !filled[name]), [], styleId);
  });
});

test('the comic style keeps its cut', () => {
  const comic = shapeVariables('comic');
  assert.equal(comic['--gb-shape-seal-radius'], '46% 54% 48% 52% / 55% 45% 55% 45%');
  assert.equal(comic['--gb-shape-ribbon-panel-notch'], '10px');
  assert.equal(comic['--gb-shape-crest-edge'], '3px');
  assert.equal(styleShapes('unknown'), styleShapes(BASE_STYLE_ID));
});

test("every style fills the ink's variables, the comic one at full strength", () => {
  Object.keys(SHAPE_STYLES).forEach((styleId) => {
    const filled = shapeVariables(styleId);
    ['--gb-ink-edge', '--gb-ink-line', '--gb-ink-drop', '--gb-ink-depth'].forEach((name) => assert.ok(filled[name], `${styleId} ${name}`));
  });
  const comic = shapeVariables('comic');
  assert.deepEqual(
    [comic['--gb-ink-edge'], comic['--gb-ink-line'], comic['--gb-ink-drop'], comic['--gb-ink-depth']],
    ['2px', '1', '1', '1'],
  );
});

test('the comic style lays its page and hatching as before', async () => {
  const { surfaceVariables } = await import('../../../../src/shared/ui/surfaces.js');
  const page = surfaceVariables('dark', 'comic');
  assert.match(page['--gb-surface-paper'], /^image-set\(url\(".*paper\/sticker-paper\.webp"\) 1x/);
  assert.match(page['--gb-surface-halftone'], / 1px, transparent 1\.4px\)$/);
  assert.equal(page['--gb-surface-halftone-size'], '7px 7px');
  const comic = shapeVariables('comic');
  assert.deepEqual(
    [comic['--gb-screentone-angle'], comic['--gb-screentone-line'], comic['--gb-screentone-gap'], comic['--gb-surface-rays']],
    ['-45deg', '2px', '7px', '1'],
  );
  assert.equal(styleShapes('comic').radius, 10);
});

test('the sticker paper is painted in hexes, and every palette with a paper has its files', async () => {
  const { existsSync } = await import('node:fs');
  const { paperSvg } = await import('../../../../src/shared/ui/stickerLayout.js');
  const { PAPER_PICTURES, stickerPaperImage } = await import('../../../../src/shared/ui/stickerPaper.js');
  assert.ok(!paperSvg('dark').includes('var(') && !paperSvg('dark').includes('color-mix('));
  Object.values(PAPER_PICTURES).forEach((stem) => {
    assert.ok(existsSync(`public/paper/${stem}.webp`) && existsSync(`public/paper/${stem}@2x.webp`), stem);
  });
  assert.match(stickerPaperImage('light'), /sticker-paper-light\.webp/);
  // A style laying the paper has it painted in both its palettes.
  Object.values(SHAPE_STYLES).filter(({ shapes }) => shapes.surface.paper === 'stickers').forEach(({ id, palettes }) => {
    Object.values(palettes).forEach((paletteId) => assert.ok(PAPER_PICTURES[paletteId], `${id} ${paletteId}`));
  });
  assert.equal(stickerPaperImage('unknown'), stickerPaperImage('dark'));
});

test('every style letters every role, and index.html loads the base faces', async () => {
  const { readFileSync } = await import('node:fs');
  const {
    FONT_STYLES, UI_FONTS, fontStacks, fontStylesheet, fontVariables,
  } = await import('../../../../src/shared/ui/fonts.js');
  const roles = Object.keys(UI_FONTS).sort();
  Object.keys(SHAPE_STYLES).forEach((styleId) => {
    assert.ok(FONT_STYLES[styleId], styleId);
    assert.deepEqual(Object.keys(fontStacks(styleId)).sort(), roles, styleId);
    assert.deepEqual(
      Object.values(UI_FONTS).map((variable) => /^var\((--gb-font-[a-z-]+)\)$/.exec(variable)[1]).filter((name) => !fontVariables(styleId)[name]),
      [],
      styleId,
    );
  });
  assert.equal(fontStacks('comic').display, '"Rubik", system-ui, sans-serif');
  assert.ok(readFileSync('index.html', 'utf8').includes(`href="${fontStylesheet(BASE_STYLE_ID)}"`));
});

test('every style sets the pace and the hop, the comic one at full', async () => {
  const { motionTime } = await import('../../../../src/shared/ui/motion.js');
  Object.keys(SHAPE_STYLES).forEach((styleId) => {
    const filled = shapeVariables(styleId);
    assert.ok(filled['--gb-motion-pace'] && filled['--gb-motion-hop'], styleId);
  });
  assert.deepEqual([shapeVariables('comic')['--gb-motion-pace'], shapeVariables('comic')['--gb-motion-hop']], ['1', '1']);
  assert.equal(motionTime(120), 'calc(120ms * var(--gb-motion-pace))');
});

test('every style draws every icon role', async () => {
  const { ICON_SETS } = await import('../../../../src/shared/ui/gameIcons.js');
  Object.entries(ICON_SETS).forEach(([kind, sets]) => {
    const roles = Object.keys(sets.comic).sort();
    Object.keys(SHAPE_STYLES).forEach((styleId) => {
      assert.ok(sets[styleId], `${kind} has no ${styleId} set`);
      assert.deepEqual(Object.keys(sets[styleId]).sort(), roles, `${kind} ${styleId}`);
      assert.ok(Object.values(sets[styleId]).every((icon) => typeof icon === 'function' || typeof icon === 'object'), `${kind} ${styleId}`);
    });
  });
});

test("every style lays a page, cuts its bar's ends and flourishes its titles with drawings that exist", async () => {
  const { PAGE_PATTERN_KINDS } = await import('../../../../src/shared/ui/pagePatterns.js');
  const { FLOURISH_KINDS } = await import('../../../../src/shared/ui/panelOrnaments.js');
  const { PAGE_SCENE_KINDS } = await import('../../../../src/shared/ui/pageScenes.js');
  Object.values(SHAPE_STYLES).forEach(({ id, shapes }) => {
    assert.ok(['stickers', 'none', ...PAGE_PATTERN_KINDS, ...PAGE_SCENE_KINDS].includes(shapes.surface.paper), `${id} paper`);
    assert.ok(FLOURISH_KINDS.includes(shapes.panel.flourish.kind), `${id} flourish`);
    const points = shapes.ribbon.ends.split(' ').map((point) => point.split(',').map(Number));
    assert.ok(points.every(([x, y]) => x >= 0 && x <= 10 && y >= 0 && y <= 100), `${id} ends`);
    assert.deepEqual([points[0][1], points.at(-1)[1]], [0, 100], `${id} ends run top to foot`);
  });
});

test("the comic's bar keeps its swallowtail cut", async () => {
  const { ribbonEndsClip } = await import('../../../../src/shared/ui/shapes.js');
  assert.equal(ribbonEndsClip(styleShapes('comic').ribbon.ends, 'n'), 'polygon(0 0, 100% 0, calc(100% - n) 50%, 100% 100%, 0 100%, n 50%)');
});

test('every painted scene ships its pictures', async () => {
  const { existsSync } = await import('node:fs');
  const { SCENE_PICTURES } = await import('../../../../src/shared/ui/pageScenes.js');
  SCENE_PICTURES.forEach((file) => assert.ok(existsSync(`public/scenes/${file}`), file));
});
