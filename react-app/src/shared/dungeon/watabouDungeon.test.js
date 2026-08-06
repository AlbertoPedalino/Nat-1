import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrateFromImage, isRoomRect, parseWatabouDungeon } from './watabouDungeon.js';

// Trimmed from a real export (One Page Dungeon 1.2.7, "Frozen Den of Ta-Va"):
// six rooms, four corridor squares, and one 1×1 rectangle per door.
const EXPORT = {
  version: '1.2.7',
  title: 'Frozen Den of Ta-Va',
  story: 'The den of Ta-Va is situated on a lonely island.',
  rects: [
    { x: -2, y: 1, w: 5, h: 4 },
    { x: 4, y: 1, w: 5, h: 5 },
    { x: -8, y: 1, w: 5, h: 5 },
    { x: 6, y: 7, w: 1, h: 1 },
    { x: 5, y: -3, w: 3, h: 3, rotunda: true },
    { x: -4, y: 7, w: 1, h: 1 },
    { x: 8, y: 7, w: 1, h: 1 },
    { x: -2, y: 6, w: 3, h: 3 },
    { x: 8, y: 9, w: 1, h: 1 },
    { x: 10, y: 8, w: 4, h: 3, ending: true },
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 3, y: 3, w: 1, h: 1 },
    { x: -3, y: 3, w: 1, h: 1 },
    { x: 6, y: 6, w: 1, h: 1 },
    { x: 6, y: 0, w: 1, h: 1 },
    { x: -4, y: 6, w: 1, h: 1 },
    { x: 7, y: 7, w: 1, h: 1 },
    { x: -3, y: 7, w: 1, h: 1 },
    { x: 8, y: 8, w: 1, h: 1 },
    { x: 9, y: 9, w: 1, h: 1 },
    { x: -1, y: 5, w: 1, h: 1 },
  ],
  doors: [
    { x: 0, y: 0, dir: { x: 0, y: 1 }, type: 3 },
    { x: 3, y: 3, dir: { x: 1, y: 0 }, type: 5 },
    { x: -3, y: 3, dir: { x: -1, y: 0 }, type: 2 },
    { x: 6, y: 6, dir: { x: 0, y: 1 }, type: 0 },
    { x: 6, y: 0, dir: { x: 0, y: -1 }, type: 1 },
    { x: -4, y: 6, dir: { x: 0, y: 1 }, type: 2 },
    { x: 7, y: 7, dir: { x: 1, y: 0 }, type: 0 },
    { x: -3, y: 7, dir: { x: 1, y: 0 }, type: 9 },
    { x: 8, y: 8, dir: { x: 0, y: 1 }, type: 0 },
    { x: 9, y: 9, dir: { x: 1, y: 0 }, type: 9 },
    { x: -1, y: 5, dir: { x: 0, y: 1 }, type: 1 },
  ],
  notes: [
    { text: 'A great stone gate with a keyhole to the east.', ref: '1', pos: { x: 0.5, y: 3 } },
    { text: 'Some gold, a bottle of wine and a breastplate.', ref: '2', pos: { x: -5.5, y: 3.5 } },
    { text: 'A medium chest with a bat-shaped key.', ref: '3', pos: { x: -0.5, y: 7.5 } },
  ],
  columns: [{ x: -1, y: 2 }],
  water: [],
};

// Twenty-one rectangles, six rooms. Nothing in the file says which is which.
test('rooms are told apart from the doorways and the corners', () => {
  const dungeon = parseWatabouDungeon(EXPORT);

  assert.equal(dungeon.title, 'Frozen Den of Ta-Va');
  assert.equal(dungeon.rooms.length, 6);
  // Eleven of the rectangles sit exactly on a door, and four are the squares
  // where corridors turn: neither is a room to put a dragon in.
  assert.equal(dungeon.corridors.length, 4);
  assert.equal(dungeon.doors.length, 11);
  assert.ok(dungeon.rooms.every((room) => room.w > 1 && room.h > 1));
});

// One cell wide is a passage however long it runs — a party walks down it
// single file, and a corridor handed an encounter and a chest would be the best
// room in the dungeon.
test('anything one cell wide is a corridor, at any length', () => {
  assert.equal(isRoomRect({ w: 3, h: 3 }), true);
  assert.equal(isRoomRect({ w: 2, h: 2 }), true);
  assert.equal(isRoomRect({ w: 1, h: 6 }), false);
  assert.equal(isRoomRect({ w: 8, h: 1 }), false);
  assert.equal(isRoomRect({ w: 1, h: 1 }), false);

  const hall = parseWatabouDungeon({
    ...EXPORT,
    rects: [...EXPORT.rects, { x: 20, y: 20, w: 1, h: 6 }, { x: 30, y: 30, w: 7, h: 1 }],
  });
  assert.equal(hall.rooms.length, 6, 'the long halls did not become rooms');
  assert.equal(hall.corridors.length, 6);
});

test('the key is numbered the way an eye crosses the page', () => {
  const { rooms } = parseWatabouDungeon(EXPORT);

  assert.deepEqual(rooms.map((room) => room.number), [1, 2, 3, 4, 5, 6]);
  // The rotunda is highest on the map, so it is room one however the file
  // happened to list it.
  assert.equal(rooms[0].y, -3);
  assert.equal(rooms[0].rotunda, true);
  assert.deepEqual(rooms.map((room) => `${room.x},${room.y}`), [
    '5,-3', '-8,1', '-2,1', '4,1', '-2,6', '10,8',
  ]);
  assert.deepEqual(rooms[0].centre, { x: 6.5, y: -1.5 });
  assert.equal(rooms.at(-1).ending, true);
});

// The generator's own words for a room and our roll for it belong on the same
// line of the key.
test('a note is filed under the room it was written in', () => {
  const { rooms } = parseWatabouDungeon(EXPORT);
  const withNotes = rooms.filter((room) => room.notes.length);

  assert.equal(withNotes.length, 3);
  assert.match(rooms.find((room) => room.x === -2 && room.y === 1).notes[0].text, /stone gate/);
  assert.match(rooms.find((room) => room.x === -8).notes[0].text, /bottle of wine/);
  assert.match(rooms.find((room) => room.y === 6).notes[0].text, /bat-shaped key/);
});

test('the extent counts every rectangle, negatives included', () => {
  const { bounds } = parseWatabouDungeon(EXPORT);
  assert.deepEqual(bounds, {
    minX: -8, minY: -3, maxX: 14, maxY: 11, width: 22, height: 14,
  });
});

test('a file that is not one of these exports says so', () => {
  assert.throws(() => parseWatabouDungeon({ hello: 'world' }), /not a One Page Dungeon export/);
  assert.throws(() => parseWatabouDungeon('{"nope":1}'), /not a One Page Dungeon export/);
});

// The export never says how wide its margin is, but it is the same on all four
// sides — so the picture's own width and height are two equations for the cell
// size and the margin.
test('the cell size and the margin are solved from the picture', () => {
  const bounds = { minX: -8, minY: -3, width: 22, height: 14 };
  // 22 + 2 cells of margin at 50px across, 14 + 2 down: what such an export is.
  const solved = calibrateFromImage({ width: 1200, height: 800 }, bounds);

  assert.equal(solved.margin, 1);
  assert.equal(solved.cellSize, 50);
  // Cell (0, 0) is eight cells right and three down of the picture's corner,
  // plus the margin.
  assert.deepEqual(solved.origin, { x: 450, y: 200 });

  const bigger = calibrateFromImage({ width: 2400, height: 1600 }, bounds);
  assert.equal(bigger.cellSize, 100);
  assert.equal(bigger.margin, 1);
});

test('a picture that cannot answer is not made to guess', () => {
  const bounds = { minX: 0, minY: 0, width: 10, height: 10 };
  // A square picture of a square dungeon: every margin fits it equally, so the
  // margin is taken as none rather than invented.
  assert.equal(calibrateFromImage({ width: 800, height: 800 }, bounds).margin, 0);
  assert.equal(calibrateFromImage({ width: 0, height: 800 }, bounds), null);
  assert.equal(calibrateFromImage({ width: 800, height: 800 }, null), null);
});
