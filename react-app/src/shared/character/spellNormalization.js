import { strip5eMarkup } from './spellEntries.js';
import { SPELL_SOURCE_PRIORITY, sourceRank } from './sourcePriority.js';

const SCHOOL_FULL = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
};

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function title(value) {
  const text = String(value || '').replace(/_/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function unitLabel(unit, amount) {
  const raw = String(unit || '').toLowerCase();
  if (raw === 'feet' || raw === 'foot') return 'ft';
  if (raw === 'mile' || raw === 'miles') return Number(amount) === 1 ? 'mile' : 'miles';
  if (raw === 'hour' || raw === 'hours') return Number(amount) === 1 ? 'hour' : 'hours';
  if (raw === 'minute' || raw === 'minutes') return Number(amount) === 1 ? 'minute' : 'minutes';
  if (raw === 'round' || raw === 'rounds') return Number(amount) === 1 ? 'round' : 'rounds';
  if (raw === 'day' || raw === 'days') return Number(amount) === 1 ? 'day' : 'days';
  return raw || '';
}

function formatDistance(distance) {
  if (!distance || typeof distance !== 'object') return '';
  const type = String(distance.type || '').toLowerCase();
  if (['self', 'touch', 'sight', 'unlimited', 'special'].includes(type)) return title(type);
  const amount = distance.amount ?? '';
  const unit = unitLabel(type, amount);
  return amount !== '' ? `${amount} ${unit}`.trim() : title(unit || type);
}

export function formatSpellRange(range) {
  if (!range) return '';
  if (typeof range === 'string') return strip5eMarkup(range);
  if (typeof range !== 'object') return '';
  const type = String(range.type || '').toLowerCase();
  if (type === 'point') return formatDistance(range.distance) || 'Point';
  if (['self', 'touch', 'sight', 'unlimited', 'special'].includes(type)) return title(type);
  const distance = formatDistance(range.distance);
  return [distance, title(type)].filter(Boolean).join(' ') || title(type);
}

export function formatCastingTime(time) {
  return asArray(time).map((entry) => {
    if (!entry || typeof entry !== 'object') return '';
    const number = entry.number ?? 1;
    const unit = String(entry.unit || '').toLowerCase();
    const base = `${number} ${title(unit)}`.trim();
    const condition = entry.condition ? ` (${strip5eMarkup(entry.condition)})` : '';
    return `${base}${condition}`;
  }).filter(Boolean).join(', ');
}

export function formatMaterialComponent(material) {
  if (!material) return '';
  if (typeof material === 'string') return strip5eMarkup(material);
  if (typeof material !== 'object') return '';
  return strip5eMarkup(material.text || material.name || '');
}

export function formatSpellComponents(components) {
  if (!components || typeof components !== 'object') return '';
  return [
    components.v ? 'V' : null,
    components.s ? 'S' : null,
    components.m ? 'M' : null,
  ].filter(Boolean).join(', ');
}

function formatDurationEntry(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const type = String(entry.type || '').toLowerCase();
  if (type === 'instant') return 'Instantaneous';
  if (type === 'special') return 'Special';
  if (type === 'permanent') return 'Until dispelled';
  if (!entry.duration) return title(type);
  const amount = entry.duration.amount ?? '';
  const unit = unitLabel(entry.duration.type, amount);
  const base = amount !== '' ? `${amount} ${unit}` : title(unit || entry.duration.type);
  return entry.concentration ? `Concentration, up to ${base}` : base;
}

export function formatSpellDuration(duration) {
  return asArray(duration).map(formatDurationEntry).filter(Boolean).join(', ');
}

export function spellHasConcentration(spell) {
  if (!spell || typeof spell !== 'object') return false;
  if (spell.concentration === true) return true;
  return asArray(spell.duration).some((entry) => entry?.concentration === true || entry?.duration?.concentration === true);
}

export function spellHasRitual(spell) {
  if (!spell || typeof spell !== 'object') return false;
  return Boolean(spell.ritual || spell.meta?.ritual);
}

export function normalizeSpellRecord(rawSpell) {
  const raw = rawSpell && typeof rawSpell === 'object' ? rawSpell : {};
  const materialLabel = formatMaterialComponent(raw.components?.m);
  const componentsLabel = formatSpellComponents(raw.components);
  const concentration = spellHasConcentration(raw);
  const ritual = spellHasRitual(raw);
  const castingTimeLabel = raw.castingTimeLabel || raw.castingTime || formatCastingTime(raw.time);
  const rangeLabel = raw.rangeLabel || raw.rangeText || formatSpellRange(raw.range);
  const durationLabel = raw.durationLabel || raw.durationText || formatSpellDuration(raw.duration);

  return {
    ...raw,
    name: String(raw.name || '').trim(),
    source: String(raw.source || '').trim(),
    level: Number(raw.level || 0),
    isCantrip: Number(raw.level || 0) === 0,
    schoolFull: raw.schoolFull || SCHOOL_FULL[String(raw.school || '')] || String(raw.school || ''),
    castingTimeLabel,
    castingTime: raw.castingTime || castingTimeLabel,
    rangeLabel,
    rangeText: raw.rangeText || rangeLabel,
    componentsLabel,
    materialLabel,
    durationLabel,
    durationText: raw.durationText || durationLabel,
    concentration,
    ritual,
    isConcentration: concentration,
    isRitual: ritual,
    descriptionEntries: raw.descriptionEntries || raw.entries || [],
    higherLevelEntries: raw.higherLevelEntries || raw.entriesHigherLevel || null,
  };
}

function richness(spell) {
  return [
    asArray(spell.entries).length,
    asArray(spell.entriesHigherLevel).length,
    spell.materialLabel ? 1 : 0,
    spell.hasFluffImages ? 1 : 0,
  ].reduce((sum, value) => sum + Number(value || 0), 0);
}

export function dedupeSpellsBySourcePriority(spells) {
  const byName = new Map();
  asArray(spells).forEach((spell) => {
    if (!spell?.name) return;
    const key = norm(spell.name);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, spell);
      return;
    }
    const incomingRank = sourceRank(spell.source, SPELL_SOURCE_PRIORITY);
    const existingRank = sourceRank(existing.source, SPELL_SOURCE_PRIORITY);
    if (incomingRank < existingRank || (incomingRank === existingRank && richness(spell) > richness(existing))) {
      byName.set(key, spell);
    }
  });
  return [...byName.values()];
}
