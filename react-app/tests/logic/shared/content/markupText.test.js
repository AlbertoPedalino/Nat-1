import test from 'node:test';
import assert from 'node:assert/strict';
import { stripMarkup } from '../../../../src/shared/content/markupText.js';

test('markup keeps only the words it shows', () => {
  assert.equal(stripMarkup('{@item Shield|XPHB}'), 'Shield');
  assert.equal(stripMarkup('Proficiency in {@skill Stealth} and {@item Thieves\' Tools|XPHB}.'), 'Proficiency in Stealth and Thieves\' Tools.');
  assert.equal(stripMarkup('{@hom}half damage'), 'half damage');
  assert.equal(stripMarkup('Shield|XPHB'), 'Shield|XPHB');
  assert.equal(stripMarkup(null), '');
});
