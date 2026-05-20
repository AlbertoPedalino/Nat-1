// ============================================================
// WEAPON PROFICIENCY RULE SYSTEM — single source of truth.
// Pure functions; no React, no character collection logic.
// ============================================================

export function normKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const PROPERTY_CANONICAL = {
  f: 'finesse', finesse: 'finesse', fin: 'finesse',
  l: 'light', light: 'light',
  h: 'heavy', heavy: 'heavy',
  v: 'versatile', versatile: 'versatile',
  t: 'thrown', thrown: 'thrown',
  '2h': 'two-handed', 'two-handed': 'two-handed', twohanded: 'two-handed',
  a: 'ammunition', ammunition: 'ammunition',
  ld: 'loading', loading: 'loading',
  rch: 'reach', reach: 'reach',
  s: 'special', special: 'special',
  rld: 'reload', reload: 'reload',
  n: 'net', net: 'net',
};

export function canonicalProperty(value) {
  const key = String(value || '').toLowerCase().trim();
  return PROPERTY_CANONICAL[key] || key;
}

function itemProps(item) {
  const raw = [
    ...(Array.isArray(item?.property) ? item.property : []),
    ...(Array.isArray(item?.properties) ? item.properties : []),
  ];
  return raw.map(canonicalProperty);
}

export function itemHasProperty(item, props) {
  const wanted = new Set((Array.isArray(props) ? props : [props]).map(canonicalProperty));
  return itemProps(item).some((p) => wanted.has(p));
}

export function getWeaponCategory(item) {
  const raw = String(item?.weaponCategory || '').toLowerCase();
  if (raw.includes('simple')) return 'simple';
  if (raw.includes('martial')) return 'martial';
  return '';
}

const WEAPON_NAME_ALIASES = {
  crossbowhand: 'handcrossbow',
  handcrossbow: 'crossbowhand',
  crossbowlight: 'lightcrossbow',
  lightcrossbow: 'crossbowlight',
  crossbowheavy: 'heavycrossbow',
  heavycrossbow: 'crossbowheavy',
};

function stripPluralSuffix(key) {
  return key.endsWith('s') ? key.slice(0, -1) : key;
}

export function weaponNameKeys(item) {
  const raw = String(item?.name || '').replace(/,\s*\+\d+$/i, '').replace(/\s*\+\d+$/i, '').trim();
  const key = normKey(raw);
  const keys = new Set([key]);
  if (WEAPON_NAME_ALIASES[key]) keys.add(WEAPON_NAME_ALIASES[key]);
  Array.from(keys).forEach((k) => keys.add(stripPluralSuffix(k)));
  return keys;
}

export function weaponMatchesRule(item, rule) {
  if (!item || !rule || typeof rule !== 'object') return false;
  const itemType = String(item.type || '').toUpperCase();
  if (rule.type && itemType !== rule.type) return false;
  if (Array.isArray(rule.types) && !rule.types.includes(itemType)) return false;
  const cat = getWeaponCategory(item);
  if (rule.category && cat !== String(rule.category).toLowerCase()) return false;
  if (rule.melee === true && itemType !== 'M') return false;
  if (rule.ranged === true && itemType !== 'R') return false;
  if (rule.weaponName) {
    const target = stripPluralSuffix(normKey(rule.weaponName));
    const names = weaponNameKeys(item);
    if (!names.has(target)) return false;
  }
  if (Array.isArray(rule.propertiesAny) && rule.propertiesAny.length && !rule.propertiesAny.some((p) => itemHasProperty(item, p))) return false;
  if (Array.isArray(rule.propertiesAll) && rule.propertiesAll.length && !rule.propertiesAll.every((p) => itemHasProperty(item, p))) return false;
  if (Array.isArray(rule.excludeProperties) && rule.excludeProperties.some((p) => itemHasProperty(item, p))) return false;
  return true;
}

function parseFilterParams(filterStr) {
  if (!filterStr) return null;
  const params = {};
  filterStr.split('|').forEach((part) => {
    const eq = part.indexOf('=');
    if (eq === -1) return;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key && value) params[key] = value;
  });
  return params;
}

function makeRuleFromFilter(params) {
  if (!params) return null;
  const rule = {};
  if (params.type) {
    const t = params.type.toLowerCase();
    if (t.includes('martial')) rule.category = 'martial';
    else if (t.includes('simple')) rule.category = 'simple';
    if (t.includes('melee')) rule.type = 'M';
    else if (t.includes('ranged')) rule.type = 'R';
  }
  if (params.melee === 'true') rule.type = 'M';
  if (params.ranged === 'true') rule.type = 'R';
  if (params.property) {
    const anyProps = [];
    const exclProps = [];
    params.property.split(';').map((p) => p.trim()).filter(Boolean).forEach((p) => {
      if (p.startsWith('-')) exclProps.push(canonicalProperty(p.slice(1)));
      else anyProps.push(canonicalProperty(p));
    });
    if (anyProps.length) rule.propertiesAny = anyProps;
    if (exclProps.length) rule.excludeProperties = exclProps;
  }
  return Object.keys(rule).length ? rule : null;
}

export function normalizeRule(rule) {
  if (!rule) return null;
  const out = {};
  if (rule.weaponName) { out.weaponName = String(rule.weaponName).trim(); return out; }
  if (rule.category) out.category = rule.category.toLowerCase();
  if (rule.type === 'M' || rule.type === 'R') out.type = rule.type;
  if (rule.melee === true) out.melee = true;
  if (rule.ranged === true) out.ranged = true;
  if (Array.isArray(rule.propertiesAny) && rule.propertiesAny.length)
    out.propertiesAny = [...new Set(rule.propertiesAny.map(canonicalProperty).filter(Boolean))].sort();
  if (Array.isArray(rule.propertiesAll) && rule.propertiesAll.length)
    out.propertiesAll = [...new Set(rule.propertiesAll.map(canonicalProperty).filter(Boolean))].sort();
  if (Array.isArray(rule.excludeProperties) && rule.excludeProperties.length)
    out.excludeProperties = [...new Set(rule.excludeProperties.map(canonicalProperty).filter(Boolean))].sort();
  return out;
}

export function ruleKey(rule) {
  if (!rule) return '';
  if (rule.weaponName) return `weapon:${stripPluralSuffix(normKey(rule.weaponName))}`;
  const parts = [];
  if (rule.category) parts.push(`cat=${rule.category}`);
  if (rule.type) parts.push(`type=${rule.type}`);
  if (rule.melee) parts.push('melee');
  if (rule.ranged) parts.push('ranged');
  if (Array.isArray(rule.propertiesAny)) parts.push(`any=[${rule.propertiesAny.join(',')}]`);
  if (Array.isArray(rule.propertiesAll)) parts.push(`all=[${rule.propertiesAll.join(',')}]`);
  if (Array.isArray(rule.excludeProperties)) parts.push(`excl=[${rule.excludeProperties.join(',')}]`);
  return parts.join('|') || 'any';
}

export function formatRule(rule) {
  if (!rule) return '';
  if (rule.weaponName) return rule.weaponName;
  const cat = rule.category ? rule.category.charAt(0).toUpperCase() + rule.category.slice(1) : '';
  const isMelee = rule.type === 'M';
  const isRanged = rule.type === 'R';
  const parts = [];
  if (cat) parts.push(cat);
  if (isMelee) parts.push('Melee');
  if (isRanged) parts.push('Ranged');
  if (rule.propertiesAny && rule.propertiesAny.length) {
    const p = rule.propertiesAny.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    parts.push(`(${p.join(' or ')})`);
  }
  if (rule.excludeProperties && rule.excludeProperties.length) {
    const p = rule.excludeProperties.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
    parts.push(`without ${p.join(' or ')}`);
  }
  if (!parts.length) return 'Weapons';
  return parts.join(' ');
}

export function processStructuredWeaponProficiencies(struct) {
  const rules = [];
  if (!struct) return rules;
  const arr = Array.isArray(struct) ? struct : [struct];
  arr.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    Object.entries(entry).forEach(([key, value]) => {
      if (!value) return;
      const k = key.charAt(0).toLowerCase() + key.slice(1);
      if (k === 'simple' || k === 'martial') {
        rules.push({ category: k });
      } else if (k === 'all' && value && typeof value === 'object') {
        const params = parseFilterParams(value.fromFilter);
        const rule = makeRuleFromFilter(params);
        if (rule) rules.push(rule);
      } else {
        rules.push({ weaponName: key });
      }
    });
  });
  return rules;
}

// Convert a free-form proficiency label (from features, multiclass, choices)
// into a structured rule. Falls back to a named-weapon rule when label is not
// a recognised category descriptor.
export function inferRuleFromLabel(label) {
  const lk = normKey(label);
  if (!lk) return null;
  if (lk === 'weapons' || lk === 'allweapons') return {};
  if (lk === 'simple' || lk === 'simpleweapon' || lk === 'simpleweapons') return { category: 'simple' };
  if (lk === 'martial' || lk === 'martialweapon' || lk === 'martialweapons') return { category: 'martial' };
  if (lk === 'meleeweapons' || lk === 'meleeweapon') return { type: 'M' };
  if (lk === 'rangedweapons' || lk === 'rangedweapon') return { type: 'R' };
  const isSimple = lk.includes('simple');
  const isMartial = lk.includes('martial');
  const isMelee = lk.includes('melee');
  const isRanged = lk.includes('ranged');
  if (isSimple && isMelee) return { category: 'simple', type: 'M' };
  if (isSimple && isRanged) return { category: 'simple', type: 'R' };
  if (isMartial && isMelee) {
    const rule = { category: 'martial', type: 'M' };
    if (lk.includes('withoutheavy') || lk.includes('withouttwohanded')) {
      rule.excludeProperties = ['heavy', 'two-handed'];
    }
    return rule;
  }
  if (isMartial && isRanged) return { category: 'martial', type: 'R' };
  return { weaponName: label };
}

export function dedupeRules(rules) {
  const seen = new Set();
  const out = [];
  rules.forEach((raw) => {
    const norm = normalizeRule(raw);
    if (!norm) return;
    const key = ruleKey(norm);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(norm);
  });
  return out;
}

// Canonical display form for a free-text weapon proficiency label.
// Mirrors the rule pipeline so callers that track hidden labels (set
// subtraction) line up with the formatted labels populated in weaponSet.
export function labelToFormattedWeaponLabel(label) {
  const rule = inferRuleFromLabel(label);
  if (!rule) return label;
  const norm = normalizeRule(rule);
  return norm ? formatRule(norm) : label;
}
