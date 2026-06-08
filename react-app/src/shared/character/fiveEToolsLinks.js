function slugify5eToolsName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SOURCE_ALIASES = {
  xphb: 'xphb',
  phb: 'phb',
  'phb\'24': 'xphb',
  'player\'s handbook': 'phb',
  'player\'s handbook 2024': 'xphb',
  xge: 'xge',
  'xanathar\'s guide to everything': 'xge',
  tce: 'tce',
  'tasha\'s cauldron of everything': 'tce',
  ftd: 'ftd',
  'fizban\'s treasury of dragons': 'ftd',
  scag: 'scag',
  'sword coast adventurer\'s guide': 'scag',
  vgm: 'vgm',
  'volo\'s guide to monsters': 'vgm',
  mtof: 'mtof',
  'mordenkainen\'s tome of foes': 'mtof',
  idrotf: 'idrotf',
  'icewind dale: rime of the frostmaiden': 'idrotf',
  egw: 'egw',
  'explorer\'s guide to wildemount': 'egw',
  sato: 'sato',
  'sigil and the outlands': 'sato',
  cos: 'cos',
  'curse of strahd': 'cos',
  dmg: 'dmg',
  'dungeon master\'s guide': 'dmg',
  'dungeon master\'s guide 2024': 'xdmg',
  xdmg: 'xdmg',
};

function normalize5eToolsSource(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/[^a-z0-9']/g, ' ').replace(/\s+/g, ' ').trim();
  return SOURCE_ALIASES[key] || key.replace(/[^a-z0-9]/g, '') || null;
}

function get5eToolsSpellUrl(spell) {
  if (!spell?.name) return null;
  const slug = slugify5eToolsName(spell.name);
  if (!slug) return null;
  const source = normalize5eToolsSource(spell.source || spell.src || spell.sourceShort || spell.sourceAbbreviation);
  if (!source) return null;
  return `https://5e.tools/spells/${slug}-${source}.html`;
}

// The app reorders a leading magic bonus to a trailing one for display
// ("+1 Longsword" → "Longsword +1"), but 5e.tools keys those items by the
// leading-bonus name ("+1 longsword_xdmg"). Reverse a trailing "+N" so the
// link hash matches 5e.tools.
function toLeadingBonusName(name) {
  return String(name || '').replace(/^(.+?)\s+(\+\d+)$/i, '$2 $1').trim();
}

function get5eToolsItemUrl(item) {
  if (!item?.name) return null;
  if (item.url && String(item.url).startsWith('https://5e.tools/')) return item.url;
  if (item.href && String(item.href).startsWith('https://5e.tools/')) return item.href;
  if (item.hash) return `https://5e.tools/items.html#${item.hash}`;
  if (String(item.source || '').toLowerCase() === 'custom') return null;
  const namePart = toLeadingBonusName(item.name).toLowerCase();
  if (!namePart) return null;
  const source = normalize5eToolsSource(item.source || item.src || item.sourceShort || item.sourceAbbreviation);
  if (!source) return null;
  return `https://5e.tools/items.html#${namePart}_${source}`;
}

export { slugify5eToolsName, normalize5eToolsSource, get5eToolsSpellUrl, get5eToolsItemUrl };
