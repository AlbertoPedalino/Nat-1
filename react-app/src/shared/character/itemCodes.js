import { getWeaponMasteryReminderText } from './weaponMastery.js';
import { formatSignedBonus, parseSignedBonus } from './itemBonus.js';

// Type codes match 5etools schema. Note: "R" here means a Ranged Weapon item type;
// the same letter as a weapon property means "Reach" (see WEAPON_PROPERTY_LABELS).
// Disambiguation is by source field (item.type vs item.property).
export const ITEM_TYPE_LABELS = {
  M: 'Melee Weapon',
  R: 'Ranged Weapon',
  LA: 'Light Armor',
  MA: 'Medium Armor',
  HA: 'Heavy Armor',
  S: 'Shield',
  SCF: 'Spellcasting Focus',
  WD: 'Wand',
  RD: 'Rod',
  ST: 'Staff',
  WI: 'Wondrous Item',
  RG: 'Ring',
  P: 'Potion',
  SC: 'Scroll',
  A: 'Ammunition',
  AF: 'Ammunition (Firearm)',
  G: 'Adventuring Gear',
  T: 'Tools',
  AT: "Artisan's Tools",
  INS: 'Instrument',
  GS: 'Gaming Set',
  TG: 'Trade Good',
  MNT: 'Mount',
  VEH: 'Vehicle',
  FD: 'Food & Drink',
  TB: 'Treasure',
  EXP: 'Explosive',
  EM: 'Eldritch Machine',
  TAH: 'Tack & Harness',
  $: 'Treasure',
  WEAPON: 'Weapon',
  ARMOR: 'Armor',
};

export const WEAPON_CATEGORY_LABELS = {
  simple: 'Simple',
  martial: 'Martial',
};

export const WEAPON_PROPERTY_LABELS = {
  A: 'Ammunition',
  AF: 'Ammunition (Firearm)',
  BF: 'Burst Fire',
  F: 'Finesse',
  H: 'Heavy',
  L: 'Light',
  LD: 'Loading',
  R: 'Reach',
  RCH: 'Reach',
  RLD: 'Reload',
  S: 'Special',
  T: 'Thrown',
  '2H': 'Two-Handed',
  V: 'Versatile',
  N: 'Net',
};

export const WEAPON_PROPERTY_DESCRIPTIONS = {
  A: 'Requires ammunition. You can use a weapon with this property to make a ranged attack only if you have ammunition to fire from it.',
  AF: 'Firearm ammunition. Requires firearm-specific ammo.',
  BF: 'Can fire a burst attack covering an area.',
  F: 'Finesse: use Strength or Dexterity modifier for attack and damage rolls.',
  H: 'Heavy: Small creatures have disadvantage on attack rolls.',
  L: 'Light: suitable for two-weapon fighting.',
  LD: 'Loading: only one attack can be fired regardless of attacks available.',
  R: 'Reach: adds 5 feet to your reach for attacks.',
  RCH: 'Reach: adds 5 feet to your reach for attacks.',
  RLD: 'Reload: must be reloaded after a number of shots.',
  S: 'Special: see weapon description for unique rules.',
  T: 'Thrown: can be thrown to make a ranged attack.',
  '2H': 'Two-Handed: requires two hands when attacking.',
  V: 'Versatile: can be used with one or two hands; two-handed grip uses larger damage die.',
  N: 'Net: restrains a Large or smaller creature on hit.',
};

const ITEM_PROPERTY_KEYS = ['property', 'properties'];
const WEAPON_TYPE_CODES = new Set(['M', 'R', 'WEAPON']);

function rawPropertyCode(value) {
  return String(value || '').toUpperCase().split('|')[0].trim();
}

function rawTypeCode(item) {
  return String(item?.type || '').toUpperCase().split('|')[0].trim();
}

function collectRawProperties(item) {
  const out = [];
  ITEM_PROPERTY_KEYS.forEach((key) => {
    const arr = item?.[key];
    if (Array.isArray(arr)) arr.forEach((entry) => out.push(entry));
  });
  return out;
}

function weaponCategoryLabel(item) {
  const cat = String(item?.weaponCategory || '').toLowerCase();
  return WEAPON_CATEGORY_LABELS[cat] || '';
}

export function decodeItemTypeLabel(item) {
  const code = rawTypeCode(item);
  if (!code) return 'Gear';
  const base = ITEM_TYPE_LABELS[code] || code;
  if (WEAPON_TYPE_CODES.has(code)) {
    const cat = weaponCategoryLabel(item);
    return cat ? `${cat} ${base}` : base;
  }
  return base;
}

export function decodeProperty(rawCode, item) {
  const code = rawPropertyCode(rawCode);
  const base = WEAPON_PROPERTY_LABELS[code];
  if (!base) return null;
  let label = base;
  if (code === 'V' && item?.dmg2) label = `Versatile (${item.dmg2})`;
  else if ((code === 'T' || code === 'A' || code === 'AF') && item?.range) label = `${base} (${item.range})`;
  else if (code === 'RLD' && item?.reload) label = `Reload (${item.reload})`;
  return { code, label, description: WEAPON_PROPERTY_DESCRIPTIONS[code] || '' };
}

const CHIP_BUILDERS = {
  prop: function buildPropertyChipsFromCodes(item) {
    return collectRawProperties(item)
      .map((code) => decodeProperty(code, item))
      .filter(Boolean)
      .map((decoded) => ({ kind: 'prop', label: decoded.label, description: decoded.description }));
  },
  damage: function buildDamageChip(item) {
    if (!item?.dmg1) return [];
    return [{
      kind: 'damage',
      label: `Dmg ${item.dmg1}${item.dmgType ? ` ${item.dmgType}` : ''}`,
      description: 'Base damage dealt on a hit.',
    }];
  },
  ac: function buildAcChip(item) {
    if (item?.ac == null) return [];
    const t = rawTypeCode(item);
    const dexCap = item?.dexterityMax;
    const baseLabel = `AC ${item.ac}`;
    const label =
      t === 'LA' ? `${baseLabel} + Dex`
      : t === 'MA' ? `${baseLabel} + Dex (max ${dexCap ?? 2})`
      : t === 'S' ? `${baseLabel} (shield)`
      : baseLabel;
    return [{ kind: 'ac', label, description: 'Armor class contribution.' }];
  },
  req: function buildReqChip(item) {
    if (!item?.strength) return [];
    return [{
      kind: 'req',
      label: `Str ${item.strength}`,
      description: `Requires Strength ${item.strength}. Speed reduced by 10 if not met.`,
    }];
  },
  penalty: function buildStealthChip(item) {
    if (!item?.stealth) return [];
    return [{
      kind: 'penalty',
      label: 'Stealth DIS',
      description: 'Disadvantage on Dexterity (Stealth) checks while worn.',
    }];
  },
  range: function buildRangeChip(item) {
    if (!item?.range) return [];
    const handledByProperty = collectRawProperties(item).some((code) => /^(T|A|AF)$/.test(rawPropertyCode(code)));
    if (handledByProperty) return [];
    return [{ kind: 'range', label: `Range ${item.range}`, description: 'Effective range in feet.' }];
  },
  weight: function buildWeightChip(item) {
    if (!item?.weight) return [];
    return [{ kind: 'weight', label: `${item.weight} lb`, description: 'Item weight.' }];
  },
  mastery: function buildMasteryChips(item) {
    const arr = Array.isArray(item?.mastery) ? item.mastery : [];
    return arr
      .map((entry) => rawPropertyCode(entry))
      .filter(Boolean)
      .map((code) => {
        const titled = code.charAt(0) + code.slice(1).toLowerCase();
        const description = getWeaponMasteryReminderText(titled) || '';
        return { kind: 'mastery', label: `Mastery: ${titled}`, description };
      });
  },
};

export const CHIP_KINDS = ['prop', 'damage', 'ac', 'req', 'penalty', 'range', 'weight', 'mastery'];

export function buildItemPropertyChips(item, options = {}) {
  if (!item) return [];
  const { kinds, exclude } = options;
  const include = Array.isArray(kinds) && kinds.length ? kinds : CHIP_KINDS;
  const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);
  const out = [];
  include.forEach((kind) => {
    if (excludeSet.has(kind)) return;
    const builder = CHIP_BUILDERS[kind];
    if (!builder) return;
    builder(item).forEach((chip) => out.push(chip));
  });
  return out;
}

export const DAMAGE_TYPE_LABELS = {
  A: 'acid',
  B: 'bludgeoning',
  C: 'cold',
  F: 'fire',
  O: 'force',
  L: 'lightning',
  N: 'necrotic',
  P: 'piercing',
  I: 'poison',
  Y: 'psychic',
  R: 'radiant',
  S: 'slashing',
  T: 'thunder',
};

export function decodeDamageType(code) {
  if (!code) return '';
  const key = String(code).toUpperCase().split('|')[0].trim();
  return DAMAGE_TYPE_LABELS[key] || String(code).toLowerCase();
}

function formatGpValue(rawValue) {
  const gp = Number(rawValue || 0) / 100;
  if (!gp) return '';
  return `${Number.isInteger(gp) ? gp : gp.toFixed(2)} gp`;
}

const WEAPON_MASTERY_DISPLAY = {
  cleave: 'Cleave',
  graze: 'Graze',
  nick: 'Nick',
  push: 'Push',
  sap: 'Sap',
  slow: 'Slow',
  topple: 'Topple',
  vex: 'Vex',
};

function masteryDisplayName(rawCode) {
  const code = rawPropertyCode(rawCode).toLowerCase();
  return WEAPON_MASTERY_DISPLAY[code] || (code.charAt(0).toUpperCase() + code.slice(1));
}

const SEGMENT_BUILDERS = new Map();
const SEGMENT_ORDER = [];

export function registerItemPropertySegment(kind, builder) {
  if (!kind || typeof builder !== 'function') return;
  if (!SEGMENT_BUILDERS.has(kind)) SEGMENT_ORDER.push(kind);
  SEGMENT_BUILDERS.set(kind, builder);
}

registerItemPropertySegment('type', (item) => {
  const label = decodeItemTypeLabel(item);
  return label ? [{ kind: 'type', label: 'Type', value: label }] : [];
});
registerItemPropertySegment('attunement', (item) => {
  if (!item?.reqAttune) return [];
  const detail = typeof item.reqAttune === 'string' ? item.reqAttune : '';
  const status = item.attuned ? ' — attuned' : ' — not attuned';
  const value = (detail ? `Required (${detail})` : 'Required') + status;
  return [{ kind: 'attunement', label: 'Attunement', value }];
});
registerItemPropertySegment('enhancement', (item) => {
  const atk = parseSignedBonus(item?.bonusWeaponAttack ?? item?.bonusWeapon);
  const dmg = parseSignedBonus(item?.bonusWeaponDamage ?? item?.bonusWeapon);
  const ac = parseSignedBonus(item?.bonusAc);
  const save = parseSignedBonus(item?.bonusSavingThrow);
  const check = parseSignedBonus(item?.bonusAbilityCheck);
  const spellAtk = parseSignedBonus(item?.bonusSpellAttack);
  const spellDc = parseSignedBonus(item?.bonusSpellSaveDc);
  const parts = [];
  if (atk && atk === dmg) parts.push(`${formatSignedBonus(atk)} attack & damage`);
  else {
    if (atk) parts.push(`${formatSignedBonus(atk)} attack`);
    if (dmg) parts.push(`${formatSignedBonus(dmg)} damage`);
  }
  if (ac) parts.push(`${formatSignedBonus(ac)} AC`);
  if (save) parts.push(`${formatSignedBonus(save)} saves`);
  if (check) parts.push(`${formatSignedBonus(check)} ability checks`);
  if (spellAtk) parts.push(`${formatSignedBonus(spellAtk)} spell attack`);
  if (spellDc) parts.push(`${formatSignedBonus(spellDc)} spell DC`);
  return parts.length ? [{ kind: 'enhancement', label: 'Enhancement', value: parts.join(', ') }] : [];
});
registerItemPropertySegment('damage', (item) => {
  if (!item?.dmg1) return [];
  const out = [{ kind: 'damage', label: 'Damage', value: item.dmg1 }];
  if (item.dmgType) out.push({ kind: 'damageType', label: 'Damage Type', value: decodeDamageType(item.dmgType) });
  return out;
});
registerItemPropertySegment('versatile', (item) => {
  if (!item?.dmg2) return [];
  return [{ kind: 'versatile', label: 'Versatile Damage', value: item.dmg2 }];
});
registerItemPropertySegment('ac', (item) => {
  if (item?.ac == null) return [];
  const t = rawTypeCode(item);
  const dexCap = item?.dexterityMax;
  const value =
    t === 'LA' ? `${item.ac} + Dex`
    : t === 'MA' ? `${item.ac} + Dex (max ${dexCap ?? 2})`
    : t === 'S' ? `+${item.ac} (Shield)`
    : `${item.ac}`;
  return [{ kind: 'ac', label: 'Armor Class', value }];
});
registerItemPropertySegment('properties', (item) => {
  const codes = collectRawProperties(item);
  const labels = codes
    .map((code) => decodeProperty(code, item))
    .filter(Boolean)
    .map((decoded) => decoded.label);
  if (!labels.length) return [];
  return [{ kind: 'properties', label: 'Properties', value: labels.join(', ') }];
});
registerItemPropertySegment('mastery', (item) => {
  const arr = Array.isArray(item?.mastery) ? item.mastery : [];
  if (!arr.length) return [];
  return [{ kind: 'mastery', label: 'Mastery', value: arr.map(masteryDisplayName).join(', ') }];
});
registerItemPropertySegment('range', (item) => {
  if (!item?.range) return [];
  const handledByProperty = collectRawProperties(item).some((code) => /^(T|A|AF)$/.test(rawPropertyCode(code)));
  if (handledByProperty) return [];
  return [{ kind: 'range', label: 'Range', value: String(item.range) }];
});
registerItemPropertySegment('req', (item) => {
  if (!item?.strength) return [];
  return [{ kind: 'req', label: 'Strength', value: String(item.strength) }];
});
registerItemPropertySegment('stealth', (item) => {
  if (!item?.stealth) return [];
  return [{ kind: 'stealth', label: 'Stealth', value: 'Disadvantage' }];
});
registerItemPropertySegment('weight', (item) => {
  if (!item?.weight) return [];
  return [{ kind: 'weight', label: 'Weight', value: `${item.weight} lb` }];
});
registerItemPropertySegment('value', (item) => {
  const gp = formatGpValue(item?.value);
  return gp ? [{ kind: 'value', label: 'Value', value: gp }] : [];
});

const MISC_TAG_LABELS = { CNS: 'Consumable', TT: 'Trinket', 'CF/W': 'Crafts/Wondrous' };
registerItemPropertySegment('tags', (item) => {
  const tags = Array.isArray(item?.miscTags) ? item.miscTags : [];
  const labels = tags.map((t) => MISC_TAG_LABELS[t] || t).filter(Boolean);
  if (!labels.length) return [];
  return [{ kind: 'tags', label: 'Tags', value: labels.join(', ') }];
});

export const ITEM_PROPERTY_SEGMENT_KINDS = SEGMENT_ORDER;

export function buildItemPropertySegments(item, options = {}) {
  if (!item) return [];
  const { kinds, exclude } = options;
  const include = Array.isArray(kinds) && kinds.length ? kinds : SEGMENT_ORDER;
  const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);
  return include.flatMap((kind) => {
    if (excludeSet.has(kind)) return [];
    const builder = SEGMENT_BUILDERS.get(kind);
    return builder ? builder(item) : [];
  });
}

export const PROPERTY_CHIP_TONES = {
  prop: { color: '#c4b393', borderColor: 'rgba(196,179,147,0.45)', bgcolor: 'rgba(196,179,147,0.10)' },
  damage: { color: '#de675f', borderColor: 'rgba(222,103,95,0.45)', bgcolor: 'rgba(222,103,95,0.12)' },
  ac: { color: '#4d95d6', borderColor: 'rgba(77,149,214,0.45)', bgcolor: 'rgba(77,149,214,0.12)' },
  req: { color: '#d69245', borderColor: 'rgba(214,146,69,0.45)', bgcolor: 'rgba(214,146,69,0.12)' },
  penalty: { color: '#de675f', borderColor: 'rgba(222,103,95,0.45)', bgcolor: 'rgba(222,103,95,0.12)' },
  range: { color: '#4d95d6', borderColor: 'rgba(77,149,214,0.45)', bgcolor: 'rgba(77,149,214,0.12)' },
  weight: { color: '#a89882', borderColor: 'rgba(168,152,130,0.45)', bgcolor: 'transparent' },
  mastery: { color: '#edd48a', borderColor: 'rgba(237,212,138,0.55)', bgcolor: 'rgba(237,212,138,0.14)' },
};
