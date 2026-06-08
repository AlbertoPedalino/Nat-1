// Aggregates magic-item effects from equipped+attuned inventory. Reads only
// structured 5etools fields (no text parsing of `entries`); items whose
// effects are not exposed as data are left to dedicated adapters.
//
// Consumers query the returned bag instead of re-walking inventory, so adding
// support for a new 5etools field requires one mapper case + one consumer.

import { parseSignedBonus } from './itemBonus.js';
import { isItemEffectActive } from './itemAttunement.js';
import { getItemNarrativeEffects } from './itemNarrativeEffects.js';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const SENSE_TYPES = ['darkvision', 'blindsight', 'truesight', 'tremorsense'];

const _cache = new WeakMap();

function createEmptyEffects() {
  return {
    abilityOverrides: {},
    abilityBonuses: {},
    speedOverride: {},
    speedBonus: {},
    speedMultiplier: {},
    speedEqual: {},
    resistances: [],
    immunities: [],
    vulnerabilities: [],
    conditionImmunities: [],
    senses: {},
    proficiencyBonus: 0,
    advantageOnSkill: new Map(),
    disadvantageOnAttackersAgainstYou: [],
    advantageOnSaveAgainst: new Map(),
    passiveTraits: [],
  };
}

function applyAbilityOverride(out, ability, value, source) {
  const key = String(ability || '').toLowerCase();
  if (!ABILITY_KEYS.includes(key)) return;
  const n = Number(value);
  if (!Number.isFinite(n)) return;
  const current = out.abilityOverrides[key];
  if (!current || n > current.value) {
    out.abilityOverrides[key] = { value: n, source };
  }
}

function applyAbilityBonus(out, ability, value) {
  const key = String(ability || '').toLowerCase();
  if (!ABILITY_KEYS.includes(key)) return;
  const n = parseSignedBonus(value);
  if (!n) return;
  out.abilityBonuses[key] = (out.abilityBonuses[key] || 0) + n;
}

function pushDefense(list, value, source) {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => pushDefense(list, entry, source));
    return;
  }
  if (typeof value === 'object') {
    if (value.special) pushDefense(list, value.special, source);
    if (value.note) pushDefense(list, value.note, source);
    Object.entries(value).forEach(([key, val]) => {
      if (['special', 'note', 'choose'].includes(key)) return;
      if (val === true) pushDefense(list, key, source);
      else if (typeof val === 'string') pushDefense(list, val, source);
      else if (Array.isArray(val)) pushDefense(list, val, source);
    });
    return;
  }
  const label = String(value).trim();
  if (!label) return;
  list.push({ label, source });
}

// 5etools `ability` field shapes:
//   {static: {str: 19}}                      → set score
//   {str: 2}                                 → additive
//   {choose: [{from: [...], count, amount}]} → choose-from-N (skipped: user picks)
//   {from: [...], count, amount}             → top-level choose (skipped)
function applyAbilityField(item, out, source) {
  const ability = item?.ability;
  if (!ability || typeof ability !== 'object') return;

  if (ability.static && typeof ability.static === 'object') {
    Object.entries(ability.static).forEach(([abil, value]) => {
      applyAbilityOverride(out, abil, value, source);
    });
  }

  ABILITY_KEYS.forEach((key) => {
    if (ability[key] != null) applyAbilityBonus(out, key, ability[key]);
  });
}

// 5etools `modifySpeed` shapes:
//   {static: {walk: 30}}                     → set minimum
//   {multiply: {walk: 2}}                    → multiplier
//   {equal: {climb: "walk"}}                 → copy from another mode
//   {bonus: {walk: 10}}                      → additive
function applyModifySpeed(item, out, source) {
  const mod = item?.modifySpeed;
  if (!mod || typeof mod !== 'object') return;

  if (mod.static && typeof mod.static === 'object') {
    Object.entries(mod.static).forEach(([mode, value]) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return;
      const cur = out.speedOverride[mode];
      if (!cur || n > cur.value) out.speedOverride[mode] = { value: n, source };
    });
  }
  if (mod.bonus && typeof mod.bonus === 'object') {
    Object.entries(mod.bonus).forEach(([mode, value]) => {
      const n = parseSignedBonus(value);
      if (n) out.speedBonus[mode] = (out.speedBonus[mode] || 0) + n;
    });
  }
  if (mod.multiply && typeof mod.multiply === 'object') {
    Object.entries(mod.multiply).forEach(([mode, value]) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return;
      const cur = out.speedMultiplier[mode];
      if (!cur || n > cur.value) out.speedMultiplier[mode] = { value: n, source };
    });
  }
  if (mod.equal && typeof mod.equal === 'object') {
    Object.entries(mod.equal).forEach(([targetMode, fromMode]) => {
      out.speedEqual[targetMode] = { from: String(fromMode || ''), source };
    });
  }
}

function applySensesField(out, value) {
  const list = Array.isArray(value) ? value : [value];
  list.forEach((entry) => {
    if (entry == null) return;
    if (typeof entry === 'object') {
      Object.entries(entry).forEach(([type, dist]) => {
        const senseType = String(type).toLowerCase();
        const n = Number(dist);
        if (!SENSE_TYPES.includes(senseType) || !Number.isFinite(n)) return;
        out.senses[senseType] = Math.max(out.senses[senseType] || 0, n);
      });
      return;
    }
    const match = String(entry).match(/(darkvision|blindsight|truesight|tremorsense)\s*(\d+)/i);
    if (!match) return;
    const type = match[1].toLowerCase();
    const dist = Number(match[2]);
    if (Number.isFinite(dist)) {
      out.senses[type] = Math.max(out.senses[type] || 0, dist);
    }
  });
}

function applyChoiceAbilityBonus(item, out) {
  const choice = item?.abilityChoice;
  if (!choice || typeof choice !== 'object') return;
  const choose = item?.ability?.choose;
  const topChoose = item?.ability?.from;
  const groups = Array.isArray(choose) ? choose : (topChoose ? [{ from: topChoose, count: item.ability.count, amount: item.ability.amount }] : []);
  if (!groups.length) return;
  groups.forEach((group, idx) => {
    const picks = choice[idx] || choice;
    if (!picks) return;
    const list = Array.isArray(picks) ? picks : [picks];
    list.forEach((pick) => {
      const key = String(pick || '').toLowerCase();
      if (!ABILITY_KEYS.includes(key)) return;
      applyAbilityBonus(out, key, group.amount ?? 2);
    });
  });
}

function applyNarrativeEffects(item, out) {
  const narrative = getItemNarrativeEffects(item?.name, item?.source);
  if (!narrative) return;
  const source = item.name || '';

  if (Array.isArray(narrative.advantageOnSkill)) {
    narrative.advantageOnSkill.forEach((skill) => {
      const key = String(skill || '').toLowerCase();
      if (!key) return;
      const existing = out.advantageOnSkill.get(key) || [];
      out.advantageOnSkill.set(key, [...existing, source]);
    });
  }
  if (narrative.disadvantageOnAttackersAgainstYou) {
    out.disadvantageOnAttackersAgainstYou.push({ note: narrative.disadvantageOnAttackersAgainstYou, source });
  }
  if (Array.isArray(narrative.advantageOnSaveAgainst)) {
    narrative.advantageOnSaveAgainst.forEach((target) => {
      const key = String(target || '').toLowerCase();
      if (!key) return;
      const existing = out.advantageOnSaveAgainst.get(key) || [];
      out.advantageOnSaveAgainst.set(key, [...existing, source]);
    });
  }
  if (Array.isArray(narrative.conditionImmunities)) {
    narrative.conditionImmunities.forEach((cond) => {
      const label = String(cond || '').trim();
      if (!label) return;
      out.conditionImmunities.push({ label, source });
    });
  }
  if (Array.isArray(narrative.passiveTraits)) {
    narrative.passiveTraits.forEach((trait) => {
      const text = String(trait || '').trim();
      if (!text) return;
      out.passiveTraits.push({ text, source });
    });
  }
}

function applyItemToEffects(item, out) {
  const source = item.name || '';

  // Ability score effects (set / bonus). 5etools field `ability`.
  applyAbilityField(item, out, source);

  // User-picked bonus from `ability.choose` / `ability.from` (Deck of Many
  // Things, Book of Vile Darkness, etc.). Choice persisted on the inventory
  // item as `abilityChoice`.
  applyChoiceAbilityBonus(item, out);

  // Speed effects (set / bonus / multiply / equal). 5etools field `modifySpeed`.
  applyModifySpeed(item, out, source);

  // Damage / condition defenses (Armor of Resistance, Ring of Resistance,
  // Periapt of Proof Against Poison, etc.).
  if (item.resist) pushDefense(out.resistances, item.resist, source);
  if (item.immune) pushDefense(out.immunities, item.immune, source);
  if (item.vulnerable) pushDefense(out.vulnerabilities, item.vulnerable, source);
  if (item.conditionImmune) pushDefense(out.conditionImmunities, item.conditionImmune, source);

  // Senses (Goggles of Night → darkvision 60).
  if (item.senses) applySensesField(out, item.senses);

  // Proficiency bonus (Ioun Stone, Mastery → +1 PB).
  if (item.bonusProficiencyBonus != null) {
    out.proficiencyBonus += parseSignedBonus(item.bonusProficiencyBonus);
  }

  // Narrative effects (advantage on skill checks, attackers disadvantage,
  // advantage on saves vs spells, etc.). Patched in from a local map since
  // 5etools does not structure these.
  applyNarrativeEffects(item, out);
}

function computeEffects(inventory) {
  const out = createEmptyEffects();
  (inventory || []).forEach((rawItem) => {
    if (!isItemEffectActive(rawItem)) return;
    applyItemToEffects(rawItem, out);
  });
  return out;
}

export function collectItemEffects(inventory) {
  if (!Array.isArray(inventory) || inventory.length === 0) {
    return createEmptyEffects();
  }
  const cached = _cache.get(inventory);
  if (cached) return cached;
  const result = computeEffects(inventory);
  _cache.set(inventory, result);
  return result;
}

function consumedBonusFor(C, key) {
  const list = Array.isArray(C?.consumedItemBonuses) ? C.consumedItemBonuses : [];
  return list
    .filter((entry) => String(entry?.ability || '').toLowerCase() === key)
    .reduce((sum, entry) => sum + (Number(entry?.value) || 0), 0);
}

export function getFinalAbilityScore(C, stat, baseScore) {
  const effects = collectItemEffects(C?.inventory);
  const key = String(stat || '').toLowerCase();
  const consumed = consumedBonusFor(C, key);
  const withBonus = baseScore + (effects.abilityBonuses[key] || 0) + consumed;
  const override = effects.abilityOverrides[key];
  return override != null ? Math.max(withBonus, override.value) : withBonus;
}

// Consumable Tome/Manual heuristic: name starts with `Manual of` or `Tome of`,
// no attunement requirement, and the 5etools `ability` field carries an
// additive (non-`static`, non-`choose`) bonus to a single ability. Matches the
// XPHB/XDMG "study for 48 hours" pattern without enumerating each book.
export function isConsumableTome(item) {
  if (!item?.name) return false;
  if (item.reqAttune) return false;
  if (!item.ability || typeof item.ability !== 'object') return false;
  if (item.ability.static || item.ability.choose || item.ability.from) return false;
  if (!ABILITY_KEYS.some((key) => item.ability[key] != null)) return false;
  return /^(Manual of|Tome of)\s/i.test(item.name);
}

export function extractTomeBonus(item) {
  if (!isConsumableTome(item)) return null;
  for (const key of ABILITY_KEYS) {
    if (item.ability[key] != null) {
      const value = Number(item.ability[key]);
      if (Number.isFinite(value)) return { ability: key, value, source: item.name };
    }
  }
  return null;
}

export function hasAbilityChoice(item) {
  return !!(item?.ability?.choose || item?.ability?.from);
}

export function getAbilityChoiceGroups(item) {
  const ab = item?.ability;
  if (!ab) return [];
  if (Array.isArray(ab.choose)) return ab.choose;
  if (ab.from) return [{ from: ab.from, count: ab.count || 1, amount: ab.amount ?? 2 }];
  return [];
}

export function collectItemResistanceItems(C) {
  return collectItemEffects(C?.inventory).resistances
    .map((entry) => ({ label: entry.label, kind: 'Resistance', source: entry.source }));
}

export function collectItemImmunityItems(C) {
  return collectItemEffects(C?.inventory).immunities
    .map((entry) => ({ label: entry.label, kind: 'Immunity', source: entry.source }));
}

export function collectItemVulnerabilityItems(C) {
  return collectItemEffects(C?.inventory).vulnerabilities
    .map((entry) => ({ label: entry.label, kind: 'Vulnerability', source: entry.source }));
}

export function collectItemConditionImmunityItems(C) {
  return collectItemEffects(C?.inventory).conditionImmunities
    .map((entry) => ({ label: entry.label, kind: 'Condition Immunity', source: entry.source }));
}

export function getItemSpeedOverride(C, mode = 'walk') {
  const override = collectItemEffects(C?.inventory).speedOverride[mode];
  return override ? override.value : null;
}

export function getItemSpeedBonus(C, mode = 'walk') {
  return collectItemEffects(C?.inventory).speedBonus[mode] || 0;
}

export function getItemSpeedMultiplier(C, mode = 'walk') {
  const mul = collectItemEffects(C?.inventory).speedMultiplier[mode];
  return mul ? mul.value : 1;
}

export function getItemSpeedEqual(C, mode) {
  return collectItemEffects(C?.inventory).speedEqual[mode] || null;
}

export function getItemSenses(C) {
  return collectItemEffects(C?.inventory).senses;
}

export function getItemProficiencyBonus(C) {
  return collectItemEffects(C?.inventory).proficiencyBonus || 0;
}

export function getItemAdvantageOnSkill(C, skillName) {
  const map = collectItemEffects(C?.inventory).advantageOnSkill;
  const key = String(skillName || '').toLowerCase();
  return map.get(key) || null;
}

export function getItemAdvantageOnSave(C, target) {
  const map = collectItemEffects(C?.inventory).advantageOnSaveAgainst;
  const key = String(target || '').toLowerCase();
  return map.get(key) || null;
}

export function getItemAttackerDisadvantage(C) {
  return collectItemEffects(C?.inventory).disadvantageOnAttackersAgainstYou;
}

export function getItemPassiveTraits(C) {
  return collectItemEffects(C?.inventory).passiveTraits;
}
