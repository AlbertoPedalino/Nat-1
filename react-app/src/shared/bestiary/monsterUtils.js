import { FALLBACK_MONSTER_TOKEN, GAME_IMAGE_BASE } from '../content/gameData.js';
import { crKey, crXP } from './challengeRating.js';
import { clampInt, numberOr } from '../numbers.js';
import { sizeName } from '../content/rulesVocabulary.js';

export function getType(type) {
  if (!type) return '';
  if (typeof type === 'string') return type;
  if (Array.isArray(type)) return type.map(getType).filter(Boolean).join(' or ');
  if (typeof type === 'object') {
    if (type.type) return getType(type.type);
    if (type.choose) return getType(type.choose);
    if (type.from) return getType(type.from);
    return '';
  }
  return '';
}

export function getTypeTags(type) {
  if (!type || typeof type !== 'object' || !Array.isArray(type.tags)) return '';
  const tags = type.tags
    .map((tag) => {
      if (typeof tag === 'string') return tag;
      if (!tag || typeof tag !== 'object') return '';
      if (tag.prefixHidden) return tag.tag || '';
      return [tag.prefix, tag.tag].filter(Boolean).join(' ');
    })
    .filter(Boolean);
  return tags.length ? ` (${tags.join(', ')})` : '';
}

export function getAC(ac) {
  if (!ac || !ac[0]) return 10;
  const first = ac[0];
  return typeof first === 'number' ? first : first.ac || 10;
}

export function getACDesc(ac) {
  if (!ac || !ac[0] || typeof ac[0] === 'number') return '';
  const from = Array.isArray(ac[0].from) ? ac[0].from.join(', ') : '';
  return from ? ` (${from})` : '';
}

export function getHP(hp) {
  if (!hp) return 1;
  if (typeof hp === 'number') return hp;
  return hp.average || 1;
}

export function getSizeLabel(monster) {
  return sizeName(monster?.size);
}

export function formatAlignment(alignment) {
  if (!alignment) return '';
  if (Array.isArray(alignment)) return alignment.join(' ');
  return String(alignment);
}

// A speed is a number of feet or {number, condition} ("fly 60 ft. (hover)");
// `canHover` and `choose` are flags, not speeds.
export function formatSpeed(speed) {
  if (!speed) return '—';
  return Object.entries(speed)
    .filter(([key, value]) => value && key !== 'canHover' && key !== 'choose')
    .map(([key, value]) => {
      const feet = typeof value === 'object' ? value.number : value;
      if (feet == null || typeof feet === 'object') return '';
      const condition = typeof value === 'object' && value.condition ? ` ${value.condition.replace(/[[\]]/g, '')}` : '';
      return `${key === 'walk' ? '' : `${key} `}${feet} ft.${condition}`;
    })
    .filter(Boolean)
    .join(', ') || '—';
}

export function formatDamageList(value, key) {
  if (!value) return '';
  if (!Array.isArray(value)) return String(value);
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (Array.isArray(item?.[key])) return item[key].join(', ');
      return '';
    })
    .filter(Boolean)
    .join(', ');
}

export function monsterKey(monster) {
  return `${monster?.name || ''}__${monster?.source || ''}`;
}

export function getMonsterTokenUrls(monster) {
  if (!monster?.name || !monster?.source) return [FALLBACK_MONSTER_TOKEN];
  const encodedName = encodeURIComponent(String(monster.name).replace(/[’]/g, "'"));
  return [
    `${GAME_IMAGE_BASE}bestiary/tokens/${monster.source}/${encodedName}.webp`,
    FALLBACK_MONSTER_TOKEN,
  ];
}

export function toEncounterMonster(monster, id) {
  const cr = crKey(monster?.cr);
  return {
    id,
    name: monster?.name || 'Monster',
    source: monster?.source || '',
    cr,
    xp: crXP(cr),
    qty: 1,
    monsterData: monster || null,
  };
}

export function serializeEncounterItem(item) {
  return {
    name: item.name,
    source: item.source || item.monsterData?.source || '',
    cr: item.cr,
    xp: item.xp,
    qty: item.qty,
  };
}

export function hydrateEncounterItems(items, monsters) {
  const db = Array.isArray(monsters) ? monsters : [];
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const monsterData = db.find((monster) => (
      monster.name === item.name && (!item.source || monster.source === item.source)
    )) || null;
    const cr = item.cr || crKey(monsterData?.cr);
    return {
      id: item.id || `enc-${index}-${item.name || 'monster'}`,
      name: item.name || monsterData?.name || 'Monster',
      source: item.source || monsterData?.source || '',
      cr,
      xp: numberOr(item.xp, crXP(cr)),
      qty: clampInt(item.qty, 1, 99, 1),
      monsterData,
    };
  });
}
