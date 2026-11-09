// The spell catalog: the compendium's spells with the filters of a spell list.
// Pure; its columns are in catalogColumns.jsx.

import { SPELL_SCHOOL_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { SPELL_LEVEL_LABELS } from '../../../shared/character/spells/spellTables.js';
import { spellCastUnit } from '../../../shared/character/spells/spellMeta.js';
import { titleCase } from '../../../shared/ui/textCase.js';

export const SPELL_LEVELS = Object.freeze(SPELL_LEVEL_LABELS.map((label, level) => ({
  key: String(level),
  label: level ? `${label} level` : label,
})));

export const SPELL_SCHOOLS = Object.freeze(Object.values(SPELL_SCHOOL_NAMES).map((school) => ({ key: school, label: school })));

// The units spellCastUnit says, by name.
export const CASTING_TIMES = Object.freeze([
  { key: 'action', label: 'Action' },
  { key: 'bonus', label: 'Bonus Action' },
  { key: 'reaction', label: 'Reaction' },
  { key: 'other', label: '1 Minute or More' },
]);

// Which class lists a spell is on, from the class spell index loadSpells
// builds, its lists made sets ({ wizard: Set('fireball', …) }).
export function spellClasses(spell, classSpellIndex = {}) {
  const name = String(spell?.name || '').toLowerCase();
  return Object.keys(classSpellIndex).filter((key) => classSpellIndex[key]?.has?.(name)).sort();
}

// "3rd", or "Cantrip".
export function spellLevelLabel(spell) {
  return SPELL_LEVEL_LABELS[Number(spell?.level) || 0];
}

export const SPELL_CATALOG = Object.freeze({
  key: 'spells',
  label: 'spells',
  select: (entry) => entry.kind === 'spell',
  fields: [
    { kind: 'select', key: 'level', label: 'Level', options: SPELL_LEVELS, valueOf: (spell) => String(Number(spell.level) || 0) },
    { kind: 'select', key: 'school', label: 'School', options: SPELL_SCHOOLS, valueOf: (spell) => spell.schoolFull },
    {
      kind: 'select',
      key: 'class',
      label: 'Class',
      // The classes the loaded spell lists name.
      options: (entries) => [...new Set(entries.flatMap((entry) => entry.classes || []))].sort()
        .map((key) => ({ key, label: titleCase(key) })),
      valueOf: (spell, entry) => entry.classes || [],
    },
    { kind: 'select', key: 'time', label: 'Casting Time', options: CASTING_TIMES, valueOf: spellCastUnit },
    { kind: 'yesNo', key: 'concentration', label: 'Concentration', test: (spell) => spell.concentration },
    { kind: 'yesNo', key: 'ritual', label: 'Ritual', test: (spell) => spell.ritual },
  ],
  sorts: [
    { key: 'level', label: 'Level', compare: (a, b) => (Number(a.record.level) || 0) - (Number(b.record.level) || 0) },
    { key: 'name', label: 'Name' },
  ],
});
