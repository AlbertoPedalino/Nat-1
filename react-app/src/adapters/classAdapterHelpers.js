// Choice specs several class adapters share. Lives outside classes/ so the
// adapter loader does not install it as an adapter module.

// Wizard subclass Savant (XPHB 2024): at level 3, two Wizard spells of the
// school (levels 1-2: cantrips are not kept in a spellbook) added to the
// spellbook for free; then one more of the school each time a new spell slot
// level opens.
export function addWizardSavantSpellChoices(specs, lv, cfg) {
  if (!Array.isArray(specs) || !cfg || !cfg.key || !cfg.school || !cfg.label) return;
  if (lv >= 3) {
    specs.push({
      key: `subclass_${cfg.key}_savant_initial`,
      label: `${cfg.label} Savant - 2 free spells`,
      type: 'spell_choice',
      spellFilter: { spellLevels: [1, 2], classes: ['Wizard'], schools: [cfg.school] },
      count: 2,
      level: 3,
      spellbookGrant: 'wizard',
    });
  }
  [
    { level: 5, spellLevel: 3 },
    { level: 7, spellLevel: 4 },
    { level: 9, spellLevel: 5 },
    { level: 11, spellLevel: 6 },
    { level: 13, spellLevel: 7 },
    { level: 15, spellLevel: 8 },
    { level: 17, spellLevel: 9 },
  ].forEach((item) => {
    if (lv < item.level) return;
    specs.push({
      key: `subclass_${cfg.key}_savant_lv${item.level}`,
      label: `${cfg.label} Savant - Spell Lv.${item.spellLevel}`,
      type: 'spell_choice',
      spellFilter: { spellLevel: item.spellLevel, classes: ['Wizard'], schools: [cfg.school] },
      count: 1,
      level: item.level,
      spellbookGrant: 'wizard',
    });
  });
}

// A value that grows with a class's level, from its class table:
// `rows` is [[minLevel, value], …] in ascending order.
export function levelTable(level, rows) {
  const lv = Number(level || 1);
  let value = rows[0][1];
  rows.forEach(([minLevel, rowValue]) => { if (lv >= minLevel) value = rowValue; });
  return value;
}

// Monk Martial Arts die (faces), also the Mercy and Elements dice.
export const MARTIAL_ARTS_DIE = Object.freeze([[1, 6], [5, 8], [11, 10], [17, 12]]);
// Psionic Energy Dice (Psi Warrior, Soulknife): faces, and how many.
export const PSIONIC_DIE = Object.freeze([[1, 6], [5, 8], [11, 10], [17, 12]]);
export const PSIONIC_DICE_COUNT = Object.freeze([[1, 4], [5, 6], [9, 8], [13, 10], [17, 12]]);
