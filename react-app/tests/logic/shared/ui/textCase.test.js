import test from 'node:test';
import assert from 'node:assert/strict';
import { capitalize, titleCase } from '../../../../src/shared/ui/textCase.js';

test('capitalize raises the first letter and keeps the rest', () => {
  assert.equal(capitalize('beast'), 'Beast');
  assert.equal(capitalize('bonus action'), 'Bonus action');
  assert.equal(capitalize(''), '');
  assert.equal(capitalize(undefined), '');
});

test('titleCase capitalizes every word; underscores are spaces, apostrophes are not word starts', () => {
  assert.equal(titleCase("thieves' tools"), "Thieves' Tools");
  assert.equal(titleCase('half-elf'), 'Half-Elf');
  assert.equal(titleCase('animal_handling'), 'Animal Handling');
  assert.equal(titleCase('very rare'), 'Very Rare');
  assert.equal(titleCase('d20 test'), 'D20 Test');
});
