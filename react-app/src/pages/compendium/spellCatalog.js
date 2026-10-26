// The spell catalog: the compendium's spells with the filters of a spell list
// (level, school, class, casting time, concentration, ritual, source).
//
// Pure; the page is SpellCatalog.jsx.

import { normalizeSearchText } from '../../shared/content/searchText.js';

export const SPELL_LEVELS = Object.freeze([
  { key: '0', label: 'Cantrip' },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({
    key: String(level),
    label: `Level ${level}`,
  })),
]);

export const SPELL_SCHOOLS = Object.freeze(
  ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']
    .map((school) => ({ key: school, label: school })),
);

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
  const f = { ...SPELL_FILTERS, ...filters };
  const terms = normalizeSearchText(f.search).split(' ').filter(Boolean);
  const list = entries.filter((entry) => {
    const spell = entry.record;
    if (terms.length && !terms.every((term) => entry.nameText.includes(term))) return false;
    if (f.level !== 'all' && String(Number(spell.level) || 0) !== f.level) return false;
    if (f.school !== 'all' && spell.schoolFull !== f.school) return false;
    if (f.class !== 'all' && !(entry.classes || []).includes(f.class)) return false;
    if (f.time !== 'all' && castingTimeKind(spell) !== f.time) return false;
    if (f.concentration !== 'any' && Boolean(spell.concentration) !== (f.concentration === 'yes')) return false;
    if (f.ritual !== 'any' && Boolean(spell.ritual) !== (f.ritual === 'yes')) return false;
    if (f.source !== 'all' && entry.source !== f.source) return false;
    return true;
  });
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (f.sort === 'level') return list.sort((a, b) => (Number(a.record.level) || 0) - (Number(b.record.level) || 0) || byName(a, b));
  return list.sort(byName);
}

export function spellLevelLabel(spell) {
  const level = Number(spell?.level) || 0;
  return level ? String(level) : 'Cantrip';
}
