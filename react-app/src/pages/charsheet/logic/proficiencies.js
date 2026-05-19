import { installedRegistry } from '../../../adapters/index.js';
import { canonicalProficiencyLabel } from '../../../shared/character/proficiencyDisplay.js';
import { getMulticlassProficiencies } from '../../../shared/character/multiclassProficiencies.js';
import {
  parseTypedProficiencyValue as parseTypedProficiencyValueShared,
  isChoicePlaceholderValue,
  extractFixedProficiencyLabels,
} from '../../../shared/character/typedProficiencies.js';

function normKey(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeLabel(v) {
  return canonicalProficiencyLabel(v);
}

function parseTypedProficiencyValue(value) {
  const parsed = parseTypedProficiencyValueShared(value);
  if (!parsed.kind || !parsed.label) return null;
  return { kind: parsed.kind, label: parsed.label };
}

function isChoicePlaceholder(value) {
  return isChoicePlaceholderValue(value);
}

const CHOICE_KEYS = ['choose', 'any', 'anyTool', 'anyArtisansTool', 'anyMusicalInstrument', 'anyGamingSet', 'anyStandard', 'anyExotic'];

const SIMPLE_WEAPONS = new Set([
  'club','dagger','greatclub','handaxe','javelin','lighthammer','mace','quarterstaff','sickle','spear',
  'dart','lightcrossbow','shortbow','sling','crossbowlight',
]);

const MARTIAL_WEAPONS = new Set([
  'battleaxe','flail','glaive','greataxe','greatsword','halberd','lance','longsword','maul','morningstar',
  'pike','rapier','scimitar','shortsword','trident','warpick','warhammer','whip','blowgun','handcrossbow',
  'heavycrossbow','longbow','crossbowhand','crossbowheavy','pistol','musket',
]);

const PROP_ALIASES = {
  f: ['f', 'finesse'], finesse: ['f', 'finesse'],
  l: ['l', 'light'], light: ['l', 'light'],
  h: ['h', 'heavy'], heavy: ['h', 'heavy'],
  v: ['v', 'versatile'], versatile: ['v', 'versatile'],
  t: ['t', 'thrown'], thrown: ['t', 'thrown'],
  '2h': ['2h', 'twohanded'], twohanded: ['2h', 'twohanded'], 'two-handed': ['2h', 'twohanded'],
  s: ['s', 'stealth', 'disadvantage'], stealth: ['s', 'stealth', 'disadvantage'], disadvantage: ['s', 'stealth', 'disadvantage'],
};

function itemProps(item) {
  return [...(Array.isArray(item?.property) ? item.property : []), ...(Array.isArray(item?.properties) ? item.properties : [])].map(p => String(p).toLowerCase());
}

function itemHasProperty(item, props) {
  const wanted = new Set((Array.isArray(props) ? props : [props]).flatMap(p => PROP_ALIASES[normKey(p)] || [normKey(p)]));
  return itemProps(item).some(p => {
    const k = normKey(p);
    return wanted.has(k) || wanted.has(normKey(PROP_ALIASES[k]?.[0] || k));
  });
}

function weaponNameKeys(item) {
  const raw = String(item?.name || '').replace(/,\s*\+\d+$/i, '').replace(/\s*\+\d+$/i, '').trim();
  const key = normKey(raw);
  const keys = new Set([key]);
  const aliases = { crossbowhand: 'handcrossbow', handcrossbow: 'crossbowhand', crossbowlight: 'lightcrossbow', lightcrossbow: 'crossbowlight', crossbowheavy: 'heavycrossbow', heavycrossbow: 'crossbowheavy' };
  if (aliases[key]) keys.add(aliases[key]);
  Array.from(keys).forEach(k => { if (k.endsWith('s')) keys.add(k.slice(0, -1)); });
  return keys;
}

function weaponCategory(item) {
  const raw = item?.weaponCategory || item?.weaponType || item?.category || item?._weaponCategory || item?.weaponGroup || '';
  const k = normKey(raw);
  if (k.includes('simple')) return 'simple';
  if (k.includes('martial')) return 'martial';
  const nameKeys = weaponNameKeys(item);
  for (const nk of nameKeys) {
    if (SIMPLE_WEAPONS.has(nk)) return 'simple';
    if (MARTIAL_WEAPONS.has(nk)) return 'martial';
  }
  return '';
}

export function weaponMatchesRule(item, rule) {
  if (!item || !rule || typeof rule !== 'object') return false;
  if (rule.type && item.type !== rule.type) return false;
  if (Array.isArray(rule.types) && !rule.types.includes(item.type)) return false;
  const cat = weaponCategory(item);
  if (rule.category && cat !== String(rule.category).toLowerCase()) return false;
  if (rule.melee === true && item.type !== 'M') return false;
  if (rule.ranged === true && item.type !== 'R') return false;
  if (Array.isArray(rule.propertiesAny) && rule.propertiesAny.length && !rule.propertiesAny.some(p => itemHasProperty(item, p))) return false;
  if (Array.isArray(rule.propertiesAll) && rule.propertiesAll.length && !rule.propertiesAll.every(p => itemHasProperty(item, p))) return false;
  if (Array.isArray(rule.excludeProperties) && rule.excludeProperties.some(p => itemHasProperty(item, p))) return false;
  return true;
}

// ============================================================
// WEAPON PROFICIENCY RULE SYSTEM — single source of truth
// ============================================================

function normalizeWeaponProperty(prop) {
  const p = String(prop || '').toLowerCase().trim();
  const MAP = {
    f: 'finesse', finesse: 'finesse', fin: 'finesse',
    l: 'light', light: 'light',
    h: 'heavy', heavy: 'heavy',
    '2h': 'two-handed', 'two-handed': 'two-handed', twohanded: 'two-handed',
    v: 'versatile', versatile: 'versatile',
    t: 'thrown', thrown: 'thrown',
    a: 'ammunition', ammunition: 'ammunition',
    ld: 'loading', loading: 'loading',
    rch: 'reach', reach: 'reach',
    s: 'special', special: 'special',
    rld: 'reload', reload: 'reload',
  };
  return MAP[p] || p;
}

function parseWeaponFilterParams(filterStr) {
  if (!filterStr) return null;
  const params = {};
  filterStr.split('|').forEach(part => {
    const eq = part.indexOf('=');
    if (eq === -1) return;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key && value) params[key] = value;
  });
  return params;
}

function makeWeaponRuleFromFilter(params) {
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
    const rawProps = params.property.split(';').map(p => p.trim()).filter(Boolean);
    const anyProps = [];
    const exclProps = [];
    rawProps.forEach(p => {
      if (p.startsWith('-')) {
        const norm = normalizeWeaponProperty(p.slice(1));
        if (norm) exclProps.push(norm);
      } else {
        const norm = normalizeWeaponProperty(p);
        if (norm) anyProps.push(norm);
      }
    });
    if (anyProps.length) rule.propertiesAny = anyProps;
    if (exclProps.length) rule.excludeProperties = exclProps;
  }
  return Object.keys(rule).length ? rule : null;
}

function formatWeaponRule(rule) {
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
    const p = rule.propertiesAny.map(s => s.charAt(0).toUpperCase() + s.slice(1));
    parts.push(`(${p.join(' or ')})`);
  }
  if (rule.excludeProperties && rule.excludeProperties.length) {
    const p = rule.excludeProperties.map(s => s.charAt(0).toUpperCase() + s.slice(1));
    parts.push(`without ${p.join(' or ')}`);
  }
  if (!parts.length) return 'Unknown';
  if (!rule.propertiesAny && !rule.excludeProperties && !isMelee && !isRanged && cat) return `${cat}`;
  return parts.join(' ');
}

function normalizeWeaponRule(rule) {
  if (!rule) return null;
  const out = {};
  if (rule.weaponName) { out.weaponName = normKey(rule.weaponName); return out; }
  if (rule.category) out.category = rule.category.toLowerCase();
  if (rule.type === 'M' || rule.type === 'R') out.type = rule.type;
  if (rule.melee === true) out.melee = true;
  if (rule.ranged === true) out.ranged = true;
  if (Array.isArray(rule.propertiesAny) && rule.propertiesAny.length)
    out.propertiesAny = [...new Set(rule.propertiesAny.map(normalizeWeaponProperty).filter(Boolean))].sort();
  if (Array.isArray(rule.propertiesAll) && rule.propertiesAll.length)
    out.propertiesAll = [...new Set(rule.propertiesAll.map(normalizeWeaponProperty).filter(Boolean))].sort();
  if (Array.isArray(rule.excludeProperties) && rule.excludeProperties.length)
    out.excludeProperties = [...new Set(rule.excludeProperties.map(normalizeWeaponProperty).filter(Boolean))].sort();
  return out;
}

function ruleKey(rule) {
  if (!rule) return '';
  if (rule.weaponName) return `weapon:${normKey(rule.weaponName)}`;
  const parts = [];
  if (rule.category) parts.push(`cat=${rule.category}`);
  if (rule.type) parts.push(`type=${rule.type}`);
  if (rule.melee) parts.push('melee');
  if (rule.ranged) parts.push('ranged');
  if (Array.isArray(rule.propertiesAny))
    parts.push(`any=[${rule.propertiesAny.join(',')}]`);
  if (Array.isArray(rule.propertiesAll))
    parts.push(`all=[${rule.propertiesAll.join(',')}]`);
  if (Array.isArray(rule.excludeProperties))
    parts.push(`excl=[${rule.excludeProperties.join(',')}]`);
  return parts.join('|');
}

function processWeaponProficiencyStruct(struct) {
  const rules = [];
  if (!struct) return rules;
  const arr = Array.isArray(struct) ? struct : [struct];
  arr.forEach(entry => {
    if (!entry || typeof entry !== 'object') return;
    Object.entries(entry).forEach(([key, value]) => {
      if (!value) return;
      const k = key.charAt(0).toLowerCase() + key.slice(1);
      if (k === 'simple' || k === 'martial') {
        rules.push({ category: k });
      } else if (k === 'all' && value && typeof value === 'object') {
        const filterStr = value.fromFilter;
        if (filterStr) {
          const params = parseWeaponFilterParams(filterStr);
          const rule = makeWeaponRuleFromFilter(params);
          if (rule) rules.push(rule);
        }
      } else {
        rules.push({ weaponName: key });
      }
    });
  });
  return rules;
}

export function resolveWeaponProficiencyRules(C) {
  const rules = [];
  const sp = C?.clsSnapshot?.startingProficiencies || {};

  // Source A: 5etools structured weaponProficiencies
  if (sp.weaponProficiencies) {
    processWeaponProficiencyStruct(sp.weaponProficiencies).forEach(r => rules.push(r));
  }

  // Source C: adapter match rules
  collectAdapterProfGrants(C)
    .filter(g => g.type === 'weapon' && g.match && typeof g.match === 'object')
    .forEach(g => rules.push(g.match));

  // Normalize and deduplicate
  const seen = new Set();
  const deduped = [];
  rules.forEach(raw => {
    const norm = normalizeWeaponRule(raw);
    if (!norm) return;
    const key = ruleKey(norm);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(norm);
  });

  // Generate display labels
  const labels = new Set();
  deduped.forEach(rule => {
    labels.add(formatWeaponRule(rule));
  });

  return { rules: deduped, labels };
}

function choiceMatches(C, requiredChoice, prefix = '') {
  if (!requiredChoice?.key) return true;
  const choices = C?.choices || {};
  const keys = [requiredChoice.key, `${prefix || ''}${requiredChoice.key}`].filter(Boolean);
  const wanted = Array.isArray(requiredChoice.value) ? requiredChoice.value : [requiredChoice.value];
  const wantedNorm = wanted.map((value) => normKey(String(value).split('|')[0]));
  return keys.some((key) => {
    const stored = choices[key];
    const vals = Array.isArray(stored) ? stored : (stored ? [stored] : []);
    return vals.some((value) => wantedNorm.includes(normKey(String(value).split('|')[0])));
  });
}

function collectAdapterProfGrants(C) {
  const grants = [];
  const push = (list, lv, prefix = '') => {
    (list || []).forEach(g => {
      if (!g || typeof g !== 'object') return;
      if ((lv || 1) < Number(g.minLevel || 1)) return;
      if (g.requiredChoice && !choiceMatches(C, g.requiredChoice, prefix)) return;
      grants.push(g);
    });
  };
  const collectEntity = (className, subclassShortName, lv, prefix = '') => {
    push(installedRegistry.getClassSheetProficiencies(className), lv, prefix);
    push(installedRegistry.getSubclassSheetProficiencies(className, subclassShortName), lv, prefix);
  };
  collectEntity(C?.className || '', C?.subclassShortName || '', C?.classLevel || C?.level || 1, '');
  for (const [index, ec] of (C?.extraClasses || []).entries()) {
    collectEntity(ec?.name || '', ec?.subclassShortName || '', ec?.level || 1, `mc${index}_`);
  }
  push(installedRegistry.getSpeciesSheetProficiencies(C?.speciesName || '', C?.speciesSource || ''), C?.level || 1, '');
  return grants;
}

function collectFixedFeatureProfs(C, field) {
  const out = new Set();
  const features = [...(C?.allClassFeatures || []), ...(C?.allFeatSnapshots || []), ...(C?.backgroundSnapshot ? [C.backgroundSnapshot] : [])];
  features.forEach(f => {
    const raw = f?.[field];
    if (!raw) return;
    const arr = Array.isArray(raw) ? raw : [raw];
    arr.forEach(entry => {
      if (typeof entry === 'string') {
        entry.split(/[;,]/).map(normalizeLabel).filter(Boolean).forEach(v => out.add(v));
      } else if (entry && typeof entry === 'object') {
        Object.keys(entry).filter(k => !CHOICE_KEYS.includes(k) && entry[k] !== false).map(normalizeLabel).filter(Boolean).forEach(v => out.add(v));
      }
    });
  });
  return out;
}

export function collectEquipmentProficiencySets(C) {
  const sp = C?.clsSnapshot?.startingProficiencies || {};
  const armorSet = new Set();
  const weaponSet = new Set();
  const weaponMasterySet = new Set();

  (C?.normalizedChoices?.weaponMasteries || [])
    .map(normalizeLabel)
    .filter(Boolean)
    .forEach(v => weaponMasterySet.add(v));

  const addFixed = (src, set) => {
    const arr = Array.isArray(src) ? src : [src];
    arr.forEach(entry => {
      if (!entry) return;
      if (typeof entry === 'string') {
        entry.split(/[;,]/)
          .filter((v) => !isChoicePlaceholder(v))
          .map(normalizeLabel)
          .filter(Boolean)
          .forEach(v => set.add(v));
        return;
      }
      Object.keys(entry)
        .filter(k => !CHOICE_KEYS.includes(k) && entry[k] !== false && !isChoicePlaceholder(k))
        .map(normalizeLabel)
        .filter(Boolean)
        .forEach(v => set.add(v));
    });
  };

  addFixed(sp.armor, armorSet);

  // Strip out {@filter} entries from weapons BEFORE addFixed, because
  // addFixed splits by ; which breaks the filter tag into garbage fragments
  // that would pollute the weaponSet display.
  const weaponsNoFilter = (Array.isArray(sp.weapons) ? sp.weapons : [])
    .filter(e => typeof e !== 'string' || !e.includes('{@filter'));
  addFixed(weaponsNoFilter, weaponSet);

  // Use centralized rule resolver for weapon rules + clean display labels
  const { rules: weaponRules, labels: weaponLabels } = resolveWeaponProficiencyRules(C);
  weaponLabels.forEach(l => weaponSet.add(l));

  (C?.extraClasses || []).forEach((extra) => {
    const gained = getMulticlassProficiencies(extra?.name, extra?.cls);
    addFixed(gained.armor, armorSet);
    addFixed(gained.weapons, weaponSet);
  });

  if (C?.speciesSnapshot?.armorProficiencies) addFixed(C.speciesSnapshot.armorProficiencies, armorSet);
  if (C?.speciesSnapshot?.weaponProficiencies) addFixed(C.speciesSnapshot.weaponProficiencies, weaponSet);

  if (C?.backgroundSnapshot?.armorProficiencies) addFixed(C.backgroundSnapshot.armorProficiencies, armorSet);
  if (C?.backgroundSnapshot?.weaponProficiencies) addFixed(C.backgroundSnapshot.weaponProficiencies, weaponSet);

  collectFixedFeatureProfs(C, 'armorProficiencies').forEach(v => armorSet.add(v));
  collectFixedFeatureProfs(C, 'weaponProficiencies').forEach(v => weaponSet.add(v));

  if (C?.choices) {
    for (const [key, val] of Object.entries(C.choices)) {
      if (!val) continue;
      const lk = key.toLowerCase();
      const vals = Array.isArray(val) ? val : [val];
      if (lk.includes('mastery') && lk.includes('weapon')) {
        vals.forEach(v => { const n = normalizeLabel(v); if (n) weaponMasterySet.add(n); });
        continue;
      }
      if (lk.includes('armor')) vals.forEach(v => { const n = normalizeLabel(v); if (n) armorSet.add(n); });
      if (lk.includes('weapon')) vals.forEach(v => { const n = normalizeLabel(v); if (n) weaponSet.add(n); });
    }
  }

  collectAdapterProfGrants(C)
    .filter(g => g.type === 'armor' || g.type === 'weapon')
    .forEach(g => {
      const vals = Array.isArray(g.values) ? g.values : [g.values];
      if (g.display !== false) {
        vals.map(normalizeLabel).filter(Boolean).forEach(v => {
          if (g.type === 'armor') armorSet.add(v);
          else weaponSet.add(v);
        });
      }
    });

  return { armorSet, weaponSet, weaponMasterySet, weaponRules };
}

export function getWeaponProficiencyInfo(C, item, weaponOverride) {
  if (!item || !['M', 'R'].includes(item.type)) return { proficient: true, source: '' };
  if (weaponOverride?.grantsProficiency) return { proficient: true, source: weaponOverride.label || weaponOverride.key || '' };

  const { weaponSet, weaponRules } = collectEquipmentProficiencySets(C);
  if (weaponRules.some(rule => weaponMatchesRule(item, rule))) return { proficient: true, source: 'Weapon Training' };

  const profKeys = Array.from(weaponSet).map(normKey).filter(Boolean);
  const hasAny = (...keys) => profKeys.some(k => keys.includes(k));

  const cat = weaponCategory(item);
  if (cat === 'simple' && hasAny('simple', 'simpleweapon', 'simpleweapons')) return { proficient: true, source: 'Simple Weapons' };
  if (cat === 'martial' && hasAny('martial', 'martialweapon', 'martialweapons')) return { proficient: true, source: 'Martial Weapons' };

  const nameKeys = weaponNameKeys(item);
  for (const nk of nameKeys) {
    if (profKeys.includes(nk) || profKeys.includes(nk + 's')) return { proficient: true, source: item.name || '' };
  }

  const isMelee = item.type === 'M';
  const isRanged = item.type === 'R';
  const isHeavy = itemHasProperty(item, ['h', 'heavy']);
  const isTwoHanded = itemHasProperty(item, ['2h', 'two-handed', 'twohanded']);

  for (const k of profKeys) {
    if (k === 'weapons' || k === 'allweapons') return { proficient: true, source: 'Weapons' };
    if (isMelee && (k === 'meleeweapons' || k === 'meleeweapon')) return { proficient: true, source: 'Melee Weapons' };
    if (isRanged && (k === 'rangedweapons' || k === 'rangedweapon')) return { proficient: true, source: 'Ranged Weapons' };
    if (isMelee && cat === 'simple' && k.includes('simple') && k.includes('melee')) return { proficient: true, source: 'Simple Melee Weapons' };
    if (isRanged && cat === 'simple' && k.includes('simple') && k.includes('ranged')) return { proficient: true, source: 'Simple Ranged Weapons' };
    if (isMelee && cat === 'martial' && k.includes('martial') && k.includes('melee')) {
      if (k.includes('withoutheavyortwohanded') || k.includes('withoutheavyortwohandedproperty')) {
        if (!isHeavy && !isTwoHanded) return { proficient: true, source: 'Melee Martial Weapons' };
      } else {
        return { proficient: true, source: 'Melee Martial Weapons' };
      }
    }
    if (isRanged && cat === 'martial' && k.includes('martial') && k.includes('ranged')) return { proficient: true, source: 'Martial Ranged Weapons' };
  }

  return { proficient: false, source: '' };
}

export function getArmorTrainingInfo(C, item) {
  if (!item || !['LA', 'MA', 'HA', 'S'].includes(item.type)) return { trained: true, kind: '' };
  const { armorSet } = collectEquipmentProficiencySets(C);
  const keys = Array.from(armorSet).map(normKey).filter(Boolean);
  const has = (...vals) => keys.some(k => vals.includes(k));
  if (item.type === 'LA') return { trained: has('light', 'lightarmor'), kind: 'Light Armor' };
  if (item.type === 'MA') return { trained: has('medium', 'mediumarmor'), kind: 'Medium Armor' };
  if (item.type === 'HA') return { trained: has('heavy', 'heavyarmor'), kind: 'Heavy Armor' };
  if (item.type === 'S') return { trained: has('shield', 'shields'), kind: 'Shield' };
  return { trained: true, kind: '' };
}

export function getUntrainedArmor(C, inventory) {
  return (inventory || [])
    .filter(i => i.equipped && ['LA', 'MA', 'HA', 'S'].includes(i.type))
    .map(item => ({ item, info: getArmorTrainingInfo(C, item) }))
    .filter(r => !r.info.trained);
}

export function hasNonProficientArmor(C, inventory) {
  return getUntrainedArmor(C, inventory).some(({ item }) => ['LA', 'MA', 'HA'].includes(item.type));
}

export function collectAllProficiencies(C) {
  const sp = C?.clsSnapshot?.startingProficiencies || {};
  const { armorSet, weaponSet } = collectEquipmentProficiencySets(C);
  const toolSet = new Set();
  const langSet = new Set();

  (C?.normalizedChoices?.tools || [])
    .map(normalizeLabel)
    .filter(Boolean)
    .forEach(v => toolSet.add(v));
  (C?.normalizedChoices?.languages || [])
    .map(normalizeLabel)
    .filter(Boolean)
    .forEach(v => langSet.add(v));

  const addFixed = (src, set) => {
    const arr = Array.isArray(src) ? src : [src];
    arr.forEach(entry => {
      if (!entry) return;
      if (typeof entry === 'string') {
        entry.split(/[;,]/)
          .filter((v) => !isChoicePlaceholder(v))
          .map(normalizeLabel)
          .filter(Boolean)
          .forEach(v => set.add(v));
        return;
      }
      Object.keys(entry)
        .filter(k => !CHOICE_KEYS.includes(k) && entry[k] !== false && !isChoicePlaceholder(k))
        .map(normalizeLabel)
        .filter(Boolean)
        .forEach(v => set.add(v));
    });
  };

  addFixed(sp.tools, toolSet);

  (C?.extraClasses || []).forEach((extra) => {
    const gained = getMulticlassProficiencies(extra?.name, extra?.cls);
    addFixed(gained.tools, toolSet);
    addFixed(gained.toolProficiencies, toolSet);
    addFixed(gained.languages, langSet);
    addFixed(gained.languageProficiencies, langSet);
  });

  const bg = C?.backgroundSnapshot || {};
  const species = C?.speciesSnapshot || {};
  if (species.toolProficiencies) addFixed(species.toolProficiencies, toolSet);
  if (species.languageProficiencies) addFixed(species.languageProficiencies, langSet);
  if (bg.toolProficiencies) addFixed(bg.toolProficiencies, toolSet);
  if (bg.languageProficiencies) addFixed(bg.languageProficiencies, langSet);

  collectFixedFeatureProfs(C, 'toolProficiencies').forEach(v => toolSet.add(v));
  collectFixedFeatureProfs(C, 'languageProficiencies').forEach(v => langSet.add(v));
  collectFixedFeatureProfs(C, 'skillToolLanguageProficiencies').forEach(v => toolSet.add(v));

  if (C?.choices) {
    for (const [key, val] of Object.entries(C.choices)) {
      if (!val) continue;
      const lk = key.toLowerCase();
      const vals = Array.isArray(val) ? val : [val];
      vals.forEach(v => {
        const typed = parseTypedProficiencyValue(v);
        if (typed) {
          if (typed.kind === 'tool') toolSet.add(typed.label);
          else if (typed.kind === 'language') langSet.add(typed.label);
          return;
        }
        if (isChoicePlaceholder(v)) return;
        if (lk.includes('tool') || lk.includes('instrument')) { const n = normalizeLabel(v); if (n) toolSet.add(n); }
        if (lk.includes('language')) { const n = normalizeLabel(v); if (n) langSet.add(n); }
      });
    }
  }

  collectAdapterProfGrants(C).forEach(g => {
    if (g.display === false) return;
    const vals = Array.isArray(g.values) ? g.values : [g.values];
    vals.map(normalizeLabel).filter(Boolean).forEach(v => {
      if (g.type === 'tool') toolSet.add(v);
      else if (g.type === 'language') langSet.add(v);
    });
  });

  langSet.add('Common');

  const sections = [];
  if (armorSet.size) sections.push({ title: 'Armor', items: Array.from(armorSet) });
  if (weaponSet.size) sections.push({ title: 'Weapons', items: Array.from(weaponSet) });
  if (toolSet.size) sections.push({ title: 'Tools', items: Array.from(toolSet) });
  if (langSet.size) sections.push({ title: 'Languages', items: Array.from(langSet) });
  return sections;
}
