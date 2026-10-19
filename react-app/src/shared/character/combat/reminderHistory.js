// Reminders typed before, offered again so a table does not retype "Bardic
// Inspiration" every fight. A convenience only: kept in this browser's
// localStorage, never synced, never read by anything but the reminder field —
// losing it loses nothing but the shortcut. One list per device, whoever's
// reminder it was, so a GM's "Bless" on a monster is offered for the next
// player too.
//
// Dependency-free like combatEffects.js, so the plain node test runner can load
// it; storage access is guarded and a missing or broken entry reads as empty.
//
// The list is recorded when a reminder is added, not when it is removed, so a
// reminder taken off at once is still remembered.

import { MAX_EFFECT_TEXT } from './combatEffects.js';

// Not in a tool's scoped prefix, so section sync never carries it.
export const REMINDER_HISTORY_KEY = 'gb:reminder_history';
export const MAX_REMINDER_HISTORY = 20;
export const MAX_REMINDER_SUGGESTIONS = 6;

// History and reminders compare without case: "bless" is offered as used once
// "Bless" is on the creature, and typing it again keeps a single entry.
const fold = (text) => text.toLowerCase();

function cleanText(raw) {
  return typeof raw === 'string' ? raw.trim().slice(0, MAX_EFFECT_TEXT) : '';
}

// Most recent first; blanks, non-strings and case duplicates dropped, capped.
export function normalizeReminderHistory(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const text = cleanText(raw);
    if (!text || seen.has(fold(text))) continue;
    seen.add(fold(text));
    out.push(text);
    if (out.length >= MAX_REMINDER_HISTORY) break;
  }
  return out;
}

// The latest spelling wins and moves to the front.
export function recordReminder(history, text) {
  return normalizeReminderHistory([cleanText(text), ...normalizeReminderHistory(history)]);
}

export function forgetReminder(history, text) {
  const target = fold(cleanText(text));
  return normalizeReminderHistory(history).filter((entry) => fold(entry) !== target);
}

// What the field offers: entries not already on the creature, narrowed to what
// is being typed.
export function suggestReminders(history, { active = [], query = '', limit = MAX_REMINDER_SUGGESTIONS } = {}) {
  const taken = new Set(active.map((effect) => fold(String(effect?.text || ''))));
  const needle = fold(query.trim());
  return normalizeReminderHistory(history)
    .filter((entry) => !taken.has(fold(entry)) && (!needle || fold(entry).includes(needle)))
    .slice(0, limit);
}

// ── Storage ─────────────────────────────────────────────────────────────────
// Every field on the page reads one snapshot and is told when it changes,
// whether the write came from this tab or (through `storage` events) another.
// The snapshot is kept per stored string, so it stays the same object until
// the entry itself changes — as useSyncExternalStore needs.

const listeners = new Set();
let cachedRaw;
let cached = [];

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (_) {
    return null;
  }
}

function readRaw() {
  try {
    return storage()?.getItem(REMINDER_HISTORY_KEY) ?? null;
  } catch (_) {
    return null;
  }
}

export function getReminderHistory() {
  const raw = readRaw();
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = normalizeReminderHistory(raw ? JSON.parse(raw) : []);
  } catch (_) {
    cached = [];
  }
  return cached;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function writeHistory(next) {
  try {
    storage()?.setItem(REMINDER_HISTORY_KEY, JSON.stringify(next));
  } catch (_) {}
  notify();
}

export function rememberReminder(text) {
  writeHistory(recordReminder(getReminderHistory(), text));
}

export function forgetStoredReminder(text) {
  writeHistory(forgetReminder(getReminderHistory(), text));
}

function onStorageEvent(event) {
  if (event.key === null || event.key === REMINDER_HISTORY_KEY) notify();
}

export function subscribeReminderHistory(listener) {
  if (!listeners.size && typeof window !== 'undefined') window.addEventListener('storage', onStorageEvent);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== 'undefined') window.removeEventListener('storage', onStorageEvent);
  };
}
