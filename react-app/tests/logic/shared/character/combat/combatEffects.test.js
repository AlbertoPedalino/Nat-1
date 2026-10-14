import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOM_EFFECT_KEY,
  MAX_EFFECTS,
  MAX_EFFECT_TEXT,
  addReminder,
  effectId,
  normalizeEffects,
  removeEffect,
} from '../../../../../src/shared/character/combat/combatEffects.js';

test('a reminder stores trimmed free text and can be removed by id', () => {
  const list = addReminder([], '  Bardic Inspiration  ');
  assert.deepEqual(list, [{ key: CUSTOM_EFFECT_KEY, text: 'Bardic Inspiration' }]);
  assert.equal(effectId(list[0]), 'Bardic Inspiration');
  assert.deepEqual(removeEffect(list, effectId(list[0])), []);
});

test('reminders keep the order they were given in', () => {
  const list = addReminder(addReminder(addReminder([], 'Guidance'), 'Bless'), 'Haste');
  assert.deepEqual(list.map((effect) => effect.text), ['Guidance', 'Bless', 'Haste']);
  assert.deepEqual(removeEffect(list, 'Bless').map((effect) => effect.text), ['Guidance', 'Haste']);
});

test('a blank reminder is not stored', () => {
  assert.deepEqual(addReminder([], '   '), []);
  assert.deepEqual(addReminder([], undefined), []);
  assert.deepEqual(normalizeEffects([{ key: CUSTOM_EFFECT_KEY, text: '' }]), []);
});

test('the same reminder twice is one reminder', () => {
  const list = addReminder(addReminder([], 'Guidance'), 'Guidance');
  assert.deepEqual(list, [{ key: CUSTOM_EFFECT_KEY, text: 'Guidance' }]);
});

// Both caps are exported so the input and the normalizer cannot disagree.
test('text is capped so a chip cannot swallow the initiative row', () => {
  const [effect] = addReminder([], 'x'.repeat(MAX_EFFECT_TEXT + 40));
  assert.equal(effect.text.length, MAX_EFFECT_TEXT);
});

test('the list is capped and keeps the first entries', () => {
  const many = Array.from({ length: MAX_EFFECTS + 18 }, (_, i) => ({ key: CUSTOM_EFFECT_KEY, text: `e${i}` }));
  const list = normalizeEffects(many);
  assert.equal(list.length, MAX_EFFECTS);
  assert.equal(list[0].text, 'e0');
  assert.equal(list.at(-1).text, `e${MAX_EFFECTS - 1}`);
  // At the limit an addition is refused rather than pushing one out.
  assert.deepEqual(addReminder(list, 'one more'), list);
});

// The list once also held advantage/disadvantage calls, and custom entries
// carried a duration and a polarity. Saved data is left as it is: reading it
// keeps the reminders and drops the rest.
test('entries from the older format keep their text and lose everything else', () => {
  assert.deepEqual(normalizeEffects([
    { key: 'selfAttackAdv', duration: 'next' },
    { key: CUSTOM_EFFECT_KEY, duration: 'turn', text: 'marked', polarity: 'note' },
    { key: 'incomingAttackDisadv', duration: 'manual' },
    { key: CUSTOM_EFFECT_KEY, duration: 'next', text: 'marked', polarity: 'adv' },
  ]), [{ key: CUSTOM_EFFECT_KEY, text: 'marked' }]);
});

test('normalize tolerates the shapes a hand-edited snapshot can produce', () => {
  assert.deepEqual(normalizeEffects(null), []);
  assert.deepEqual(normalizeEffects('Guidance'), []);
  assert.deepEqual(normalizeEffects([null, 7, 'Guidance', {}, { text: 'no key' }, { key: 'unknown', text: 'x' }]), []);
  assert.deepEqual(removeEffect(null, 'Guidance'), []);
});
