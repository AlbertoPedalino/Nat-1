// The spell catalog: the compendium's spells with the filters of a spell list
// (level, school, class, casting time, concentration, ritual, source).
//
// Pure; the page is SpellCatalog.jsx.

import { SPELL_SCHOOL_NAMES } from '../../shared/content/rulesVocabulary.js';
import { runCatalogFilter } from './catalogFilter.js';

export const SPELL_LEVELS = Object.freeze([
  { key: '0', label: 'Cantrip' },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({
    key: String(level),
    label: `Level ${level}`,
  })),
]);

export const SPELL_SCHOOLS = Object.freeze(Object.values(SPELL_SCHOOL_NAMES).map((school) => ({ key: school, label: school })));

export const SPELL_CLASSES = Object.freeze(
  ['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard']
    .map((name) => ({ key: name.toLowerCase(), label: name })),
);

export const CASTING_TIMES = Object.freeze([
  { key: 'action', label: 'Action' },
  { key: 'bonus', label: 'Bonus Action' },
  { key: 'reaction', label: 'Reaction' },
  { key: 'longer', label: '1 Minute or More' },
]);

// Which list a spell is on, from the class spell index loadSpells builds, its
// lists made sets ({ wizard: Set('fireball', …) }).
export function spellClasses(spell, classSpellIndex = {}) {
  const name = String(spell?.name || '').toLowerCase();
  return SPELL_CLASSES.filter(({ key }) => classSpellIndex[key]?.has?.(name)).map(({ key }) => key);
}

export function castingTimeKind(spell) {
  const unit = String(spell?.time?.[0]?.unit || '').toLowerCase();
  if (unit === 'action' || unit === 'bonus' || unit === 'reaction') return unit;
  return unit ? 'longer' : '';
}

export const SPELL_FILTERS = Object.freeze({
  search: '', level: 'all', school: 'all', class: 'all', time: 'all', concentration: 'any', ritual: 'any', source: 'all', sort: 'level',
});

export function filterSpells(entries, filters = SPELL_FILTERS) {
  return runCatalogFilter(entries, filters, SPELL_FILTERS, {
    tests: (f) => [
      (spell) => f.level === 'all' || String(Number(spell.level) || 0) === f.level,
      (spell) => f.school === 'all' || spell.schoolFull === f.school,
      (spell, entry) => f.class === 'all' || (entry.classes || []).includes(f.class),
      (spell) => f.time === 'all' || castingTimeKind(spell) === f.time,
      (spell) => f.concentration === 'any' || Boolean(spell.concentration) === (f.concentration === 'yes'),
      (spell) => f.ritual === 'any' || Boolean(spell.ritual) === (f.ritual === 'yes'),
    ],
    sorts: { level: (a, b) => (Number(a.record.level) || 0) - (Number(b.record.level) || 0) },
  });
}

export function spellLevelLabel(spell) {
  const level = Number(spell?.level) || 0;
  return level ? String(level) : 'Cantrip';
}
