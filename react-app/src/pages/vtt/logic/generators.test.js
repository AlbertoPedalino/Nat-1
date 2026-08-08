import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERATORS,
  isMapImage,
  orderForFloors,
  sceneNamesFor,
} from './generators.js';

const file = (name, type = '') => ({ name, type });

test('every generator names a real page and says what it makes', () => {
  assert.ok(GENERATORS.length >= 6);
  for (const generator of GENERATORS) {
    assert.match(generator.url, /^https:\/\/watabou\.github\.io\//);
    assert.ok(generator.label && generator.blurb);
  }
  assert.equal(GENERATORS.find((entry) => entry.id === 'dungeon').label, 'Dungeon');
  assert.equal(GENERATORS.find((entry) => entry.id === 'nowhere'), undefined);
  // The one that stacks: a building is exported a storey at a time.
  assert.equal(GENERATORS.find((entry) => entry.id === 'dwelling').floors, true);
  assert.equal(GENERATORS.find((entry) => entry.id === 'city').floors, false);
});

// A GM exporting a building drops the whole download folder in as often as not,
// and the generators write JSON beside the picture.
test('only the pictures are taken from what is dropped', () => {
  assert.equal(isMapImage(file('dungeon.png', 'image/png')), true);
  assert.equal(isMapImage(file('dungeon.svg')), true);
  assert.equal(isMapImage(file('dungeon.PNG')), true);
  assert.equal(isMapImage(file('dungeon.json', 'application/json')), false);
  assert.equal(isMapImage(file('notes.txt')), false);
});

// Watabou names its exports after the seed, which says nothing in a scene list.
test('scenes are named for what made them, and floors are numbered', () => {
  const dwelling = GENERATORS.find((entry) => entry.id === 'dwelling');
  const city = GENERATORS.find((entry) => entry.id === 'city');

  assert.deepEqual(sceneNamesFor(city, [file('a.png')]), ['City']);
  assert.deepEqual(sceneNamesFor(dwelling, [file('a.png'), file('b.png')]), [
    'Dwelling — Floor 1',
    'Dwelling — Floor 2',
  ]);
  assert.deepEqual(sceneNamesFor(city, [file('a.png'), file('b.png')]), ['City 1', 'City 2']);
  assert.deepEqual(sceneNamesFor(dwelling, []), []);
});

// The file picker hands them over in whatever order it likes, and a house whose
// cellar is called "floor 3" is a house nobody can walk through.
test('storeys are ordered by the numbers in their names', () => {
  const picked = [file('house-2.png'), file('house-10.png'), file('house-1.png')];
  assert.deepEqual(orderForFloors(picked).map((item) => item.name), [
    'house-1.png', 'house-10.png', 'house-2.png',
  ].sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1])));

  // Ten comes after two, which a plain sort by name gets wrong.
  assert.deepEqual(orderForFloors(picked).map((item) => item.name), [
    'house-1.png', 'house-2.png', 'house-10.png',
  ]);

  // A seed in the name is a number too, so the last one in the name wins and
  // anything numberless keeps its place at the back rather than jumping to it.
  assert.deepEqual(
    orderForFloors([file('plan.png'), file('dungeon-1143801683-2.png'), file('dungeon-1143801683-1.png')])
      .map((item) => item.name),
    ['dungeon-1143801683-1.png', 'dungeon-1143801683-2.png', 'plan.png'],
  );
});
