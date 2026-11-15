import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_STYLE_ID, BURST_ASPECT, CHOICE_MARK, CREST, FOCUS_RING, RIBBON, SEAL_RADIUS, SHAPE_STYLES,
  shapeVariables, styleShapes,
} from '../../../../src/shared/ui/shapes.js';

// The keys of a shapes object, nested, as paths ('crest.clip', …).
function shapeKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, inner]) => shapeKeys(inner, prefix ? `${prefix}.${key}` : key));
}

test('every style cuts the same shapes as the base one', () => {
  const base = shapeKeys(styleShapes(BASE_STYLE_ID)).sort();
  Object.values(SHAPE_STYLES).forEach((style) => {
    assert.deepEqual(shapeKeys(style.shapes).sort(), base, style.id);
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
