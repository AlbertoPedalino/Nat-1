// Druid Wild Shape — active form state + stat overrides.
//
// When a Druid transforms, the resolved beast snapshot is stored directly on the
// character at `C.wildShape` (so stat/AC/HP consumers never need the beast DB at
// compute time). This module is the single accessor + override layer; consumers
// (getFinal, ac, sheet state, actions) branch only through these helpers, so the
// transform logic lives in one place.
//
// Shape of `C.wildShape` (null when not transformed):
//   { beast: <normalizeBeast snapshot> }   // name, abilities, ac, hp, actions…
// RAW 2024: a transformed Druid keeps their own Hit Points — the beast's HP is
// NOT a separate pool. Assuming a form only grants Temporary HP equal to the
// Druid's level, so HP/maxHP are untouched here.

const PHYSICAL_ABILITIES = new Set(['str', 'dex', 'con']);

export function getActiveWildShape(C) {
  const ws = C?.wildShape;
  return ws && ws.beast ? ws : null;
}

export function isWildShaped(C) {
  return getActiveWildShape(C) != null;
}

// Equipment merges into a Wild Shape form (RAW 2024), so item-derived effects are
// suppressed while transformed. Item-bonus consumers route their inventory through
// this single helper instead of each re-checking the form state — keeps the rule
// in one place and makes new consumers correct by default. Returns an empty list
// while shaped, the inventory unchanged otherwise.
export function itemEffectInventory(C, inventory) {
  return isWildShaped(C) ? [] : (inventory || []);
}

// Beast physical ability score while transformed (mental scores stay the
// character's). Returns null when not transformed or the stat isn't physical.
export function wildShapeAbilityScore(C, stat) {
  const ws = getActiveWildShape(C);
  if (!ws) return null;
  const key = String(stat || '').toLowerCase();
  if (!PHYSICAL_ABILITIES.has(key)) return null;
  const score = ws.beast.abilities?.[key];
  return Number.isFinite(score) ? score : null;
}

// The active form's listed saving-throw bonus for `stat`, or null when not
// transformed / the form lists no save for that ability. The value is the beast
// stat block's final number (its own modifier + proficiency already baked in).
// RAW 2024: getSaveBonus uses it only when higher than your own (the "higher-of"
// rule), so it's a candidate bonus, not a replacement.
export function wildShapeSaveBonus(C, stat) {
  const ws = getActiveWildShape(C);
  if (!ws) return null;
  const key = String(stat || '').toLowerCase();
  const v = ws.beast.saves?.[key];
  return Number.isFinite(v) ? v : null;
}

// Whether the active beast form lists a saving-throw bonus for `stat` (drives the
// proficiency marker; the form's proficiencies are gained in addition to yours).
export function wildShapeSaveProficient(C, stat) {
  return wildShapeSaveBonus(C, stat) != null;
}

// The active form's listed skill bonus for `skillName`, or null. Like saves, the
// value is the beast stat block's final number, used when higher than your own.
export function wildShapeSkillBonus(C, skillName) {
  const ws = getActiveWildShape(C);
  if (!ws) return null;
  const key = String(skillName || '').toLowerCase().replace(/[^a-z]/g, '');
  const v = ws.beast.skills?.[key];
  return Number.isFinite(v) ? v : null;
}

// Build the `C.wildShape` patch for assuming a beast form. Caller (sheet panel)
// merges the returned patch into the character via onUpdateCharacter.
// RAW 2024: HP/maxHP are untouched (you keep your own); the form only grants
// Temporary HP equal to your Druid level. Temp HP doesn't stack, so keep the
// larger of any existing temp HP and the new grant (also handles re-transforming
// after the form's temp HP took damage).
export function enterWildShapePatch(C, beast, druidLevel) {
  if (!beast) return null;
  const granted = Math.max(0, Number(druidLevel) || 0);
  const tempHP = Math.max(Number(C?.tempHP || 0), granted);
  return {
    wildShape: { beast },
    tempHP,
  };
}

// Build the patch for reverting to the character's own form. Your HP was never
// replaced, so there's nothing to restore — just end the form. Temporary HP
// persists like any other temp HP (it isn't tied to staying in the form), so
// it's intentionally left untouched.
export function exitWildShapePatch() {
  return { wildShape: null };
}
