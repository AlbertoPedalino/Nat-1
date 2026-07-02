import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeBeastEntry, parseBeastActions, parseBeastActionsRich } from './beasts.js';

const rolls = (toks) => toks.filter((t) => t.type === 'roll');
const text = (toks) => toks.map((t) => t.text).join('');

test('tokenizes an attack action into prose + inline roll pills', () => {
  const toks = tokenizeBeastEntry('{@atkr m} {@hit 5}, reach 5 ft. {@h}1 ({@damage 1d4 - 1}) slashing damage.');
  assert.deepEqual(toks, [
    { type: 'text', text: 'Melee Attack Roll: ' },
    { type: 'roll', kind: 'd20', bonus: 5, text: '+5', rollType: 'Attack Roll' },
    { type: 'text', text: ', reach 5 ft. Hit: 1 (' },
    { type: 'roll', kind: 'formula', formula: '1d4-1', text: '1d4-1', rollType: 'Damage' },
    { type: 'text', text: ') slashing damage.' },
  ]);
});

test('real numbers in prose ("5 ft") are never mistaken for roll tokens', () => {
  const toks = tokenizeBeastEntry('reach 5 ft. and 10 feet fly speed');
  assert.equal(rolls(toks).length, 0);
  assert.equal(text(toks), 'reach 5 ft. and 10 feet fly speed');
});

test('negative hit bonus keeps its sign', () => {
  const [tok] = rolls(tokenizeBeastEntry('{@hit -1} to hit'));
  assert.equal(tok.bonus, -1);
  assert.equal(tok.text, '-1');
});

test('damage whitespace is normalized into a clean formula', () => {
  const [tok] = rolls(tokenizeBeastEntry('({@damage 2d6 + 3}) piercing'));
  assert.equal(tok.formula, '2d6+3');
});

test('generic tags render display text and drop pipe metadata', () => {
  assert.equal(text(tokenizeBeastEntry('the target is {@condition prone|XPHB}.')), 'the target is prone.');
  assert.equal(text(tokenizeBeastEntry('save DC {@dc 13}')), 'save DC 13');
});

test('atkr with multiple modes reads as prose', () => {
  assert.equal(text(tokenizeBeastEntry('{@atkr m,r}')), 'Melee or Ranged Attack Roll:');
});

test('stripTags (via parseBeastActions) matches the tokenizer projection and is clean prose', () => {
  const raw = '{@atkr m} {@hit 4}, reach 5 ft. {@h}2 ({@damage 1d6 + 2}) bludgeoning damage.';
  const [action] = parseBeastActions([{ name: 'Slam', entries: [raw] }]);
  assert.equal(action.text, text(tokenizeBeastEntry(raw)));
  assert.match(action.text, /^Melee Attack Roll: \+4, reach 5 ft\. Hit: 2 \(1d6\+2\) bludgeoning damage\.$/);
  assert.ok(!action.text.includes('{@'), 'no leftover tags');
  assert.ok(!/\s{2,}/.test(action.text), 'no double spaces');
  assert.ok(!/\s[,.;:]/.test(action.text), 'no space before punctuation');
  // structured fields still power the attack card
  assert.equal(action.attackBonus, 4);
  assert.deepEqual(action.damage, ['1d6+2']);
  assert.equal(action.isAttack, true);
});

test('parseBeastActionsRich keeps the action name and yields tokens', () => {
  const [rich] = parseBeastActionsRich([{ name: 'Bite', entries: ['{@atkr m} {@hit 3}. {@h}1 ({@damage 1d4}) piercing.'] }]);
  assert.equal(rich.name, 'Bite');
  assert.equal(rolls(rich.tokens).length, 2);
});
