import { ITEM_SOURCE_PRIORITY, sourceRank } from '../sourcePriority.js';
import { matchKey, stripSource } from '../nameKeys.js';
import { loadGameData } from '../gameData.js';
import { stripTemplatedEntries } from './entryTemplates.js';
import {
  canonicalItemSource,
  formatLeadingBonusName,
  isItem2024,
  itemKey,
  itemRecordKey,
  itemRef,
  itemSource,
  withCanonicalSource,
} from './itemRecords.js';
import { expandMagicVariants, isAllowedMagicVariant, resolveCopyRecords } from './itemVariants.js';

// The item catalog of the supported manuals: base items, magic items and
// expanded magic variants, one record per name, normalized and adapter-enriched.

const SCF_TYPE_FOCUS = {
  arcane: ['Sorcerer', 'Warlock', 'Wizard'],
  druidic: ['Druid', 'Ranger'],
  holy: ['Cleric', 'Paladin'],
};

function focusForScfType(scfType) {
  return SCF_TYPE_FOCUS[String(scfType || '').toLowerCase()] || null;
}

function buildMissingGroupParents(items) {
  const existingKeys = new Set(items.map((item) => itemRecordKey(item, canonicalItemSource(item) || itemSource(item))));
  const groups = new Map();

  items.forEach((item) => {
    const source = canonicalItemSource(item) || itemSource(item);
    if (!ITEM_SOURCE_PRIORITY.includes(source) || !Array.isArray(item.group)) return;
    item.group.forEach((groupName) => {
      const name = String(groupName || '').trim();
      if (!name) return;
      const key = itemKey(name, source);
      if (existingKeys.has(key)) return;
      if (!groups.has(key)) {
        groups.set(key, {
          name,
          source,
          type: item.type || 'G',
          rarity: item.rarity || 'none',
          scfType: item.scfType || null,
          focus: Array.isArray(item.focus) ? item.focus.slice() : focusForScfType(item.scfType),
          items: [],
          entries: [],
          generatedGroupParent: true,
        });
      }
      const group = groups.get(key);
      const ref = itemRef(item);
      if (ref && !group.items.includes(ref)) group.items.push(ref);
    });
  });

  return [...groups.values()];
}

export async function loadItems() {
  const [base, magic, variants] = await Promise.allSettled([
    loadGameData('items-base.json'),
    loadGameData('items.json'),
    loadGameData('magicvariants.json'),
  ]);

  const rawBaseItems = base.status === 'fulfilled' ? resolveCopyRecords(base.value.baseitem || []) : [];
  const rawDataItems = magic.status === 'fulfilled' ? resolveCopyRecords(magic.value.item || []) : [];

  const baseItems = base.status === 'fulfilled'
    ? rawBaseItems
        .filter(isItem2024)
        .map(withCanonicalSource)
    : [];

  const magicItems = magic.status === 'fulfilled'
    ? rawDataItems
        .filter(isItem2024)
        .map(withCanonicalSource)
    : [];

  const magicVariants = variants.status === 'fulfilled'
    ? expandMagicVariants(
        resolveCopyRecords(variants.value.magicvariant || []).filter(isAllowedMagicVariant),
        baseItems,
      ).map(withCanonicalSource)
    : [];

  const fetchedItems = [...baseItems, ...magicItems, ...magicVariants];
  const fallback = fetchedItems.length === 0
    ? ITEM_SUMMARIES.map(withCanonicalSource)
    : [];
  const all = [...fallback, ...fetchedItems].filter(isItem2024);
  all.push(...buildMissingGroupParents(all));

  const byName = new Map();
  all.forEach((item) => {
    if (!item?.name) return;
    const key = matchKey(formatLeadingBonusName(item.name));
    const existing = byName.get(key);
    if (!existing) { byName.set(key, item); return; }
    if (shouldReplaceItem(existing, item)) byName.set(key, item);
  });

  const items = [...byName.values()]
    .map(normalizeItem)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Every consumer, including sheet reconciliation, receives adapter-enriched
  // data. Lazy imports keep the Vite adapter discovery out of pure Node loaders.
  const [{ loadItemAdapters }, { applyItemAdapters }] = await Promise.all([
    import('../../../adapters/index.js'),
    import('../../../adapters/adapterPipeline.js'),
  ]);
  const context = { items };
  const registry = await loadItemAdapters(context);
  return items.map((item) => applyItemAdapters(item, registry, context));
}

// Item groups (Belt of Giant Strength and its six belts…): the same file the
// item load reads, so this costs no second download.
export async function loadItemGroups() {
  const data = await loadGameData('items.json');
  return data.itemGroup || [];
}

function sourcePriority(item) {
  const source = canonicalItemSource(item);
  return sourceRank(source, ITEM_SOURCE_PRIORITY);
}

function shouldReplaceItem(existing, incoming) {
  const incomingPriority = sourcePriority(incoming);
  const existingPriority = sourcePriority(existing);
  if (incomingPriority !== existingPriority) return incomingPriority < existingPriority;

  const incomingRichness = itemRichness(incoming);
  const existingRichness = itemRichness(existing);
  if (incomingRichness !== existingRichness) return incomingRichness > existingRichness;

  return Boolean(incoming.sourceAlias) === false && Boolean(existing.sourceAlias);
}

function itemRichness(item) {
  let score = 0;
  if (item.dmg1) score += 4;
  if (item.ac) score += 4;
  if (Array.isArray(item.property) && item.property.length) score += 2;
  if (item.weaponCategory) score += 2;
  if (Array.isArray(item.entries) && item.entries.length) score += 1;
  if (item.type && !['weapon', 'armor', 'gear', 'magic'].includes(String(item.type).toLowerCase())) score += 1;
  if (item.scfType) score += 1;
  if (Array.isArray(item.focus) && item.focus.length) score += 1;
  if (Array.isArray(item.items) && item.items.length) score += 1;
  if (Array.isArray(item.group) && item.group.length) score += 1;
  return score;
}

function normalizeItem(item) {
  const rawType = item.type ? stripSource(item.type) : '';
  return {
    name: formatLeadingBonusName(item.name),
    source: canonicalItemSource(item) || item.source || '',
    sourceAlias: item.sourceAlias || null,
    type: rawType || 'gear',
    rarity: item.rarity || 'none',
    wondrous: !!item.wondrous,
    curse: !!item.curse,
    weight: Number(item.weight || 0),
    value: Number(item.value || 0),
    weaponCategory: item.weaponCategory || null,
    age: item.age || null,
    bonusVariant: item.bonusVariant || null,
    mastery: Array.isArray(item.mastery) ? item.mastery.map((m) => stripSource(m)) : null,
    dmg1: item.dmg1 || null,
    dmg2: item.dmg2 || null,
    dmgType: item.dmgType || null,
    ac: item.ac || null,
    strength: item.strength || null,
    stealth: !!item.stealth,
    bonusWeapon: item.bonusWeapon || null,
    bonusWeaponAttack: item.bonusWeaponAttack || null,
    bonusWeaponDamage: item.bonusWeaponDamage || null,
    bonusAc: item.bonusAc || null,
    bonusSavingThrow: item.bonusSavingThrow || null,
    bonusAbilityCheck: item.bonusAbilityCheck || null,
    bonusSpellAttack: item.bonusSpellAttack || null,
    bonusSpellSaveDc: item.bonusSpellSaveDc || null,
    ability: item.ability || null,
    modifySpeed: item.modifySpeed || null,
    senses: item.senses || null,
    resist: item.resist || null,
    immune: item.immune || null,
    vulnerable: item.vulnerable || null,
    conditionImmune: item.conditionImmune || null,
    attachedSpells: item.attachedSpells || null,
    spellScrollLevel: Number.isInteger(item.spellScrollLevel) ? item.spellScrollLevel : null,
    bonusProficiencyBonus: item.bonusProficiencyBonus || null,
    reqAttune: item.reqAttune ?? null,
    reqAttuneAlt: item.reqAttuneAlt ?? null,
    reqAttuneTags: item.reqAttuneTags
      ? (Array.isArray(item.reqAttuneTags) ? item.reqAttuneTags.map((tag) => ({ ...tag })) : [{ ...item.reqAttuneTags }])
      : null,
    charges: item.charges ?? null,
    recharge: item.recharge || null,
    rechargeAmount: item.rechargeAmount || null,
    property: Array.isArray(item.property) ? item.property.map((p) => stripSource(p)) : [],
    entries: Array.isArray(item.entries) ? stripTemplatedEntries(item.entries) : (item.entries || []),
    packContents: item.packContents || null,
    scfType: item.scfType || null,
    focus: Array.isArray(item.focus) ? item.focus.slice() : null,
    miscTags: Array.isArray(item.miscTags) ? item.miscTags.slice() : [],
    items: Array.isArray(item.items) ? item.items.slice() : null,
    group: Array.isArray(item.group) ? item.group.slice() : null,
    generatedGroupParent: !!item.generatedGroupParent,
    baseItem: item.baseItem || null,
    variantName: item.variantName || null,
    variantSource: item.variantSource || null,
  };
}

export const ITEM_SUMMARIES = [
  { name: 'Longsword', type: 'weapon', source: 'XPHB', weight: 3, value: 1500 },
  { name: 'Shield', type: 'armor', source: 'XPHB', weight: 6, value: 1000 },
  { name: 'Explorer Pack', type: 'gear', source: 'XPHB', weight: 59, value: 1000 },
  { name: 'Potion of Healing', type: 'magic', source: 'XDMG', weight: 0.5, value: 5000 },
];
