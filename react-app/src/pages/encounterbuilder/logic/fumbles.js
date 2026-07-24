export const FUMBLE_DICE_TYPES = Object.freeze([4, 6, 8, 10, 12, 20, 100]);

export const FUMBLE_CATEGORIES = Object.freeze([
  { id: 'melee', label: 'Melee' },
  { id: 'spell', label: 'Spell' },
  { id: 'social', label: 'Social' },
  { id: 'skillExploration', label: 'Skill & Exploration' },
]);

const DEFAULT_ENTRIES = Object.freeze({
  melee: Object.freeze({
    1: 'You hit yourself.',
    2: 'Your weapon flies 15 ft away.',
    3: 'You fall prone.',
    4: 'You strike the nearest ally.',
    5: 'Your weapon lodges in something; STR check to free it.',
    6: "You're off balance; you have disadvantage on your next turn.",
  }),
  spell: Object.freeze({
    1: 'The spell hits a random creature in range.',
    2: 'The spell fizzles, and you take 1d6 backlash damage.',
    3: 'Wrong target.',
    4: 'Half effect.',
    5: 'You are deafened for 1 round.',
    6: 'The spell goes off on your next turn instead.',
  }),
  social: Object.freeze({
    1: 'You insult their family.',
    2: 'You blurt out a secret.',
    3: 'You offend their god.',
    4: "You promise something you can't keep.",
    5: 'They lie back—convincingly.',
    6: 'The worst possible person overhears.',
  }),
  skillExploration: Object.freeze({
    1: 'Your tool snaps.',
    2: 'You slip and fall.',
    3: 'You alert nearby enemies.',
    4: 'You drop an item.',
    5: 'You leave an obvious trail.',
    6: "You're stuck for 1 round.",
  }),
});

export function createDefaultFumbleCategory(categoryId) {
  return {
    dice: { 6: 1 },
    entries: { ...(DEFAULT_ENTRIES[categoryId] || {}) },
  };
}

export function createDefaultFumbleTables() {
  return Object.fromEntries(FUMBLE_CATEGORIES.map(({ id }) => [id, createDefaultFumbleCategory(id)]));
}

export function normalizeFumbleDice(value) {
  const dice = {};
  FUMBLE_DICE_TYPES.forEach((faces) => {
    const count = Math.max(0, Math.trunc(Number(value?.[faces]) || 0));
    if (count) dice[faces] = count;
  });
  return Object.keys(dice).length ? dice : { 6: 1 };
}

export function normalizeFumbleTables(value) {
  const defaults = createDefaultFumbleTables();
  if (!value || typeof value !== 'object') return defaults;

  return Object.fromEntries(FUMBLE_CATEGORIES.map(({ id }) => {
    const source = value[id];
    if (!source || typeof source !== 'object') return [id, defaults[id]];
    const entries = {};
    if (source.entries && typeof source.entries === 'object') {
      Object.entries(source.entries).forEach(([result, text]) => {
        if (/^\d+$/.test(result)) entries[result] = String(text ?? '');
      });
    }
    return [id, {
      dice: normalizeFumbleDice(source.dice),
      entries,
    }];
  }));
}

export function fumbleDiceCount(dice) {
  return FUMBLE_DICE_TYPES.reduce((sum, faces) => sum + (Number(dice?.[faces]) || 0), 0);
}

export function getFumbleRange(dice) {
  const normalized = normalizeFumbleDice(dice);
  const min = fumbleDiceCount(normalized);
  const max = FUMBLE_DICE_TYPES.reduce(
    (sum, faces) => sum + (Number(normalized[faces]) || 0) * faces,
    0,
  );
  return { min, max, count: max - min + 1 };
}

export function buildFumbleFormula(dice) {
  const normalized = normalizeFumbleDice(dice);
  return FUMBLE_DICE_TYPES
    .filter((faces) => normalized[faces])
    .map((faces) => `${normalized[faces]}d${faces}`)
    .join('+');
}

export function fumbleResultValues(dice) {
  const { min, max } = getFumbleRange(dice);
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}
