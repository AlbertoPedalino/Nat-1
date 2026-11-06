import { titleCase } from '../../ui/textCase.js';
import { ABILITY_ABBREVIATIONS, SPELL_SCHOOL_NAMES, abilityKey } from '../../content/rulesVocabulary.js';
import { formatCastingTime, formatMaterialComponent, formatSpellComponents, formatSpellDuration, formatSpellRange } from './spellNormalization.js';
// Single source for a spell's header meta (Casting Time / Range / Components /
// Duration). Both the builder selection panel and the sheet spell card derive
// their meta line + meta grid from here, so the format lives in one place.
//
// Inputs are normalized spells (normalizeSpellRecord) but every field keeps a
// raw-shape fallback (spell.time / spell.range / spell.duration / components)
// so un-normalized 5etools records still render.

function formatSchool(spell) {
  if (spell?.schoolFull) return spell.schoolFull;
  const raw = spell?.school;
  if (!raw) return '';
  return SPELL_SCHOOL_NAMES[String(raw).toUpperCase()] || raw;
}

// The four canonical meta values, each already resolved to a display string.
// A raw 5etools record is formatted by the same rules normalizeSpellRecord uses.
export function getSpellMetaFields(spell) {
  const time = spell?.castingTimeLabel || spell?.castingTime || formatCastingTime(spell?.time);
  const range = spell?.rangeLabel || spell?.rangeText || formatSpellRange(spell?.range);
  const componentsBase = spell?.componentsLabel || formatSpellComponents(spell?.components);
  const material = spell?.materialLabel || formatMaterialComponent(spell?.components?.m);
  const components = componentsBase && material ? `${componentsBase} (${material})` : componentsBase;
  const duration = spell?.durationLabel || spell?.durationText || formatSpellDuration(spell?.duration);
  return { time, range, components, duration };
}

const SPELL_ATTACK_LABELS = { M: 'Melee', R: 'Ranged' };
const AREA_LABELS = {
  ST: 'Single target', MT: 'Multiple targets', R: 'Circle', N: 'Cone',
  C: 'Cube', Y: 'Cylinder', H: 'Hemisphere', L: 'Line', S: 'Sphere',
  Q: 'Square', W: 'Wall',
};

function formatTagList(values, labelMap) {
  const arr = Array.isArray(values) ? values : [];
  const seen = new Set();
  return arr
    .map((v) => (labelMap ? (labelMap[String(v).toUpperCase()] || titleCase(v)) : titleCase(v)))
    .filter((label) => label && !seen.has(label) && seen.add(label))
    .join(', ');
}

function isRitualSpell(spell) {
  return Boolean(spell?.ritual || spell?.isRitual || spell?.meta?.ritual);
}

// Label/value pairs for a meta grid (sheet card + builder expanded body).
export function getSpellMetaSegments(spell) {
  const { time, range, components, duration } = getSpellMetaFields(spell);
  // Ritual is compressed into the casting time row rather than its own line.
  const castingTime = time ? (isRitualSpell(spell) ? `${time} (Ritual)` : time) : '';
  const saves = (Array.isArray(spell?.savingThrow) ? spell.savingThrow : [])
    .map((s) => ABILITY_ABBREVIATIONS[abilityKey(s)] || titleCase(s))
    .filter(Boolean)
    .join(', ');
  const attack = formatTagList(spell?.spellAttack, SPELL_ATTACK_LABELS);
  return [
    { label: 'School', value: formatSchool(spell) },
    { label: 'Casting Time', value: castingTime },
    { label: 'Range', value: range },
    { label: 'Components', value: components },
    { label: 'Duration', value: duration },
    { label: 'Attack', value: attack ? `${attack} spell attack` : '' },
    { label: 'Save', value: saves ? `${saves} save` : '' },
    { label: 'Damage Type', value: formatTagList(spell?.damageInflict) },
    { label: 'Conditions', value: formatTagList(spell?.conditionInflict) },
    { label: 'Area', value: formatTagList(spell?.areaTags, AREA_LABELS) },
  ].filter((segment) => segment.value);
}

