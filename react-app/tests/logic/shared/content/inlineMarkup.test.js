import test from 'node:test';
import assert from 'node:assert/strict';
import { scanMarkup, tagDisplayText } from '../../../../src/shared/content/inlineMarkup.js';

test('a tag shows its label, number, display name or first part', () => {
  assert.equal(tagDisplayText('atkr', 'm'), 'Melee Attack Roll:');
  assert.equal(tagDisplayText('hit', '5'), '+5');
  assert.equal(tagDisplayText('spell', 'fireball|XPHB|Fireball!'), 'Fireball!');
  assert.equal(tagDisplayText('filter', 'beasts|bestiary|type=beast'), 'beasts');
  assert.equal(tagDisplayText('hom', ''), 'Hit or Miss: ');
});

test('scanning splits text and tags, nested tags flattened, with offsets into the text', () => {
  const { text, segments } = scanMarkup('Roll {@damage 1d6} and {@tip {@b bold}|x}.');
  assert.deepEqual(segments.map((s) => (s.type === 'tag' ? `${s.tag}:${s.arg}` : s.text)), ['Roll ', 'damage:1d6', ' and ', 'tip:bold|x', '.']);
  const tag = segments[1];
  assert.equal(text.slice(tag.start, tag.end), '{@damage 1d6}');
});
