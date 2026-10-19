import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_EFFECT_TEXT, addReminder } from '../../../../../src/shared/character/combat/combatEffects.js';
import {
  MAX_REMINDER_HISTORY,
  MAX_REMINDER_SUGGESTIONS,
  forgetReminder,
  normalizeReminderHistory,
  recordReminder,
  suggestReminders,
} from '../../../../../src/shared/character/combat/reminderHistory.js';

test('a recorded reminder goes to the front, trimmed, once', () => {
  const history = recordReminder(recordReminder(recordReminder([], 'Guidance'), '  Bless '), 'Guidance');
  assert.deepEqual(history, ['Guidance', 'Bless']);
});

test('the latest spelling of a reminder replaces the older one', () => {
  assert.deepEqual(recordReminder(['bless', 'Haste'], 'Bless'), ['Bless', 'Haste']);
});

test('a blank reminder is not recorded', () => {
  assert.deepEqual(recordReminder(['Bless'], '   '), ['Bless']);
  assert.deepEqual(recordReminder([], undefined), []);
});

test('the history is capped, oldest entries dropped first', () => {
  let history = [];
  for (let i = 0; i < MAX_REMINDER_HISTORY + 5; i += 1) history = recordReminder(history, `R${i}`);
  assert.equal(history.length, MAX_REMINDER_HISTORY);
  assert.equal(history[0], `R${MAX_REMINDER_HISTORY + 4}`);
  assert.ok(!history.includes('R0'));
});

test('a stored entry that is not a list of text reads as empty or is cleaned', () => {
  assert.deepEqual(normalizeReminderHistory(null), []);
  assert.deepEqual(normalizeReminderHistory({ 0: 'Bless' }), []);
  assert.deepEqual(normalizeReminderHistory(['Bless', 3, '', null, 'BLESS', 'x'.repeat(100)]), ['Bless', 'x'.repeat(MAX_EFFECT_TEXT)]);
});

test('a forgotten reminder leaves the history, whatever its case', () => {
  assert.deepEqual(forgetReminder(['Bless', 'Guidance'], 'bless'), ['Guidance']);
});

test('suggestions skip reminders already on the creature', () => {
  const active = addReminder([], 'bless');
  assert.deepEqual(suggestReminders(['Bless', 'Guidance'], { active }), ['Guidance']);
});

test('suggestions narrow to what is being typed', () => {
  const history = ['Bardic Inspiration', 'Bless', 'Guidance'];
  assert.deepEqual(suggestReminders(history, { query: ' b ' }), ['Bardic Inspiration', 'Bless']);
  assert.deepEqual(suggestReminders(history, { query: 'insp' }), ['Bardic Inspiration']);
  assert.deepEqual(suggestReminders(history, { query: 'haste' }), []);
});

test('suggestions show only the most recent few', () => {
  const history = Array.from({ length: 10 }, (_, i) => `R${i}`);
  assert.deepEqual(suggestReminders(history), history.slice(0, MAX_REMINDER_SUGGESTIONS));
});
