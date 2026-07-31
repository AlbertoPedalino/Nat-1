// Shared helper for collecting ASI (Ability Score Improvement) bonuses from feat choices.
// Supports multiple formats for retroactive compatibility.

const VALID_STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function normalizeStat(value) {
  const s = String(value || '').toLowerCase().trim();
  return VALID_STATS.includes(s) ? s : null;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return [];
}

/**
 * Collects all ASI bonuses from character choices.
 * Supports multiple formats:
 * 1. Single ASI: feat_asi_lv4_asi = ["int"]
 * 2. Split ASI: feat_asi_lv4_first_asi = ["str"], feat_asi_lv4_second_asi = ["con"]
 * 3. Double ASI: feat_asi_lv4_first_asi = ["str"], feat_asi_lv4_second_asi = ["str"]
 * 4. Legacy format: feat_asi_lv4_asi_picks = ["str", "con"]
 *
 * Returns an object mapping stat → total bonus
 * Example: { str: 1, int: 2, con: 1 }
 */
export function collectFeatAsiBonuses(character) {
  const bonuses = {};
  const choices = character?.choices || {};

  // Track processed slots to avoid double-counting
  const processed = new Set();

  Object.entries(choices).forEach(([key, value]) => {
    // Skip non-ASI choices
    if (!key.includes('_asi')) return;

    const values = asArray(value);
    if (!values.length) return;

    // Format 1: Single ASI (feat_asi_lv4_asi = ["int"])
    if (key.match(/^(mc\d+_)?feat_asi_lv\d+_asi$/) && !key.includes('picks') && !key.includes('_first') && !key.includes('_second')) {
      values.forEach((v) => {
        const stat = normalizeStat(v);
        if (stat) bonuses[stat] = (bonuses[stat] || 0) + 1;
      });
      return;
    }

    // Format 2 & 3: Split or Double ASI
    // These come in pairs: feat_asi_lv4_first_asi and feat_asi_lv4_second_asi
    const match = key.match(/^(mc\d+_)?feat_asi_lv(\d+)_(first|second)_asi$/);
    if (match) {
      const slotPrefix = key.replace(/_(first|second)_asi$/, '');

      // Avoid double-processing by marking the slot as processed
      if (processed.has(slotPrefix)) return;
      processed.add(slotPrefix);

      const firstKey = `${slotPrefix}_first_asi`;
      const secondKey = `${slotPrefix}_second_asi`;

      const firstVal = asArray(choices[firstKey]).map(normalizeStat).filter(Boolean);
      const secondVal = asArray(choices[secondKey]).map(normalizeStat).filter(Boolean);
      const first = firstVal[0] || null;
      const second = secondVal[0] || null;

      if (first && second) {
        if (first === second) {
          // Double ASI: both selections are same stat → +2
          bonuses[first] = (bonuses[first] || 0) + 2;
        } else {
          // Split ASI: selections are different stats → +1 each
          bonuses[first] = (bonuses[first] || 0) + 1;
          bonuses[second] = (bonuses[second] || 0) + 1;
        }
      } else if (first) {
        // Only first selected
        bonuses[first] = (bonuses[first] || 0) + 1;
      } else if (second) {
        // Only second selected
        bonuses[second] = (bonuses[second] || 0) + 1;
      }
      return;
    }

    // Format 4: Legacy format (feat_asi_lv4_asi_picks = ["str", "con"])
    if (key.match(/^(mc\d+_)?feat_asi_lv\d+_asi_picks$/)) {
      values.forEach((v) => {
        const stat = normalizeStat(v);
        if (stat) bonuses[stat] = (bonuses[stat] || 0) + 1;
      });
      return;
    }
  });

  return bonuses;
}

/**
 * Get ASI bonus for a specific stat.
 * Returns 0 if no bonus, otherwise returns the total bonus (+1, +2, etc).
 */
export function getFeatAsiBonus(character, stat) {
  const normalizedStat = normalizeStat(stat);
  if (!normalizedStat) return 0;
  const bonuses = collectFeatAsiBonuses(character);
  return bonuses[normalizedStat] || 0;
}

/**
 * Get breakdown of all ASI bonuses with sources.
 * Useful for UI displaying where bonuses come from.
 */
export function getAsiBonusBreakdown(character) {
  const choices = character?.choices || {};
  const bonuses = collectFeatAsiBonuses(character);
  const breakdown = [];

  Object.entries(choices).forEach(([key, value]) => {
    if (!key.includes('_asi')) return;
    if (!value || (Array.isArray(value) && !value.length)) return;

    // Single ASI format
    if (key.match(/^(mc\d+_)?feat_asi_lv(\d+)_asi$/) && !key.includes('picks') && !key.includes('_first') && !key.includes('_second')) {
      const level = key.match(/lv(\d+)/)[1];
      const values = asArray(value);
      values.forEach((v) => {
        const stat = normalizeStat(v);
        if (stat) breakdown.push({ source: `Feat (Lv.${level})`, stat, bonus: 1 });
      });
      return;
    }

    // Split/Double ASI format
    const match = key.match(/^(mc\d+_)?feat_asi_lv(\d+)_(first|second)_asi$/);
    if (match) {
      const level = match[2];
      const slotPrefix = key.replace(/_(first|second)_asi$/, '');

      // Only process on first occurrence to avoid duplicates
      if (key.includes('_first_')) {
        const firstVal = asArray(choices[`${slotPrefix}_first_asi`]).map(normalizeStat).filter(Boolean);
        const secondVal = asArray(choices[`${slotPrefix}_second_asi`]).map(normalizeStat).filter(Boolean);

        if (firstVal.length === 1 && secondVal.length === 1) {
          const first = firstVal[0];
          const second = secondVal[0];
          const bonus = first === second ? 2 : 1;
          if (first === second) {
            breakdown.push({ source: `Feat (Lv.${level})`, stat: first, bonus });
          } else {
            breakdown.push({ source: `Feat (Lv.${level})`, stat: first, bonus: 1 });
            breakdown.push({ source: `Feat (Lv.${level})`, stat: second, bonus: 1 });
          }
        }
      }
      return;
    }

    // Legacy format
    if (key.match(/^(mc\d+_)?feat_asi_lv(\d+)_asi_picks$/)) {
      const level = key.match(/lv(\d+)/)[1];
      const values = asArray(value);
      values.forEach((v) => {
        const stat = normalizeStat(v);
        if (stat) breakdown.push({ source: `Feat (Lv.${level})`, stat, bonus: 1 });
      });
      return;
    }
  });

  return breakdown;
}
