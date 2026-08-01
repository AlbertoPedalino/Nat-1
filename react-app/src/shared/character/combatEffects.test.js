import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBAT_EFFECTS,
  CUSTOM_EFFECT_KEY,
  DEFAULT_EFFECT_DURATION,
  EFFECT_DURATIONS,
  EFFECT_GROUPS,
  MAX_EFFECTS,
  MAX_EFFECT_TEXT,
  addCustomEffect,
  describeEffect,
  durationLabel,
  effectId,
  effectPolarity,
  effectShortLabel,
  normalizeEffects,
  removeEffect,
  setEffectDuration,
  toggleEffect,
} from './combatEffects.js';

test('every catalog effect is reachable from the assignment grid', () => {
  const inGrid = new Set(EFFECT_GROUPS.flatMap((group) => group.rows.flatMap((row) => [row.adv, row.disadv])));
  for (const effect of COMBAT_EFFECTS) {
    assert.ok(inGrid.has(effect.key), `${effect.key} has no button in the grid`);
  }
});

test('effect keys are unique and every one carries a polarity and a sentence', () => {
  const keys = COMBAT_EFFECTS.map((effect) => effect.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const effect of COMBAT_EFFECTS) {
    assert.ok(['adv', 'disadv'].includes(effect.polarity), `${effect.key} polarity`);
    assert.ok(effect.sentence && effect.short, `${effect.key} labels`);
  }
});

test('toggling a catalog effect adds it at the default duration and removes it again', () => {
  const on = toggleEffect([], 'selfAttackDisadv');
  assert.deepEqual(on, [{ key: 'selfAttackDisadv', duration: 'next' }]);
  assert.deepEqual(toggleEffect(on, 'selfAttackDisadv'), []);
});

// The grid renders one pressed state per effect, so a second click has to clear
// whatever copy is active — otherwise the button reads "on" while a click on it
// stacks a duplicate at another duration.
test('toggling off matches by key whatever duration the effect was re-timed to', () => {
  const on = setEffectDuration(toggleEffect([], 'incomingAttackAdv'), 'incomingAttackAdv|next|', 'turn');
  assert.deepEqual(on, [{ key: 'incomingAttackAdv', duration: 'turn' }]);
  assert.deepEqual(toggleEffect(on, 'incomingAttackAdv'), []);
});

// The whole point of per-pill durations: two effects on one combatant hold
// different timings at once.
test('re-timing one effect leaves the durations of the others alone', () => {
  const list = setEffectDuration(
    toggleEffect(toggleEffect([], 'selfAttackDisadv'), 'selfSaveDisadv'),
    'selfSaveDisadv|next|',
    'manual',
  );
  assert.deepEqual(list, [
    { key: 'selfAttackDisadv', duration: 'next' },
    { key: 'selfSaveDisadv', duration: 'manual' },
  ]);
});

test('re-timing an effect that is no longer there changes nothing', () => {
  const list = toggleEffect([], 'selfAttackDisadv');
  assert.deepEqual(setEffectDuration(list, 'selfSaveDisadv|next|', 'turn'), list);
});

// Duration is part of an effect's identity, so re-timing one onto another's
// timing makes them the same call — they must collapse, not stack.
test('re-timing an effect into a duplicate collapses the pair', () => {
  const list = normalizeEffects([
    { key: 'custom', text: 'marked', duration: 'next', polarity: 'note' },
    { key: 'custom', text: 'marked', duration: 'turn', polarity: 'note' },
  ]);
  assert.equal(list.length, 2);
  assert.deepEqual(setEffectDuration(list, 'custom|turn|marked', 'next'), [
    { key: 'custom', duration: 'next', text: 'marked', polarity: 'note' },
  ]);
});

test('an unknown effect key is refused rather than stored', () => {
  assert.deepEqual(toggleEffect([], 'bogus'), []);
  assert.deepEqual(normalizeEffects([{ key: 'bogus', duration: 'next' }]), []);
});

test('an unknown duration falls back to the default instead of being kept', () => {
  assert.deepEqual(normalizeEffects([{ key: 'selfSaveDisadv', duration: 'forever' }]), [
    { key: 'selfSaveDisadv', duration: 'next' },
  ]);
});

test('duplicates collapse and identity ignores nothing that distinguishes two calls', () => {
  const list = normalizeEffects([
    { key: 'selfSaveDisadv', duration: 'next' },
    { key: 'selfSaveDisadv', duration: 'next' },
    { key: 'selfSaveDisadv', duration: 'turn' },
  ]);
  assert.equal(list.length, 2);
  assert.notEqual(effectId(list[0]), effectId(list[1]));
});

test('a custom effect keeps its text and is removable by id', () => {
  const list = addCustomEffect([], '  +2 AC from cover  ');
  assert.deepEqual(list, [{ key: CUSTOM_EFFECT_KEY, duration: 'next', text: '+2 AC from cover', polarity: 'note' }]);
  assert.equal(effectShortLabel(list[0]), '+2 AC from cover');
  assert.deepEqual(removeEffect(list, effectId(list[0])), []);
});

test('a blank custom effect is not added', () => {
  assert.deepEqual(addCustomEffect([], '   '), []);
  assert.deepEqual(normalizeEffects([{ key: CUSTOM_EFFECT_KEY, text: '', duration: 'next' }]), []);
});

test('custom text is capped so a pill cannot swallow the initiative row', () => {
  const [effect] = addCustomEffect([], 'x'.repeat(200));
  assert.equal(effect.text.length, 60);
});

test('the list is capped and keeps the order the GM called the effects in', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ key: CUSTOM_EFFECT_KEY, text: `e${i}`, duration: 'next' }));
  const list = normalizeEffects(many);
  assert.equal(list.length, 12);
  assert.equal(list[0].text, 'e0');
  assert.equal(list[11].text, 'e11');
});

// Catalog effects store only key + duration, so the wording and the polarity are
// read from the table on render: re-labelling one updates fights in progress.
test('a catalog effect stores no label or polarity of its own', () => {
  const [effect] = setEffectDuration(toggleEffect([], 'selfCheckAdv'), 'selfCheckAdv|next|', 'manual');
  assert.deepEqual(Object.keys(effect).sort(), ['duration', 'key']);
  assert.equal(effectPolarity(effect), 'adv');
  assert.equal(describeEffect(effect), 'Advantage on its ability checks — Until removed');
});

test('a custom effect with a bogus polarity reads as a neutral note', () => {
  const [effect] = addCustomEffect([], 'burning', 'sideways');
  assert.equal(effectPolarity(effect), 'note');
});

test('every duration has a key, a label and a defined pill suffix', () => {
  for (const duration of EFFECT_DURATIONS) {
    assert.ok(duration.key && duration.label, `${duration.key} labels`);
    assert.equal(typeof duration.short, 'string');
  }
});

// Every unknown duration resolves to the default, and describeEffect reads its
// label — so dropping the default from the table would crash every pill.
test('the default duration is one of the durations on offer', () => {
  assert.ok(EFFECT_DURATIONS.some((duration) => duration.key === DEFAULT_EFFECT_DURATION));
  assert.equal(durationLabel('nonsense'), durationLabel(DEFAULT_EFFECT_DURATION));
});

// Both caps are enforced by the normalizer AND by the input that feeds it. They
// have to be the same number, so the input reads it from here.
test('the list and text caps are exported as the numbers actually applied', () => {
  const many = Array.from({ length: MAX_EFFECTS + 5 }, (_, i) => ({ key: CUSTOM_EFFECT_KEY, text: `e${i}` }));
  assert.equal(normalizeEffects(many).length, MAX_EFFECTS);
  assert.equal(addCustomEffect([], 'x'.repeat(MAX_EFFECT_TEXT + 40))[0].text.length, MAX_EFFECT_TEXT);
});

test('normalize tolerates the shapes a hand-edited snapshot can produce', () => {
  assert.deepEqual(normalizeEffects(null), []);
  assert.deepEqual(normalizeEffects('prone'), []);
  assert.deepEqual(normalizeEffects([null, 3, 'x', { key: 'selfAttackAdv', duration: 'next' }]), [
    { key: 'selfAttackAdv', duration: 'next' },
  ]);
});
