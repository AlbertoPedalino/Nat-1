// Single source for a spell's header meta (Casting Time / Range / Components /
// Duration). Both the builder selection panel and the sheet spell card derive
// their meta line + meta grid from here, so the format lives in one place.
//
// Inputs are normalized spells (normalizeSpellRecord) but every field keeps a
// raw-shape fallback (spell.time / spell.range / spell.duration / components)
// so un-normalized 5etools records still render.

// 5etools single-letter school codes → full names (V = Evocation, E = Enchantment).
const SCHOOL_NAMES = {
  A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment',
  V: 'Evocation', I: 'Illusion', N: 'Necromancy', T: 'Transmutation',
};

function formatSchool(spell) {
  if (spell?.schoolFull) return spell.schoolFull;
  const raw = spell?.school;
  if (!raw) return '';
  return SCHOOL_NAMES[String(raw).toUpperCase()] || raw;
}

function formatComponents(components) {
  if (!components || typeof components !== 'object') return '';
  return [components.v ? 'V' : null, components.s ? 'S' : null, components.m ? 'M' : null].filter(Boolean).join(', ');
}

function formatMaterial(material) {
  if (!material) return '';
  if (typeof material === 'string') return material;
  if (typeof material === 'object') return material.text || material.name || '';
  return '';
}

function formatSpellField(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(formatSpellField).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    if (value.type && value.amount) return `${value.amount} ${value.type}`;
    if (value.distance) return formatSpellField(value.distance);
    if (value.unit && value.number) return `${value.number} ${value.unit}`;
    if (value.type) return String(value.type);
  }
  return '';
}

// The four canonical meta values, each already resolved to a display string.
export function getSpellMetaFields(spell) {
  const time = spell?.castingTimeLabel || spell?.castingTime || (spell?.time?.[0] ? `${spell.time[0].number || 1} ${spell.time[0].unit}` : '');
  const range = spell?.rangeLabel || spell?.rangeText || formatSpellField(spell?.range);
  const componentsBase = spell?.componentsLabel || formatComponents(spell?.components);
  const material = spell?.materialLabel || formatMaterial(spell?.components?.m);
  const components = componentsBase && material ? `${componentsBase} (${material})` : componentsBase;
  const duration = spell?.durationLabel || spell?.durationText || formatSpellField(spell?.duration);
  return { time, range, components, duration };
}

const SAVE_ABBR = {
  strength: 'STR', dexterity: 'DEX', constitution: 'CON',
  intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA',
};
const SPELL_ATTACK_LABELS = { M: 'Melee', R: 'Ranged' };
const AREA_LABELS = {
  ST: 'Single target', MT: 'Multiple targets', R: 'Circle', N: 'Cone',
  C: 'Cube', Y: 'Cylinder', H: 'Hemisphere', L: 'Line', S: 'Sphere',
  Q: 'Square', W: 'Wall',
};

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
    .map((s) => SAVE_ABBR[String(s).toLowerCase()] || titleCase(s))
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

// Compact single-line meta for collapsed rows. `includeSchool` prepends the
// spell school (builder list rows show it; the sheet card does not).
export function getSpellMetaLine(spell, { includeSchool = false } = {}) {
  const { time, range, components, duration } = getSpellMetaFields(spell);
  const school = includeSchool ? formatSchool(spell) : null;
  return [school, time, range, components, duration].filter(Boolean).join(' - ');
}
