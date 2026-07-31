// Maps a feat's `additionalSpells` lists (5etools shape: one entry per class
// spell list, e.g. Magic Initiate's Cleric/Druid/Wizard) to the index that a
// background's `classHint` selects. Single source of truth shared by:
//   - the background reducer (handleBackgroundSelect) that pre-fills the choice,
//   - the builder UI (FeatChoicesPanel) that locks the list when a hint exists.
// Keeping one matcher means "which list does Acolyte → Magic Initiate pick?"
// can never drift between the stored choice and what the UI shows as locked.
//
// Returns the matching index, or -1 when there is no hint / no match (free pick).
export function findSpellListEntryIndexByClass(additionalSpells, classHint) {
  const hint = String(classHint || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!hint || !Array.isArray(additionalSpells)) return -1;
  return additionalSpells.findIndex((entry) => {
    const sources = [];
    ['known', 'innate', 'prepared', 'expanded'].forEach((mode) => {
      const section = entry?.[mode];
      if (!section) return;
      Object.values(section).forEach((items) => {
        if (!Array.isArray(items)) return;
        items.forEach((spell) => {
          if (typeof spell === 'string') sources.push(spell.split('|')[0]);
        });
      });
    });
    if (entry?.name) sources.push(entry.name);
    return sources.some((source) => String(source).toLowerCase().includes(hint));
  });
}
