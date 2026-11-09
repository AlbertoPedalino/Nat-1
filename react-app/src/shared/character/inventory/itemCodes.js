import { parseSignedBonus } from './itemBonus.js';
import { signed } from '../../ui/numberFormat.js';
import { capitalize, titleCase } from '../../ui/textCase.js';
import { stripSource } from '../../content/nameKeys.js';
import { ABILITY_ABBREVIATIONS, DAMAGE_TYPE_NAMES } from '../../content/rulesVocabulary.js';
import { formatCopper } from './currency.js';

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
  return stripSource(value).toUpperCase();
}

function rawTypeCode(item) {
  return stripSource(item?.type).toUpperCase();
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

// Base property labels with no contextual suffix — `decodeProperty` returns
// "Thrown (20/60)", which is right for display but useless as a filter value.
// These are the plain, comparable labels ("Thrown", "Light", "Versatile").
export function itemPropertyLabels(item) {
  const seen = new Set();
  collectRawProperties(item).forEach((code) => {
    const label = WEAPON_PROPERTY_LABELS[rawPropertyCode(code)];
    if (label) seen.add(label);
  });
  return [...seen];
}

export function itemMasteryLabels(item) {
  const arr = Array.isArray(item?.mastery) ? item.mastery : [];
  const seen = new Set();
  arr.forEach((entry) => {
    const label = masteryDisplayName(entry);
    if (label) seen.add(label);
  });
  return [...seen];
}

export function decodeDamageType(code) {
  if (!code) return '';
  const key = stripSource(code).toUpperCase();
  return DAMAGE_TYPE_NAMES[key]?.toLowerCase() || String(code).toLowerCase();
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
  return WEAPON_MASTERY_DISPLAY[code] || capitalize(code);
}

function formatRarity(rarity) {
  const r = String(rarity || '').trim().toLowerCase();
  if (!r || r === 'none' || r === 'unknown' || r === 'varies') return '';
  return titleCase(r);
}

const RECHARGE_LABELS = {
  dawn: 'at dawn', dusk: 'at dusk', midnight: 'at midnight',
  restShort: 'on a Short Rest', restLong: 'on a Long Rest',
  round: 'each round', week: 'each week', month: 'each month',
  decade: 'each decade', special: 'on a special trigger',
};

function formatRecharge(item) {
  const code = String(item?.recharge || '').trim();
  if (!code) return '';
  const when = RECHARGE_LABELS[code] || code;
  const amount = item?.rechargeAmount != null && item.rechargeAmount !== '' ? String(item.rechargeAmount) : '';
  return amount ? `regains ${amount} ${when}` : `recharges ${when}`;
}

function formatAbilitySet(ability) {
  if (!ability || typeof ability !== 'object') return '';
  const src = ability.static && typeof ability.static === 'object' ? ability.static : ability;
  return Object.keys(ABILITY_ABBREVIATIONS)
    .filter((k) => typeof src[k] === 'number')
    .map((k) => `${ABILITY_ABBREVIATIONS[k]} ${src[k]}`)
    .join(', ');
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
registerItemPropertySegment('rarity', (item) => {
  const value = formatRarity(item?.rarity);
  return value ? [{ kind: 'rarity', label: 'Rarity', value }] : [];
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
  if (atk && atk === dmg) parts.push(`${signed(atk)} attack & damage`);
  else {
    if (atk) parts.push(`${signed(atk)} attack`);
    if (dmg) parts.push(`${signed(dmg)} damage`);
  }
  if (ac) parts.push(`${signed(ac)} AC`);
  if (save) parts.push(`${signed(save)} saves`);
  if (check) parts.push(`${signed(check)} ability checks`);
  if (spellAtk) parts.push(`${signed(spellAtk)} spell attack`);
  if (spellDc) parts.push(`${signed(spellDc)} spell DC`);
  return parts.length ? [{ kind: 'enhancement', label: 'Enhancement', value: parts.join(', ') }] : [];
});
registerItemPropertySegment('charges', (item) => {
  if (item?.charges == null || item.charges === '') return [];
  const recharge = formatRecharge(item);
  const value = recharge ? `${item.charges} (${recharge})` : String(item.charges);
  return [{ kind: 'charges', label: 'Charges', value }];
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
  const gp = formatCopper(item?.value);
  return gp ? [{ kind: 'value', label: 'Value', value: gp }] : [];
});
registerItemPropertySegment('abilitySet', (item) => {
  const value = formatAbilitySet(item?.ability);
  return value ? [{ kind: 'abilitySet', label: 'Sets Ability', value }] : [];
});
registerItemPropertySegment('tier', (item) => {
  const t = String(item?.tier || '').trim();
  return t ? [{ kind: 'tier', label: 'Tier', value: capitalize(t) }] : [];
});
registerItemPropertySegment('cursed', (item) => (item?.curse ? [{ kind: 'cursed', label: 'Curse', value: 'Cursed' }] : []));
registerItemPropertySegment('sentient', (item) => (item?.sentient ? [{ kind: 'sentient', label: 'Sentient', value: 'Yes' }] : []));

const MISC_TAG_LABELS = { CNS: 'Consumable', TT: 'Trinket', 'CF/W': 'Crafts/Wondrous' };
registerItemPropertySegment('tags', (item) => {
  const tags = Array.isArray(item?.miscTags) ? item.miscTags : [];
  const labels = tags.map((t) => MISC_TAG_LABELS[t] || t).filter(Boolean);
  if (!labels.length) return [];
  return [{ kind: 'tags', label: 'Tags', value: labels.join(', ') }];
});

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

// An item's 5etools type code without its source ('M|XPHB' -> 'M').
export function itemBaseType(item) {
  return stripSource(item?.type).toUpperCase();
}

// Melee or ranged weapon.
export function isWeaponItem(item) {
  return ['M', 'R'].includes(itemBaseType(item));
}
