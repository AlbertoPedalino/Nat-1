import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA_EFFECTS,
  areaEdgeDistance,
  areaFromDrag,
  areaSizeFeet,
  resizedAreaPoints,
  areaLabelAnchor,
  buildAreaPoints,
  feetToCells,
  isPointOnArea,
  normalizeArea,
  snapAreaOrigin,
} from '../../../../../src/shared/vtt/map/areas.js';
import {
  drawingAtPoint, isNote, scaledPoints, strokeLabelAnchor, toDrawing,
} from '../../../../../src/shared/vtt/map/drawing.js';

const area = (shape, points, extra = {}) => ({
  id: `${shape}-1`,
  points,
  area: normalizeArea({ shape, filled: true, ...extra }),
});

test('an area description is reduced to what the canvas trusts', () => {
  assert.equal(normalizeArea(null), null);
  assert.equal(normalizeArea({ shape: 'hexagon' }), null);
  assert.deepEqual(
    normalizeArea({ shape: 'circle', filled: 1, effect: 'lava', breadth: 3 }),
    { shape: 'circle', filled: true, effect: null },
  );
  assert.deepEqual(
    normalizeArea({ shape: 'line', effect: 'fire', breadth: -2 }),
    { shape: 'line', filled: false, effect: 'fire', breadth: 0.1 },
  );
  assert.ok(AREA_EFFECTS.every((effect) => effect.color && effect.label));
});

test('feet become cells on the map scale', () => {
  assert.equal(feetToCells(20, 5), 4);
  assert.equal(feetToCells(30, 10), 3);
  // A missing or broken scale falls back to the 5 ft square.
  assert.equal(feetToCells(15, 0), 3);
  assert.equal(feetToCells(-5, 5), 0);
});

test('origins snap to grid crossings and square centres, but not on hexes', () => {
  assert.deepEqual(snapAreaOrigin({ x: 3.2, y: 4.74 }), { x: 3, y: 4.5 });
  assert.deepEqual(snapAreaOrigin({ x: 3.2, y: 4.74 }, { hex: true }), { x: 3.2, y: 4.74 });
});

test('the stored points carry the reach and the direction', () => {
  // A 20 ft sphere: radius 4 squares, pointing right by default.
  assert.deepEqual(buildAreaPoints('circle', { x: 2, y: 2 }, { x: 2, y: 2 }, 4), [{ x: 2, y: 2 }, { x: 6, y: 2 }]);
  // A square's size is its side, so the reach is half of it.
  assert.deepEqual(buildAreaPoints('square', { x: 2, y: 2 }, { x: 2, y: 2 }, 4), [{ x: 2, y: 2 }, { x: 4, y: 2 }]);
  // A cone faces where it was dragged, at its full length however far that was.
  assert.deepEqual(buildAreaPoints('cone', { x: 0, y: 0 }, { x: 0, y: 1 }, 3), [{ x: 0, y: 0 }, { x: 0, y: 3 }]);
});

test('each shape knows what is inside it', () => {
  const circle = area('circle', [{ x: 0, y: 0 }, { x: 4, y: 0 }]);
  assert.ok(areaEdgeDistance(circle, { x: 2, y: 2 }) < 0);
  assert.ok(areaEdgeDistance(circle, { x: 3, y: 3 }) > 0);

  const square = area('square', [{ x: 0, y: 0 }, { x: 2, y: 0 }]);
  assert.ok(areaEdgeDistance(square, { x: 1.9, y: -1.9 }) < 0);
  assert.ok(areaEdgeDistance(square, { x: 2.1, y: 0 }) > 0);

  // A 5e cone is as wide at its end as it is long.
  const cone = area('cone', [{ x: 0, y: 0 }, { x: 6, y: 0 }]);
  assert.ok(areaEdgeDistance(cone, { x: 5, y: 2.4 }) < 0);
  assert.ok(areaEdgeDistance(cone, { x: 2, y: 1.5 }) > 0);
  assert.ok(areaEdgeDistance(cone, { x: -0.5, y: 0 }) > 0);

  const line = area('line', [{ x: 0, y: 0 }, { x: 0, y: 10 }], { breadth: 1 });
  assert.ok(areaEdgeDistance(line, { x: 0.4, y: 9 }) < 0);
  assert.ok(areaEdgeDistance(line, { x: 0.6, y: 5 }) > 0);
});

test('picking an area up takes its rim or origin, not its inside', () => {
  const circle = area('circle', [{ x: 0, y: 0 }, { x: 4, y: 0 }]);
  assert.equal(isPointOnArea(circle, { x: 2, y: 0 }), true);
  assert.equal(isPointOnArea(circle, { x: 2, y: 0 }, { edgeOnly: true }), false);
  assert.equal(isPointOnArea(circle, { x: 3.9, y: 0 }, { edgeOnly: true }), true);
  assert.equal(isPointOnArea(circle, { x: 0.2, y: 0.1 }, { edgeOnly: true }), true);

  // The eraser takes it from anywhere inside; moving needs the rim.
  assert.equal(drawingAtPoint([circle], { x: 2, y: 0 })?.id, 'circle-1');
  assert.equal(drawingAtPoint([circle], { x: 2, y: 0 }, 0.5, { areaEdgeOnly: true }), null);
});

test('the label sits in the middle of the area', () => {
  assert.deepEqual(areaLabelAnchor(area('circle', [{ x: 3, y: 3 }, { x: 5, y: 3 }])), { x: 3, y: 3 });
  const anchor = areaLabelAnchor(area('line', [{ x: 0, y: 0 }, { x: 0, y: 10 }]));
  assert.ok(Math.abs(anchor.x) < 1e-9);
  assert.equal(anchor.y, 5);
});

test('a row read from the database keeps its area', () => {
  const drawing = toDrawing({
    id: 'a1',
    points: [{ x: 1, y: 1 }, { x: 5, y: 1 }],
    text: 'Fireball',
    area: { shape: 'circle', filled: false, effect: 'fire' },
  });
  assert.deepEqual(drawing.area, { shape: 'circle', filled: false, effect: 'fire' });
  assert.equal(drawing.text, 'Fireball');
  assert.equal(toDrawing({ id: 's1', points: [{ x: 0, y: 0 }] }).area, null);
});

test('an area is dragged out a whole square at a time, and says its size in feet', () => {
  const options = { shape: 'circle', filled: true, effect: 'fire', breadthFt: 5, label: ' Fireball ' };
  // A press that has not gone half a square places nothing.
  assert.equal(areaFromDrag(options, { x: 0, y: 0 }, { x: 0.3, y: 0 }, 5), null);

  const circle = areaFromDrag(options, { x: 0, y: 0 }, { x: 3.7, y: 0.4 }, 5);
  assert.equal(circle.hint, '20 ft radius');
  assert.equal(circle.text, 'Fireball');
  assert.deepEqual(circle.area, { shape: 'circle', filled: true, effect: 'fire' });
  assert.ok(Math.abs(Math.hypot(circle.points[1].x, circle.points[1].y) - 4) < 0.01);

  // The step is whatever a square is worth on this map.
  assert.equal(areaFromDrag(options, { x: 0, y: 0 }, { x: 2, y: 0 }, 10).hint, '20 ft radius');

  // A square is dragged from its centre: the longer axis gives half its side.
  const square = areaFromDrag({ ...options, shape: 'square' }, { x: 0, y: 0 }, { x: 1, y: 1.4 }, 5);
  assert.equal(square.hint, '15 ft square');

  const line = areaFromDrag({ ...options, shape: 'line', label: '' }, { x: 0, y: 0 }, { x: 0, y: 12.2 }, 5);
  assert.equal(line.hint, '60 ft × 5 ft line');
  assert.equal(line.text, null);
  assert.deepEqual(line.points, [{ x: 0, y: 0 }, { x: 0, y: 12 }]);
});

test('an area is resized in feet about its origin, keeping its direction', () => {
  const square = area('square', [{ x: 1, y: 1 }, { x: 3, y: 1 }]);
  assert.equal(areaSizeFeet(square, 5), 20);
  assert.deepEqual(resizedAreaPoints(square, 30, 5), [{ x: 1, y: 1 }, { x: 4, y: 1 }]);

  const cone = area('cone', [{ x: 0, y: 0 }, { x: 0, y: 3 }]);
  assert.equal(areaSizeFeet(cone, 10), 30);
  assert.deepEqual(resizedAreaPoints(cone, 60, 10), [{ x: 0, y: 0 }, { x: 0, y: 6 }]);
});

test('a stroke is scaled about the middle of its bounding box', () => {
  assert.deepEqual(scaledPoints([{ x: 0, y: 0 }, { x: 2, y: 4 }], 0.5), [{ x: 0.5, y: 1 }, { x: 1.5, y: 3 }]);
  // A dot has no size to change.
  assert.deepEqual(scaledPoints([{ x: 3, y: 3 }], 2), [{ x: 3, y: 3 }]);
});

test('a hidden mark says so', () => {
  assert.equal(toDrawing({ id: 'h', points: [{ x: 0, y: 0 }], hidden_from_players: true }).hiddenFromPlayers, true);
  assert.equal(toDrawing({ id: 'v', points: [{ x: 0, y: 0 }] }).hiddenFromPlayers, false);
});

test('a stroke label sits mid-way along an open line and in the middle of a closed one', () => {
  // An L-shaped path 4 + 4 long: half way is the corner, written above it.
  assert.deepEqual(
    strokeLabelAnchor([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }]),
    { point: { x: 4, y: 0 }, above: true },
  );
  // A ring drawn round something: its label goes inside.
  assert.deepEqual(
    strokeLabelAnchor([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 0.2, y: 0.3 }]),
    { point: { x: 2, y: 2 }, above: false },
  );
  assert.equal(strokeLabelAnchor([{ x: 1, y: 1 }]), null);
});

test('only words on a single point are a note', () => {
  assert.equal(isNote({ points: [{ x: 1, y: 1 }], text: 'Trap' }), true);
  assert.equal(isNote({ points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], text: 'Path' }), false);
  assert.equal(isNote({ points: [{ x: 1, y: 1 }], text: null }), false);
  assert.equal(isNote({ points: [{ x: 1, y: 1 }, { x: 4, y: 1 }], text: 'Fireball', area: { shape: 'circle' } }), false);
});
