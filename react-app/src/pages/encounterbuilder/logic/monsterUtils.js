import { CR_XP, FALLBACK_MONSTER_TOKEN, IMAGE_BASE, SIZE_LABELS } from './constants.js';

export function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampInt(value, min, max, fallback = min) {
  const n = Math.round(numberOr(value, fallback));
  return Math.max(min, Math.min(max, n));
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function getCR(cr) {
  if (!cr) return '0';
  if (typeof cr === 'string') return cr;
  if (typeof cr === 'object') return String(cr.cr || '0');
  return String(cr);
}

export function crXP(cr) {
  return CR_XP[getCR(cr)] || 0;
}

export function getType(type) {
  if (!type) return '';
  if (typeof type === 'string') return type;
  if (typeof type === 'object') return type.type || Object.keys(type)[0] || '';
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

export function abilityMod(score) {
  return Math.floor((numberOr(score, 10) - 10) / 2);
}

export function formatMod(value) {
  const n = numberOr(value, 0);
  return `${n >= 0 ? '+' : ''}${n}`;
}

export function abilityModString(score) {
  return formatMod(abilityMod(score));
}

export function getSizeLabel(monster) {
  const key = Array.isArray(monster?.size) ? monster.size[0] : monster?.size;
  return SIZE_LABELS[key] || key || '';
}

export function formatAlignment(alignment) {
  if (!alignment) return '';
  if (Array.isArray(alignment)) return alignment.join(' ');
  return String(alignment);
}

export function formatSpeed(speed) {
  if (!speed) return '—';
  return Object.entries(speed)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key === 'walk' ? '' : `${key} `}${value} ft.`)
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

export function slugify5e(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w ]+/g, '')
    .replace(/[ _]+/g, '-');
}

export function monster5eUrl(monster) {
  if (!monster?.name || !monster?.source) return null;
  return `https://5e.tools/bestiary/${slugify5e(`${monster.name}_${monster.source}`)}.html`;
}

export function spell5eUrl(value) {
  const [name, source = 'xphb'] = String(value || '').split('|');
  const slug = String(name || '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug ? `https://5e.tools/spells/${slug}-${String(source).toLowerCase()}.html` : null;
}

export function getMonsterTokenUrls(monster) {
  if (!monster?.name || !monster?.source) return [`${IMAGE_BASE}${FALLBACK_MONSTER_TOKEN}`];
  const encodedName = encodeURIComponent(String(monster.name).replace(/[’]/g, "'"));
  return [
    `${IMAGE_BASE}bestiary/tokens/${monster.source}/${encodedName}.webp`,
    `${IMAGE_BASE}${FALLBACK_MONSTER_TOKEN}`,
  ];
}

export function toEncounterMonster(monster, id) {
  const cr = getCR(monster?.cr);
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
    const cr = item.cr || getCR(monsterData?.cr);
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
