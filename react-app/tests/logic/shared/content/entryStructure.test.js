import test from 'node:test';
import assert from 'node:assert/strict';
import { findNamedEntry, withOnlyNamedEntry } from '../../../../src/shared/content/entryStructure.js';

const block = (name, text) => ({ type: 'entries', name, entries: [text] });
const gwm = [
  'You gain the following benefits.',
  block('Heavy Weapon Mastery', 'Extra damage equals your Proficiency Bonus.'),
  block('Hew', 'One attack with the same weapon as a Bonus Action.'),
];

test('a named block is found by name, depth-first through entries and items', () => {
  assert.deepEqual(findNamedEntry(gwm, 'hew').entries, ['One attack with the same weapon as a Bonus Action.']);
  assert.equal(findNamedEntry(gwm, 'Cleave'), null);
  assert.equal(findNamedEntry(gwm, ''), null);
  assert.equal(findNamedEntry([{ type: 'list', items: [block('Trip', 'Prone.')] }], 'Trip').name, 'Trip');
});

test('one option is kept alone among the named blocks beside it, the text around kept', () => {
  assert.deepEqual(withOnlyNamedEntry(gwm, 'Hew'), [gwm[0], gwm[2]]);
  const nested = [{ type: 'entries', name: 'Runic Power', entries: ['Intro.', block('Blood', 'B.'), block('Frost', 'F.')] }];
  assert.deepEqual(withOnlyNamedEntry(nested, 'Frost'), [{ ...nested[0], entries: ['Intro.', block('Frost', 'F.')] }]);
  assert.equal(withOnlyNamedEntry(gwm, 'Cleave'), null);
});
