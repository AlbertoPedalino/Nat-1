// Ad-hoc combat effects on a combatant: the "disadvantage on its next attack",
// "advantage on the next attack against it", "disadvantage on its saving
// throws" calls a GM makes mid-fight. Dependency-free for the same reason
// conditions.js is — it must stay importable by the plain node test runner.
//
// These are NOT conditions, and deliberately do not travel to player sheets.
// A condition is a named rules state with published text that the sheet and the
// encounter must agree on, so it is a synced vital; an effect is one GM's
// ruling for one fight, with no sheet-side meaning. It therefore lives on the
// combatant and in the fight snapshot only, and supabase/combat_sync.sql is
// untouched. Adding one here does NOT mean adding a key to SYNCED_VITALS.
//
// Expiry is manual on purpose. A duration is a label the GM reads, not a timer:
// initiative here can be stepped backwards (prevTurn), so an effect destroyed by
// a step forward could not be brought back by the step back. Clearing a spent
// effect is one click on its pill, which is also the moment the GM is looking at
// it — the roll it modified just happened.

export const CUSTOM_EFFECT_KEY = 'custom';

// 'adv' / 'disadv' drive the pill tint and the ADV|DIS tag. 'note' is for a
// custom effect that is neither (e.g. "takes 5 extra fire damage").
const EFFECT_POLARITIES = ['adv', 'disadv', 'note'];

// target: 'self'    → modifies rolls this creature makes.
//         'against' → modifies rolls other creatures make against it.
// short    pill text (the row is scanned, not read).
// sentence tooltip / aria text, phrased as the full ruling.
export const COMBAT_EFFECTS = [
  { key: 'selfAttackAdv', target: 'self', roll: 'attack', polarity: 'adv', short: 'Attacks', sentence: 'Advantage on its attack rolls' },
  { key: 'selfAttackDisadv', target: 'self', roll: 'attack', polarity: 'disadv', short: 'Attacks', sentence: 'Disadvantage on its attack rolls' },
  { key: 'selfSaveAdv', target: 'self', roll: 'save', polarity: 'adv', short: 'Saves', sentence: 'Advantage on its saving throws' },
  { key: 'selfSaveDisadv', target: 'self', roll: 'save', polarity: 'disadv', short: 'Saves', sentence: 'Disadvantage on its saving throws' },
  { key: 'selfCheckAdv', target: 'self', roll: 'check', polarity: 'adv', short: 'Checks', sentence: 'Advantage on its ability checks' },
  { key: 'selfCheckDisadv', target: 'self', roll: 'check', polarity: 'disadv', short: 'Checks', sentence: 'Disadvantage on its ability checks' },
  { key: 'incomingAttackAdv', target: 'against', roll: 'attack', polarity: 'adv', short: 'Attacks vs', sentence: 'Attack rolls against it have advantage' },
  { key: 'incomingAttackDisadv', target: 'against', roll: 'attack', polarity: 'disadv', short: 'Attacks vs', sentence: 'Attack rolls against it have disadvantage' },
];

const EFFECT_BY_KEY = Object.fromEntries(COMBAT_EFFECTS.map((effect) => [effect.key, effect]));

// The assignment grid is a matrix, not a list: one row per (target, roll) pair
// with an ADV and a DIS button, because "advantage or disadvantage on X" is the
// choice the GM is actually making. Derived from the flat table above so a new
// effect only has to be declared once.
const ROLL_LABELS = { attack: 'Attack rolls', save: 'Saving throws', check: 'Ability checks' };
const TARGET_LABELS = { self: 'This creature', against: 'Rolls against it' };

export const EFFECT_GROUPS = Object.entries(TARGET_LABELS)
  .map(([target, label]) => ({
    target,
    label,
    rows: Object.keys(ROLL_LABELS)
      .map((roll) => ({
        roll,
        label: ROLL_LABELS[roll],
        adv: COMBAT_EFFECTS.find((e) => e.target === target && e.roll === roll && e.polarity === 'adv')?.key || null,
        disadv: COMBAT_EFFECTS.find((e) => e.target === target && e.roll === roll && e.polarity === 'disadv')?.key || null,
      }))
      .filter((row) => row.adv || row.disadv),
  }))
  .filter((group) => group.rows.length);

// Every effect is created with this and each one carries its own from then on —
// duration is a property of the effect, not a mode the surface is in.
export const DEFAULT_EFFECT_DURATION = 'next';

// `short` is the suffix on the pill; 'manual' has none because "until removed"
// is what an unqualified marker already means.
export const EFFECT_DURATIONS = [
  { key: 'next', short: 'next', label: 'Next roll of that kind' },
  { key: 'turn', short: 'turn', label: 'Until the end of its next turn' },
  { key: 'round', short: 'round', label: 'Until the end of this round' },
  { key: 'manual', short: '', label: 'Until removed' },
];

const DURATION_BY_KEY = Object.fromEntries(EFFECT_DURATIONS.map((d) => [d.key, d]));

const DEFAULT_DURATION = DURATION_BY_KEY[DEFAULT_EFFECT_DURATION];

// A combatant's row has to stay scannable, and a free-text effect has to fit a
// pill. Both caps are UI budgets, exported so the input that enforces them and
// the normalizer that re-enforces them cannot disagree, and applied here so a
// hand-edited snapshot cannot smuggle a thousand effects back in.
export const MAX_EFFECTS = 12;
export const MAX_EFFECT_TEXT = 60;

export function durationLabel(duration) {
  return (DURATION_BY_KEY[duration] || DEFAULT_DURATION).label;
}

export function durationShort(duration) {
  return DURATION_BY_KEY[duration]?.short ?? '';
}

// Identity is derived, never stored: an effect is fully described by what it
// does, how long it lasts and (for a custom one) its text, so two identical
// calls are the same call. That keeps snapshots stable and removes any need to
// mint ids that would have to survive a save/restore round-trip.
export function effectId(effect) {
  return `${effect?.key || ''}|${effect?.duration || ''}|${effect?.text || ''}`;
}

export function effectPolarity(effect) {
  if (!effect) return 'note';
  if (effect.key === CUSTOM_EFFECT_KEY) return EFFECT_POLARITIES.includes(effect.polarity) ? effect.polarity : 'note';
  return EFFECT_BY_KEY[effect.key]?.polarity || 'note';
}

// Pill text.
export function effectShortLabel(effect) {
  if (!effect) return '';
  return effect.key === CUSTOM_EFFECT_KEY ? effect.text : (EFFECT_BY_KEY[effect.key]?.short || effect.key);
}

// Tooltip / aria text: the whole ruling in one sentence, duration included.
export function describeEffect(effect) {
  if (!effect) return '';
  const body = effect.key === CUSTOM_EFFECT_KEY ? effect.text : (EFFECT_BY_KEY[effect.key]?.sentence || effect.key);
  return `${body} — ${durationLabel(effect.duration)}`;
}

function coerceEffect(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const key = String(raw.key || '');
  const duration = DURATION_BY_KEY[raw.duration] ? raw.duration : DEFAULT_EFFECT_DURATION;
  if (key === CUSTOM_EFFECT_KEY) {
    const text = String(raw.text || '').trim().slice(0, MAX_EFFECT_TEXT);
    if (!text) return null;
    const polarity = EFFECT_POLARITIES.includes(raw.polarity) ? raw.polarity : 'note';
    return { key, duration, text, polarity };
  }
  // Catalog effects store no label or polarity: those are read from the table on
  // every render, so re-wording an effect updates fights already in progress.
  return EFFECT_BY_KEY[key] ? { key, duration } : null;
}

// Drop unknown keys, blank custom text and duplicates, and cap the list.
// Insertion order is kept — unlike conditions, which sort: the order a GM called
// the effects in is the order they read them back in, and nothing downstream
// builds a comparison key from this list.
export function normalizeEffects(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const effect = coerceEffect(raw);
    if (!effect) continue;
    const id = effectId(effect);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(effect);
    if (out.length >= MAX_EFFECTS) break;
  }
  return out;
}

// Toggle a catalog effect, always at the default duration — `setEffectDuration`
// re-times it afterwards. Matching is by KEY, not by key+duration: the grid
// button shows one state per effect, so re-clicking it while a copy is active at
// another duration has to clear that copy rather than stack a second one.
export function toggleEffect(effects, key) {
  const list = normalizeEffects(effects);
  if (!EFFECT_BY_KEY[key]) return list;
  if (list.some((effect) => effect.key === key)) return list.filter((effect) => effect.key !== key);
  return normalizeEffects([...list, { key, duration: DEFAULT_EFFECT_DURATION }]);
}

export function addCustomEffect(effects, text, polarity = 'note') {
  const list = normalizeEffects(effects);
  const effect = coerceEffect({ key: CUSTOM_EFFECT_KEY, text, duration: DEFAULT_EFFECT_DURATION, polarity });
  return effect ? normalizeEffects([...list, effect]) : list;
}

export function removeEffect(effects, id) {
  return normalizeEffects(effects).filter((effect) => effectId(effect) !== id);
}

// Re-time one active effect, in place. Two effects on the same combatant can
// hold different durations — that is the point — so this is the only way a
// duration is ever set after the default. Identity is derived from the duration,
// so the effect's id changes with it; re-normalizing collapses the result if the
// new timing makes it a duplicate of another effect already there.
export function setEffectDuration(effects, id, duration) {
  const list = normalizeEffects(effects);
  const index = list.findIndex((effect) => effectId(effect) === id);
  if (index < 0) return list;
  const next = [...list];
  next[index] = { ...next[index], duration };
  return normalizeEffects(next);
}
