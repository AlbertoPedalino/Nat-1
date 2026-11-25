import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_STYLE_ID, CHOICE_MARK, CREST, FOCUS_RING, MOMENT_BURST, RIBBON, SEAL_RADIUS, SHAPE_STYLES,
  shapeVariables, styleShapes,
} from '../../../../src/shared/ui/shapes.js';
import { UI_COLORS, resolveColors } from '../../../../src/shared/ui/colors.js';
import { GEM_TONES } from '../../../../src/shared/ui/entityColors.js';

// The keys of a shapes object, nested, as paths ('crest.clip', …). A gem's
// cut is one shape, cut (`sides`), drawn (`outline`) or the hand-drawing
// kit's (`drawing`), whichever a style picks; so is a card's marker, with whatever lines, cap or pupil it draws,
// and a roll moment's burst and effect, each with its kind's own measures.
function shapeKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || /^gemCuts\.|^marker$|^moments\.[a-z0-9]+\.(burst|effect)$/.test(prefix)) return [prefix];
  return Object.entries(value).flatMap(([key, inner]) => shapeKeys(inner, prefix ? `${prefix}.${key}` : key));
}

test('every style cuts the same shapes as the base one', () => {
  const base = shapeKeys(styleShapes(BASE_STYLE_ID)).sort();
  Object.values(SHAPE_STYLES).forEach((style) => {
    assert.deepEqual(shapeKeys(style.shapes).sort(), base, style.id);
  });
});

test('every gem cut is cut or drawn whole', async () => {
  const { COUNTER_DRAWING_KINDS, TRAINING_LEVELS, counterGroup, counterMark, counterStrike, drawsTraining, trainingMark } = await import('../../../../src/shared/ui/counterDrawing.js');
  Object.values(SHAPE_STYLES).forEach(({ id, shapes }) => {
    Object.entries(shapes.gemCuts).forEach(([kind, cut]) => {
      // What a drawn token may bring more: what is left of it spent, what marks an expert.
      const keys = Object.keys(cut).filter((key) => !['tones', 'spent', 'expert'].includes(key)).sort();
      const cutGem = ['inner', 'outer', 'shadowDrop', 'sides'];
      const drawn = ['centre', 'glint', 'outline', 'shading', 'shadowDrop'];
      assert.ok(
        String(keys) === String(cutGem) || String(keys) === String(drawn) || String(keys) === 'drawing',
        `${id} ${kind}: ${keys}`,
      );
      // A counter or a training mark may be the kit's: a drawing that
      // exists, every kind it counts given its role (a training mark its
      // one), each mark (and the strike across a group, where it counts in
      // groups) in the palette's roles, there to spend or spent, at every
      // level; nothing drawn untrained.
      if (cut.drawing) {
        assert.ok(['counter', 'training'].includes(kind) && COUNTER_DRAWING_KINDS.includes(cut.drawing), `${id} ${kind} drawn as ${cut.drawing}`);
        const painted = ({ pieces }) => roles(pieces).forEach((role) => assert.ok(UI_COLORS[role], `${id} ${kind}: ${role} is no palette role`));
        if (kind === 'training') {
          assert.deepEqual(Object.keys(cut.tones), ['training'], `${id} training names its role`);
          assert.ok(drawsTraining(cut.drawing), `${id} ${cut.drawing} draws a training mark`);
          ['none', null, undefined].forEach((level) => assert.equal(trainingMark(cut.drawing, 14, 14, 'warningText', level).pieces.length, 0, `${id} untrained (${level}) draws nothing`));
          TRAINING_LEVELS.filter((level) => level !== 'none').forEach((level) => {
            const mark = trainingMark(cut.drawing, 14, 14, 'warningText', level);
            assert.ok(mark.pieces.length > 0, `${id} ${level}`);
            painted(mark);
          });
          return;
        }
        assert.deepEqual(Object.keys(cut.tones).sort(), Object.keys(GEM_TONES).filter((counted) => counted !== 'uses').sort(), `${id} ${kind} names every counter's role`);
        const { every, tall, narrow } = counterGroup(cut.drawing);
        assert.ok((every === 0 || every > 1) && tall > 0 && narrow > 0 && narrow <= 1, `${id} ${kind} groups`);
        [true, false].forEach((available) => {
          const mark = counterMark(cut.drawing, 14, 34, 'warning', available, 2);
          assert.ok(mark.pieces.length > 0 && mark.box.width > 14, `${id} ${kind} ${available}`);
          painted(mark);
          const strike = counterStrike(cut.drawing, 70, 34, 'warning', available);
          assert.equal(Boolean(strike), every > 0, `${id} ${kind} strikes a group only where it counts in groups`);
          if (strike) painted(strike);
        });
      }
      // A part in a shade of the gem's colour, or in a palette role of its own.
      [...(cut.shading || []), ...(cut.spent || []), ...(cut.expert || [])]
        .forEach(([shade]) => assert.ok(['light', 'base', 'dark', 'table'].includes(shade) || UI_COLORS[shade], `${id} ${kind} ${shade}`));
      assert.ok(!cut.expert || kind === 'training', `${id} ${kind}: only a training mark marks an expert`);
      Object.entries(cut.tones || {}).forEach(([counted, role]) => {
        assert.ok(kind === 'training' ? counted === 'training' : GEM_TONES[counted], `${id} ${kind} colours ${counted}, no counter's kind`);
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
    MOMENT_BURST.nat20.aspect, MOMENT_BURST.nat20.turn, MOMENT_BURST.nat1.aspect, MOMENT_BURST.nat1.turn,
  ].map((variable) => /^var\((--gb-shape-[a-z0-9-]+)\)$/.exec(variable)?.[1]);
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

// The light is what a style lays where the comic only inks: every style
// names a finish and a page light that exist, and fills every variable a
// shadow or a surface reads (a shadow list with one unset is no shadow at
// all); the comic lays none of it, so it is drawn as it always was.
test('every style lights its surfaces from kinds that exist, the comic one not at all', async () => {
  const { PAGE_LIGHT_KINDS, SURFACE_FINISH_KINDS, pageLightSx, surfaceVariables } = await import('../../../../src/shared/ui/surfaces.js');
  Object.values(SHAPE_STYLES).forEach(({ id, palettes, shapes: { light } }) => {
    assert.ok(SURFACE_FINISH_KINDS.includes(light.finish), `${id} finish ${light.finish}`);
    assert.ok(PAGE_LIGHT_KINDS.includes(light.page), `${id} page light ${light.page}`);
    ['soft', 'bevel', 'well'].forEach((key) => assert.ok(light[key] >= 0 && light[key] <= 1, `${id} ${key}`));
    Object.values(palettes).forEach((paletteId) => {
      const filled = surfaceVariables(paletteId, id);
      ['--gb-light-soft', '--gb-light-shade', '--gb-light-bevel', '--gb-light-well', '--gb-surface-finish-panel', '--gb-surface-finish-box']
        .forEach((name) => assert.ok(filled[name], `${id} ${paletteId} ${name}`));
    });
  });
  const comic = surfaceVariables('dark', 'comic');
  assert.deepEqual(
    [comic['--gb-light-soft'], comic['--gb-light-shade'], comic['--gb-light-bevel'], comic['--gb-light-well'], comic['--gb-surface-finish-panel'], comic['--gb-surface-finish-box']],
    ['0', 'transparent', '0 0 transparent', 'initial', 'initial', 'initial'],
  );
  assert.equal(pageLightSx('none'), null);
  assert.equal(comic['--gb-surface-page-fill'], undefined, 'the comic page keeps its own colour');
  // A lit page is laid behind the app, so the page lets it through.
  assert.equal(surfaceVariables('midnight', 'noir')['--gb-surface-page-fill'], 'transparent');
});

// Every role a drawing's pieces are coloured in (handDrawing.js pieces: their
// fill and stroke, a shaded fill's roles, a group's children with them).
const colours = (paint) => (paint && typeof paint === 'object' ? paint.shade.map(([, role]) => role) : [paint]);
function roles(pieces) {
  return pieces.flatMap((piece) => [...colours(piece.fill), ...colours(piece.stroke), ...(piece.children ? roles(piece.children) : [])]).filter((role) => role && role !== 'none');
}

// The ability scores are cut as a crest or drawn (abilityDrawing.js): every
// style names a drawing that exists and a way to lay the figures, the comic
// keeps its crest, and a drawing gives every place in the row a tile and a
// stand, in the palette's roles.
test('every style stands its ability scores from kinds that exist, the comic one on its crest', async () => {
  const { ABILITY_DRAWING_KINDS, ABILITY_FIGURE_LAYOUTS, abilityLook, abilityPlace, abilityRing, abilityStrand, abilityTile, drawsAbilities } = await import('../../../../src/shared/ui/abilityDrawing.js');
  Object.values(SHAPE_STYLES).forEach(({ id, shapes: { abilities } }) => {
    assert.ok(ABILITY_DRAWING_KINDS.includes(abilities.drawing), `${id} drawing ${abilities.drawing}`);
    assert.ok(ABILITY_FIGURE_LAYOUTS.includes(abilities.figures), `${id} figures ${abilities.figures}`);
  });
  assert.deepEqual(styleShapes('comic').abilities, { drawing: 'none', figures: 'split' });
  assert.equal(drawsAbilities('none'), false);
  assert.equal(abilityTile('none', 80, 120, 0), null);
  ABILITY_DRAWING_KINDS.filter(drawsAbilities).forEach((kind) => {
    for (let place = 0; place < 6; place += 1) {
      const { pieces, box } = abilityTile(kind, 80, 120, place);
      assert.ok(pieces.length > 3 && box.width > 80, `${kind} ${place}`);
      roles(pieces).forEach((role) => assert.ok(UI_COLORS[role], `${kind} ${place}: ${role} is no palette role`));
      const { tilt, sink, head, under, foot, left, widest } = abilityPlace(kind, place);
      assert.ok(Math.abs(tilt) <= 5 && sink >= 0 && head > 0 && under >= 0 && foot > 0 && left >= 0, `${kind} ${place} stands`);
      assert.ok(widest === null || widest >= 62, `${kind} ${place} grows to ${widest}`);
    }
    // A score figured in a role, ringed only by a drawing that draws a ring;
    // what is laid over the row in the palette's roles too.
    const { score, ring } = abilityLook(kind);
    assert.ok(UI_COLORS[score], `${kind} score in ${score}`);
    assert.equal(Boolean(abilityRing(kind, 20, 16, 0)), ring, `${kind} ring`);
    const tiles = Array.from({ length: 6 }, (_, i) => [i * 96, 0, 80, 120]);
    [abilityRing(kind, 20, 16, 0), abilityStrand(kind, 576, 120, tiles)].filter(Boolean)
      .forEach(({ pieces }) => roles(pieces).forEach((role) => assert.ok(UI_COLORS[role], `${kind}: ${role} is no palette role`)));
  });
  assert.equal(abilityStrand('none', 576, 120, []), null);
  // The headstones' earth is laid once before each row: twice where the six
  // stand in two rows of three.
  const shadows = (tiles) => abilityStrand('headstones', 576, 280, tiles).pieces.filter(({ transform }) => transform).length;
  assert.equal(shadows(Array.from({ length: 6 }, (_, i) => [i * 96, 0, 80, 120])), 1);
  assert.equal(shadows(Array.from({ length: 6 }, (_, i) => [(i % 3) * 96, i < 3 ? 0 : 140, 80, 120])), 2);
});

// A roll's toast is the style's bubble or one drawn thing (toastDrawing.js):
// every style names a drawing that exists, the comic keeps its bubble, and a
// drawing draws its frame at every moment and its hand in the palette's
// roles.
test("every style writes a roll's toast on a kind that exists, the comic one on its bubble", async () => {
  const { TOAST_ARRIVALS, TOAST_DRAWING_KINDS, TOAST_MARK_MOTIONS, drawsToast, toastBloom, toastBlooms, toastClimbers, toastFrame, toastBand, toastHand, toastHead, toastHeadline, toastLook, toastMarks, toastMasthead, toastSlip, toastStamp, toastStampFrame } = await import('../../../../src/shared/ui/toastDrawing.js');
  Object.values(SHAPE_STYLES).forEach(({ id, shapes: { rollToast } }) => assert.ok(TOAST_DRAWING_KINDS.includes(rollToast.drawing), `${id} toast ${rollToast.drawing}`));
  assert.deepEqual(styleShapes('comic').rollToast, { drawing: 'none' });
  assert.equal(toastFrame('none', 280, 320), null);
  TOAST_DRAWING_KINDS.filter(drawsToast).forEach((kind) => {
    const plain = toastFrame(kind, 280, 320);
    assert.ok(toastHead(kind) > 0 && plain.pieces.length > 5, kind);
    // A natural 1 shows on the frame itself or in what is marked on it.
    const struck = toastFrame(kind, 280, 320, 'nat1').pieces.length + toastMarks(kind, 280, 320, 'nat1').length;
    assert.ok(struck > plain.pieces.length + toastMarks(kind, 280, 320).length, `${kind} shows a natural 1`);
    assert.ok(toastBlooms(kind).every(({ side, up, size }) => Math.abs(side) === 1 && up > 0 && up < 1 && size > 0), `${kind} blooms`);
    assert.ok(UI_COLORS[toastLook(kind).gold], `${kind} gold`);
    const marks = ['nat20', 'nat1'].flatMap((moment) => toastMarks(kind, 280, 320, moment));
    assert.ok(marks.every(({ at, beat, motion }) => at.length === 2 && beat >= 0 && TOAST_MARK_MOTIONS.includes(motion)), `${kind} marks`);
    assert.ok(Object.values(toastLook(kind).arrive || {}).every((arrival) => TOAST_ARRIVALS.includes(arrival)), `${kind} arrives`);
    // Laid by where the toast stands its dice and its total, where it is told.
    const placed = toastFrame(kind, 280, 320, 'nat20', [150, 250, 280, 40, 160]);
    assert.ok(placed.pieces.length >= plain.pieces.length, `${kind} placed`);
    roles(placed.pieces).forEach((role) => assert.ok(UI_COLORS[role], `${kind}: ${role} is no palette role`));
    // What it prints of its own: a name over everything, the news at a moment, never at none.
    assert.ok(toastMasthead(kind) === null || typeof toastMasthead(kind) === 'string', `${kind} masthead`);
    assert.ok(['nat20', 'nat1'].map((moment) => toastHeadline(kind, moment)).every((words) => words === null || (typeof words.news === 'string' && ['undefined', 'string'].includes(typeof words.deck))), `${kind} news`);
    assert.equal(toastHeadline(kind), null, `${kind} has no news of a plain roll`);
    // The news is printed on a block of its own, a different one at each moment.
    const bands = ['nat20', 'nat1'].map((moment) => toastBand(kind, 200, 60, moment));
    assert.equal(bands.every(Boolean), Boolean(toastHeadline(kind, 'nat20')), `${kind} bands`);
    if (bands[0]) assert.notDeepEqual(roles(bands[0].pieces), roles(bands[1].pieces), `${kind}: the two moments told apart`);
    bands.filter(Boolean).forEach(({ pieces }) => roles(pieces).forEach((role) => assert.ok(UI_COLORS[role], `${kind}: ${role} is no palette role`)));
    // A drawing whose lines are pasted on slips draws each slip; one that
    // stamps a moment draws the stamp's frame, and stamps no plain roll.
    assert.equal(Boolean(toastSlip(kind, 120, 24, 0)), Boolean(toastLook(kind).slips), `${kind} slips`);
    assert.equal(toastStamp(kind), null, `${kind} stamps no plain roll`);
    const stamped = ['nat20', 'nat1'].some((moment) => typeof toastStamp(kind, moment) === 'string');
    assert.equal(Boolean(toastStampFrame(kind, 90, 30)), stamped, `${kind} stamp`);
    [toastSlip(kind, 120, 24, 1), toastStampFrame(kind, 90, 30)].filter(Boolean)
      .forEach(({ pieces }) => roles(pieces).forEach((role) => assert.ok(UI_COLORS[role], `${kind}: ${role} is no palette role`)));
    [plain, toastHand(kind), toastClimbers(kind, 280, 320), ...toastBlooms(kind).map((_, index) => toastBloom(kind, index)), ...marks].filter(Boolean)
      .forEach(({ pieces }) => roles(pieces).forEach((role) => assert.ok(UI_COLORS[role], `${kind}: ${role} is no palette role`)));
  });
  assert.deepEqual(toastMarks('none', 280, 320, 'nat1'), []);
  assert.equal(toastSlip('none', 120, 24), null);
  assert.equal(toastStamp('none', 'nat1'), null);
  assert.equal(toastMasthead('none'), null);
  assert.equal(toastHeadline('none', 'nat20'), null);
});

// An app notice is the style's bubble or one drawn thing (noticeDrawing.js):
// every style names a drawing that exists, the comic keeps its bubble, and a
// drawing draws every severity in the palette's roles.
test('every style writes an app notice on a kind that exists, the comic one on its bubble', async () => {
  const { NOTICE_DRAWING_KINDS, NOTICE_SEVERITIES, drawsNotice, noticeFrame, noticeLook } = await import('../../../../src/shared/ui/noticeDrawing.js');
  Object.values(SHAPE_STYLES).forEach(({ id, shapes: { notice } }) => assert.ok(NOTICE_DRAWING_KINDS.includes(notice.drawing), `${id} notice ${notice.drawing}`));
  assert.deepEqual(styleShapes('comic').notice, { drawing: 'none' });
  assert.equal(noticeFrame('none', 300, 70, 'info'), null);
  assert.deepEqual([...NOTICE_SEVERITIES].sort(), ['error', 'info', 'success', 'warning']);
  NOTICE_DRAWING_KINDS.filter(drawsNotice).forEach((kind) => {
    const { ink, left, right, under } = noticeLook(kind);
    assert.ok(UI_COLORS[ink] && left >= 0 && right >= 0 && under >= 0, kind);
    NOTICE_SEVERITIES.forEach((severity) => {
      const { pieces } = noticeFrame(kind, 300, 70, severity);
      assert.ok(pieces.length > 5, `${kind} ${severity}`);
      roles(pieces).forEach((role) => assert.ok(UI_COLORS[role], `${kind} ${severity}: ${role} is no palette role`));
    });
  });
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

test("every style lays a page, cuts its bar's ends, flourishes its titles, grips its panels and draws their banners with drawings that exist", async () => {
  const { FLOURISH_KINDS } = await import('../../../../src/shared/ui/panelOrnaments.js');
  const { GRIP_KINDS } = await import('../../../../src/shared/ui/panelGrip.js');
  const { BANNER_KINDS, TILE_BANNER_KINDS } = await import('../../../../src/shared/ui/panelBanner.js');
  const { PAGE_SCENE_KINDS } = await import('../../../../src/shared/ui/pageScenes.js');
  const { BADGE_KINDS } = await import('../../../../src/shared/ui/surfaces.js');
  Object.values(SHAPE_STYLES).forEach(({ id, shapes }) => {
    assert.ok(BADGE_KINDS.includes(shapes.panel.badge), `${id} badge`);
    assert.ok(['stickers', 'none', ...PAGE_SCENE_KINDS].includes(shapes.surface.paper), `${id} paper`);
    assert.ok(FLOURISH_KINDS.includes(shapes.panel.flourish.kind), `${id} flourish`);
    assert.ok(GRIP_KINDS.includes(shapes.panel.grip), `${id} grip`);
    assert.ok(BANNER_KINDS.includes(shapes.panel.banner), `${id} banner`);
    assert.ok(TILE_BANNER_KINDS.includes(shapes.panel.tileBanner), `${id} tile banner`);
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

test("every style marks a card's kind with a shape of its own, in the 12 by 30 box", async () => {
  const { MARKER_DRAWING_KINDS, MARKER_INK, markerDrawing } = await import('../../../../src/shared/ui/markerDrawing.js');
  const outlines = new Set();
  Object.values(SHAPE_STYLES).forEach(({ id, shapes }) => {
    const { marker } = shapes;
    // Or drawn by the hand-drawing kit, in the kind's own colour and the palette's roles.
    if (marker.drawing) {
      assert.deepEqual(Object.keys(marker), ['drawing'], `${id} drawn marker`);
      assert.ok(MARKER_DRAWING_KINDS.includes(marker.drawing), `${id} marker ${marker.drawing}`);
      const { pieces } = markerDrawing(marker.drawing, 12, 30);
      assert.ok(roles(pieces).includes(MARKER_INK), `${id} marker in the kind's colour`);
      roles(pieces).filter((role) => role !== MARKER_INK).forEach((role) => assert.ok(UI_COLORS[role], `${id} marker: ${role} is no palette role`));
      outlines.add(`drawing:${marker.drawing}`);
      return;
    }
    assert.match(marker.outline, /^M[\d.\s]/, `${id} marker`);
    marker.outline.match(/-?\d+(\.\d+)?/g).map(Number).forEach((n) => assert.ok(n >= 0 && n <= 30, `${id} marker inside its box`));
    if (marker.capFill) assert.ok(['accent', 'edge'].includes(marker.capFill), `${id} cap`);
    outlines.add(marker.outline);
  });
  assert.equal(outlines.size, Object.keys(SHAPE_STYLES).length, 'no two styles share a marker');
  assert.equal(markerDrawing('none', 12, 30), null);
});

test("every style draws a natural 20's and a natural 1's moment from kinds that exist", async () => {
  const { BURST_KINDS, BURST_PAINTS, MOMENTS, NUMBER_LOOK_KINDS, burstPath } = await import('../../../../src/shared/ui/rollMoment.js');
  const { PARTICLE_GLYPHS, PARTICLE_LOOKS, PARTICLE_MODES } = await import('../../../../src/shared/ui/momentParticles.js');
  const { BUBBLE_MOTIONS } = await import('../../../../src/shared/ui/bubble.js');
  Object.values(SHAPE_STYLES).forEach(({ id, shapes: { moments } }) => {
    assert.deepEqual(Object.keys(moments).sort(), [...MOMENTS].sort(), id);
    Object.entries(moments).forEach(([moment, { burst, fill, paint, number, turn, motion, effect }]) => {
      const at = `${id} ${moment}`;
      assert.ok(BURST_KINDS.includes(burst.kind), `${at} burst ${burst.kind}`);
      assert.match(burstPath(burst), /^M[\d.\s-]+(L[\d.\s-]+)+Z$/, `${at} burst path`);
      assert.ok(UI_COLORS[fill], `${at} fill ${fill}`);
      assert.ok(BURST_PAINTS.includes(paint), `${at} paint ${paint}`);
      assert.ok(NUMBER_LOOK_KINDS.includes(number), `${at} number ${number}`);
      assert.equal(typeof turn, 'number', `${at} turn`);
      assert.ok(BUBBLE_MOTIONS[motion], `${at} motion ${motion}`);
      assert.ok(PARTICLE_GLYPHS[effect.glyph], `${at} glyph ${effect.glyph}`);
      assert.ok(PARTICLE_MODES.includes(effect.mode), `${at} mode ${effect.mode}`);
      assert.ok(PARTICLE_LOOKS.includes(effect.look), `${at} look ${effect.look}`);
      assert.ok(effect.count > 0 && effect.size[0] <= effect.size[1], `${at} count and size`);
      effect.colors.forEach((role) => assert.ok(UI_COLORS[role], `${at} colour ${role}`));
    });
  });
});

test('every burst is drawn in every paint as one SVG, in the palette\'s roles only', async () => {
  const { BURST_PAINTS, burstSvg } = await import('../../../../src/shared/ui/rollMoment.js');
  const { burst } = SHAPE_STYLES.comic.shapes.moments.nat20;
  BURST_PAINTS.forEach((paint) => {
    const svg = burstSvg({ burst, paint, fill: 'accent' });
    assert.match(svg, /^<svg [^>]*viewBox="0 0 130 100">.*<\/svg>$/s, paint);
    // Black and white are fixed in every palette; every other colour is a role.
    const literals = (svg.match(/#[0-9a-f]{3,6}\b/gi) || []).filter((hex) => !['#ffffff', '#000000'].includes(hex.toLowerCase()));
    assert.deepEqual(literals, [], `${paint} has a literal colour`);
  });
});

test('every particle layout stays in place for a throw, and moves for another', async () => {
  const { PARTICLE_MODES, particleLayout } = await import('../../../../src/shared/ui/momentParticles.js');
  PARTICLE_MODES.forEach((mode) => {
    assert.deepEqual(particleLayout(mode, 6, 'roll-1'), particleLayout(mode, 6, 'roll-1'), mode);
    assert.equal(particleLayout(mode, 6, 'roll-1').length, 6, mode);
  });
  assert.notDeepEqual(particleLayout('fly', 6, 'roll-1'), particleLayout('fly', 6, 'roll-2'));
});

test("the comic's moments keep their KAPOW and crash", () => {
  const comic = shapeVariables('comic');
  assert.deepEqual(
    [comic['--gb-shape-nat20-aspect'], comic['--gb-shape-nat20-turn'], comic['--gb-shape-nat1-aspect'], comic['--gb-shape-nat1-turn']],
    ['1.3', '-8deg', '1', '14deg'],
  );
});

// Every bubble (a toast, a roll or game notice, a bubble on the map) is drawn
// as its style draws it, from kinds that exist, in the palette's roles only.
test("every style draws its speech bubble from kinds that exist, in the palette's roles", async () => {
  const {
    BUBBLE_DECOR_KINDS, BUBBLE_FRAME_KINDS, BUBBLE_SHADOW_KINDS, BUBBLE_TAIL_KINDS, BUBBLE_TEXTURE_KINDS, bubbleLook, bubbleShadow,
  } = await import('../../../../src/shared/ui/bubbleLooks.js');
  const { resolveColors } = await import('../../../../src/shared/ui/colors.js');
  Object.values(SHAPE_STYLES).forEach(({ id, palettes, shapes: { bubble } }) => {
    assert.ok(UI_COLORS[bubble.fill], `${id} fill ${bubble.fill}`);
    assert.ok(BUBBLE_TEXTURE_KINDS.includes(bubble.texture), `${id} texture ${bubble.texture}`);
    assert.ok(BUBBLE_FRAME_KINDS.includes(bubble.frame), `${id} frame ${bubble.frame}`);
    assert.ok(BUBBLE_SHADOW_KINDS.includes(bubble.shadow), `${id} shadow ${bubble.shadow}`);
    assert.ok(BUBBLE_TAIL_KINDS.includes(bubble.tail.kind), `${id} tail ${bubble.tail.kind}`);
    assert.ok(BUBBLE_DECOR_KINDS.includes(bubble.decor), `${id} decor ${bubble.decor}`);
    [bubble.ink, bubble.border.role, bubble.outline.role, bubble.tail.fill, bubble.tail.line].forEach((role) => assert.ok(UI_COLORS[role], `${id} ${role}`));
    Object.values(palettes).forEach((paletteId) => {
      const look = bubbleLook(id, (text) => resolveColors(text, paletteId));
      Object.entries(look).forEach(([key, value]) => {
        assert.equal(typeof value, 'string', `${id} ${key}`);
        assert.ok(!value.includes('undefined'), `${id} ${key}`);
        // Only the style's ink widths and falls, and its light, are left to the page.
        const left = (value.match(/var\(--gb-[a-z0-9-]+\)/g) || []).filter((name) => !/--gb-(ink-(drop|glow|line|depth)|light-(soft|shade|bevel)|bubble-tilt)\)/.test(name));
        assert.deepEqual(left, [], `${id} ${paletteId} ${key}`);
      });
    });
  });
  assert.equal(bubbleLook('comic').radius, '20px', "the comic's bubble keeps its corners");
  // Its shadow is worked out in the colour it falls in, never read from a
  // variable the page's root would resolve without it (a roll's kind kept).
  Object.keys(SHAPE_STYLES).forEach((id) => {
    const { boxShadow, filter } = bubbleShadow(id, UI_COLORS.info, 3);
    assert.ok(`${boxShadow} ${filter}`.includes(UI_COLORS.info), `${id} shadow in its tone`);
    assert.ok(!`${boxShadow} ${filter}`.includes('--gb-bubble-'), `${id} shadow reads no bubble variable`);
  });
});

// A bubble written in an ink of its own (dark on paper) letters its titles
// and totals as a light page does: no solid shadow under dark letters, which
// read as a second black copy of the text. Every other bubble keeps the
// page's lettering.
test("a paper bubble letters its dark ink as a light page does, every other bubble as its page", async () => {
  const { bubbleLettering } = await import('../../../../src/shared/ui/bubbleLooks.js');
  const { letteringVariables } = await import('../../../../src/shared/ui/colors.js');
  Object.values(SHAPE_STYLES).forEach(({ id, shapes: { bubble } }) => {
    ['dark', 'light'].forEach((mode) => {
      const expected = letteringVariables(bubble.ink === 'textPrimary' ? mode : 'light');
      assert.deepEqual(bubbleLettering(id, mode), expected, `${id} ${mode}`);
    });
  });
  assert.equal(bubbleLettering('war', 'dark')['--gb-lettering-drop'], '0');
});

test("every style fits its prose as its text, unless it fits the prose apart", async () => {
  const { FONT_STYLES, fontVariables } = await import('../../../../src/shared/ui/fonts.js');
  Object.keys(SHAPE_STYLES).forEach((styleId) => {
    const filled = fontVariables(styleId);
    const own = FONT_STYLES[styleId].fits?.prose;
    assert.equal(filled['--gb-prose-size-fit'], own ?? filled['--gb-body-size-fit'], styleId);
  });
  assert.equal(fontVariables('noir')['--gb-prose-size-fit'], 'ex-height 0.4');
});
