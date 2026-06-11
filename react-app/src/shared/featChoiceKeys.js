const FEAT_DETAIL_SUFFIXES = [
  'entry',
  'skill',
  'lang',
  'language',
  'tool',
  'instrument',
  'asi',
  'ability',
  'spell_ability',
  'damage',
  'weapon',
  'weapon_mastery',
  'skill_tool',
  'skill_tool_language',
];

const FEAT_DETAIL_REGEX = new RegExp(
  `_(${FEAT_DETAIL_SUFFIXES.join('|')})(?:_\\d+)?$`,
  'i',
);

const COMPACT_DETAIL_TOKENS = [
  'asipicks',
  'firstasi',
  'secondasi',
  'spellability',
];

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isFeatKey(key) {
  const k = compact(key);
  return k.includes('feat') || k.includes('boon') || k.includes('fightingstyle');
}

export function isFeatDetailKey(key) {
  if (!isFeatKey(key)) return false;
  const raw = String(key || '');
  if (FEAT_DETAIL_REGEX.test(raw)) return true;
  if (raw.includes('_spell_')) return true;
  const k = compact(key);
  return COMPACT_DETAIL_TOKENS.some((token) => k.includes(token));
}

// Which entity granted a feat slot, derived from its choice-key convention:
// background origin feat ('feat_origin*', 'bg_*'), species feat
// ('species_origin_feat*'), or a free feat slot (ASI etc.). Single home for
// these prefixes — color coding and choice partitioning both key off it.
export function featSlotOrigin(key) {
  const k = String(key || '');
  if (k === 'feat_origin' || k.startsWith('feat_origin_') || k.startsWith('bg_')) return 'background';
  if (k === 'species_origin_feat' || k.startsWith('species_origin_feat_')) return 'species';
  return 'feat';
}
