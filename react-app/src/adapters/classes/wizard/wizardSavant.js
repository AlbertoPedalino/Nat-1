export function addWizardSavantSpellChoices(specs, lv, cfg) {
  if (!Array.isArray(specs) || !cfg || !cfg.key || !cfg.school || !cfg.label) return;
  if (lv >= 3) {
    specs.push({
      key: `subclass_${cfg.key}_savant_initial`,
      label: `${cfg.label} Savant - 2 free spells`,
      type: 'spell_choice',
      spellFilter: { spellLevels: [0, 1, 2], classes: ['Wizard'], schools: [cfg.school] },
      count: 2,
      level: 3,
      spellbookGrant: 'wizard'
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
  ].forEach(function (item) {
    if (lv < item.level) return;
    specs.push({
      key: `subclass_${cfg.key}_savant_lv${item.level}`,
      label: `${cfg.label} Savant - Spell Lv.${item.spellLevel}`,
      type: 'spell_choice',
      spellFilter: { spellLevel: item.spellLevel, classes: ['Wizard'], schools: [cfg.school] },
      count: 1,
      level: item.level,
      spellbookGrant: 'wizard'
    });
  });
}
