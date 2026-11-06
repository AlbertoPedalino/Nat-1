import test from 'node:test';
import assert from 'node:assert/strict';
import {
  choiceKey, choiceText, lowerKey, matchKey, stripSource,
} from '../../../../src/shared/content/nameKeys.js';

test('matchKey keeps lowercase letters and digits only', () => {
  assert.equal(matchKey('Sleight of Hand'), 'sleightofhand');
  assert.equal(matchKey('sleight-of-hand'), 'sleightofhand');
  assert.equal(matchKey(null), '');
});

test('lowerKey lowercases and trims, punctuation kept', () => {
  assert.equal(lowerKey('  Two-Handed '), 'two-handed');
});

test('stripSource drops the 5etools source', () => {
  assert.equal(stripSource('Longsword|XPHB'), 'Longsword');
  assert.equal(stripSource(' Darkvision 60 ft. '), 'Darkvision 60 ft.');
});

test('a stored choice reads as text and compares as a key', () => {
  assert.equal(choiceText('{@spell Fire Bolt|XPHB}'), 'Fire Bolt');
  assert.equal(choiceText({ label: 'Elvish' }), 'Elvish');
  assert.equal(choiceText(3), '3');
  assert.equal(choiceKey({ name: 'Animal Handling|XPHB' }), 'animalhandling');
});
