import { installedRegistry } from '../../../adapters/index.js';
import { canonicalDisplayLabel, cleanProficiencyText } from '../../../shared/character/proficiencyDisplay.js';
import { matchesRequiredChoice } from '../../../shared/character/lineageMatch.js';
import { inventoryHasFlag } from '../../../shared/character/choiceUtils.js';
import { weaponFilterMatches } from '../../../shared/character/weaponFilters.js';
import { collectOwnedFeatNames } from '../../../shared/character/selectedFeats.js';
import { isFeatKey, isFeatDetailKey } from '../../../shared/featChoiceKeys.js';

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    return cleanText(value.name ?? value.label ?? value.value ?? value.key ?? value.id);
  }
  return cleanProficiencyText(value);
}

function norm(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const DAMAGE_TYPES = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
];

function displayLabel(value) {
  return canonicalDisplayLabel(value);
}

function ownerLevelOf(character, className, isPrimary) {
  if (isPrimary) return Number(character?.classLevel || character?.level || 1);
  const found = (character?.extraClasses || []).find((entry) => norm(entry?.name) === norm(className));
  return Number(found?.level || 1);
}

export function selectedFeatNames(character) {
  const out = new Set();

  collectOwnedFeatNames(character).forEach((feat) => {
    const text = cleanText(feat).split('|')[0];
    if (text) out.add(text);
  });

  asArray(character?.allFeatSnapshots).forEach((feat) => {
    if (feat?.name) out.add(feat.name);
  });

  asArray(character?.normalizedChoices?.feats?.selected).forEach((feat) => {
    if (feat) out.add(cleanText(feat).split('|')[0]);
  });

  // Choice-granted feats: free/ASI feat slots, epic boons, AND fighting styles.
  // `isFeatKey` recognizes 'fightingstyle' keys (e.g. fighter_fighting_style),
  // which a plain 'feat'/'boon' substring test misses — so the Defense style's
  // acBonus would silently vanish whenever allFeatSnapshots is incomplete.
  // Detail keys (e.g. *_skill, *_asi) carry non-feat values; skip them.
  Object.entries(character?.choices || {}).forEach(([key, value]) => {
    if (!isFeatKey(key) || isFeatDetailKey(key)) return;
    asArray(value).forEach((item) => {
      const text = cleanText(item).split('|')[0];
      if (text) out.add(text);
    });
  });

  return [...out].filter(Boolean);
}

function conditionPasses(effect, context) {
  if (typeof effect?.condition !== 'function') return true;
  try {
    return !!effect.condition(context.character, context);
  } catch (_) {
    try {
      return !!effect.condition(context);
    } catch {
      return false;
    }
  }
}

function requiredChoicePasses(effect, character) {
  const rc = effect?.requiredChoice;
  if (!rc?.key) return true;
  return matchesRequiredChoice(character, rc);
}

function requiredItemFlagPasses(effect, character) {
  const requirement = effect?.requiredItemFlag;
  if (!requirement) return true;
  const inv = character?.inventory || [];
  return inventoryHasFlag(inv, requirement);
}

function effectIsActive(effect, context) {
  if (!effect || typeof effect !== 'object') return false;
  const minLevel = Number(effect.minLevel || 1);
  if (Number(context.ownerLevel || 1) < minLevel) return false;
  if (!requiredChoicePasses(effect, context.character)) return false;
  if (!requiredItemFlagPasses(effect, context.character)) return false;
  return conditionPasses(effect, context);
}

function annotate(effect, meta) {
  return {
    ...effect,
    ownerName: meta.ownerName,
    ownerType: meta.ownerType,
    ownerLevel: meta.ownerLevel,
    sourceKey: meta.sourceKey,
  };
}

function dedupeEffects(effects) {
  const byKey = new Map();

  effects.forEach((effect) => {
    const key = [
      norm(effect.type),
      norm(effect.key || effect.note || effect.senseType || effect.speedType || effect.ability || effect.target || ''),
      norm(asArray(effect.damageTypes).join(',')),
      norm(asArray(effect.conditions).join(',')),
      norm(effect.ownerName),
      String(effect.minLevel || ''),
    ].join('|');

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, effect);
      return;
    }

    const existingScore = String(existing.note || '').length + (existing.ownerType === 'runtime' ? 0 : 20);
    const nextScore = String(effect.note || '').length + (effect.ownerType === 'runtime' ? 0 : 20);
    if (nextScore > existingScore) byKey.set(key, effect);
  });

  return [...byKey.values()];
}

function collectFromList(out, list, meta, character) {
  const context = { character, ownerLevel: meta.ownerLevel, ownerName: meta.ownerName, ownerType: meta.ownerType };
  asArray(list).forEach((effect) => {
    if (!effectIsActive(effect, context)) return;
    out.push(annotate(effect, meta));
  });
}

function choiceValue(character, key) {
  if (!key) return null;

  const direct = character?.choices?.[key];
  if (direct != null) return direct;

  const normalized = character?.normalizedChoices || {};
  const byKey = normalized.rawByKey || {};
  if (byKey[key] != null) return byKey[key];

  const buckets = [
    normalized.classOptions,
    normalized.subclassOptions,
    normalized.species?.options,
    normalized.background?.options,
    normalized.feats?.byKey,
    normalized.spells?.byKey,
  ];

  for (const bucket of buckets) {
    if (bucket && bucket[key] != null) return bucket[key];
  }

  const found = Object.entries(character?.choices || {}).find(([choiceKey]) => (
    String(choiceKey || '').replace(/^mc\d+_/, '') === key
  ));
  return found ? found[1] : null;
}

function firstChoiceText(character, key) {
  const value = choiceValue(character, key);
  const first = asArray(value).find((item) => item != null && item !== '');
  return cleanText(first).split('|')[0];
}

function parentheticalDamageType(text) {
  const match = cleanText(text).match(/\(([^)]+)\)/);
  if (!match) return '';
  const inside = match[1];
  return DAMAGE_TYPES.find((type) => norm(type) === norm(inside)) || '';
}

function inferDamageTypeFromText(text) {
  const cleaned = cleanText(text);
  const inParen = parentheticalDamageType(cleaned);
  if (inParen) return inParen;

  const compact = norm(cleaned);
  const direct = DAMAGE_TYPES.find((type) => compact.includes(norm(type)));
  if (direct) return direct;

  return '';
}

function normalizeChoiceToken(value) {
  return cleanText(value)
    .split('|')[0]
    .split('(')[0]
    .replace(/\bdragon\b/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function lookupMapValue(map, choice) {
  if (!map || typeof map !== 'object' || !choice) return '';
  const token = normalizeChoiceToken(choice);
  if (!token) return '';
  const direct = Object.entries(map).find(([k]) => normalizeChoiceToken(k) === token);
  if (direct) return direct[1];
  const partial = Object.entries(map).find(([k]) => {
    const nk = normalizeChoiceToken(k);
    return nk && (token.includes(nk) || nk.includes(token));
  });
  return partial ? partial[1] : '';
}

function resolveChoiceValue(effect, character) {
  const choice = firstChoiceText(character, effect?.key);
  if (!choice) return '';

  const map = effect?.map || effect?.valueMap;
  if (map) {
    const mapped = lookupMapValue(map, choice);
    if (mapped) return mapped;
  }

  const fromChoice = inferDamageTypeFromText(choice);
  if (fromChoice) return fromChoice;

  if (effect?.damageTypes) return asArray(effect.damageTypes).map(displayLabel).join(', ');
  return displayLabel(choice);
}

export function collectSheetEffects(character = {}) {
  const out = [];

  const entities = [
    {
      className: character.className,
      subclassShortName: character.subclassShortName,
      ownerName: character.className,
      ownerLevel: ownerLevelOf(character, character.className, true),
      isPrimary: true,
    },
    ...(character.extraClasses || []).map((entry) => ({
      className: entry.name,
      subclassShortName: entry.subclassShortName,
      ownerName: entry.name,
      ownerLevel: Number(entry.level || 1),
      isPrimary: false,
    })),
  ].filter((entry) => entry.className);

  entities.forEach((entity) => {
    collectFromList(out, installedRegistry.getClassSheetEffects(entity.className), {
      ownerName: entity.className,
      ownerType: 'class',
      ownerLevel: entity.ownerLevel,
      sourceKey: entity.className,
    }, character);

    if (entity.subclassShortName) {
      collectFromList(out, installedRegistry.getSubclassSheetEffects(entity.className, entity.subclassShortName), {
        ownerName: entity.subclassShortName,
        ownerType: 'subclass',
        ownerLevel: entity.ownerLevel,
        sourceKey: `${entity.className}_${entity.subclassShortName}`,
      }, character);
    }
  });

  if (character.speciesName) {
    collectFromList(out, installedRegistry.getSpeciesSheetEffects(character.speciesName, character.speciesSource), {
      ownerName: character.speciesName,
      ownerType: 'species',
      ownerLevel: Number(character.level || 1),
      sourceKey: `${character.speciesName}_${character.speciesSource || ''}`,
    }, character);
  }

  selectedFeatNames(character).forEach((feat) => {
    collectFromList(out, installedRegistry.getFeatSheetEffects(feat), {
      ownerName: feat,
      ownerType: 'feat',
      ownerLevel: Number(character.level || 1),
      sourceKey: feat,
    }, character);
  });

  return dedupeEffects(out);
}

export function effectTitle(effect) {
  const type = cleanText(effect?.type);
  const normalizedType = norm(type);

  const labels = {
    resistance: 'Resistance',
    'resistance-choice': 'Resistance',
    immunity: 'Immunity',
    'immunity-choice': 'Immunity',
    conditionImmunity: 'Condition Immunity',
    sense: 'Sense',
    darkvision: 'Darkvision',
    telepathy: 'Telepathy',
    speed: 'Speed',
    flySpeed: 'Fly Speed',
    climbSpeed: 'Climb Speed',
    swimSpeed: 'Swim Speed',
    acFormula: 'Armor Class Formula',
    unarmoredDefense: 'Unarmored Defense',
    hpBonus: 'HP Bonus',
    armorTraining: 'Armor Training',
    weaponTraining: 'Weapon Training',
    toolProficiency: 'Tool Proficiency',
    skillProficiency: 'Skill Proficiency',
    expertise: 'Expertise',
    extraAttack: 'Extra Attack',
    critRange: 'Critical Range',
    advantage: 'Advantage',
  };

  if (labels[type]) return labels[type];
  if (normalizedType.includes('resistance')) return 'Resistance';
  if (normalizedType.includes('immunity')) return 'Immunity';
  if (normalizedType.includes('sense')) return 'Sense';
  if (normalizedType.includes('speed')) return 'Speed';

  const note = cleanText(effect?.note);
  if (note) return note;

  return type || 'Effect';
}

export function effectSummary(effect, character = {}) {
  const parts = [];
  const type = norm(effect?.type);

  if (type.includes('resistancechoice') || type.includes('immunitychoice')) {
    const resolved = resolveChoiceValue(effect, character);
    if (resolved) parts.push(resolved);
    else parts.push('Choose');
  } else if (effect?.damageTypes) {
    parts.push(asArray(effect.damageTypes).map(displayLabel).join(', '));
  }

  if (effect?.conditions) parts.push(asArray(effect.conditions).map(displayLabel).join(', '));
  if (effect?.values) parts.push(asArray(effect.values).map(displayLabel).join(', '));
  if (effect?.value != null) parts.push(displayLabel(effect.value));
  if (effect?.ability) parts.push(cleanText(effect.ability).toUpperCase());
  if (effect?.skill) parts.push(displayLabel(effect.skill));
  if (effect?.target) parts.push(displayLabel(effect.target));
  if (effect?.key && !String(effect.key).startsWith('subclass_')) parts.push(cleanText(effect.key));

  const note = cleanText(effect?.note);
  if (note && !parts.some((part) => norm(note).includes(norm(part)))) parts.push(note);

  return parts.filter(Boolean).join(' • ');
}

export function effectCategory(effect) {
  const type = norm(effect?.type);

  if (
    type.includes('resistance')
    || type.includes('immunity')
    || type.includes('defense')
    || type.includes('ward')
    || type.includes('damagereduction')
    || type.includes('unarmored')
    || type.includes('acformula')
    || type.includes('acbonus')
    || type.includes('hprelated')
    || type.includes('hpbonus')
  ) return 'Defenses';

  if (
    type.includes('sense')
    || type.includes('darkvision')
    || type.includes('truesight')
    || type.includes('telepathy')
    || type.includes('underwaterbreathing')
  ) return 'Senses & Awareness';

  if (
    type.includes('speed')
    || type.includes('fly')
    || type.includes('climb')
    || type.includes('swim')
    || type.includes('teleport')
    || type.includes('mobility')
    || type.includes('reach')
    || type.includes('jump')
  ) return 'Movement';

  if (
    type.includes('proficiency')
    || type.includes('training')
    || type.includes('expertise')
    || type.includes('language')
    || type.includes('tool')
  ) return 'Proficiencies';

  if (
    type.includes('attack')
    || type.includes('damage')
    || type.includes('crit')
    || type.includes('initiative')
    || type.includes('save')
    || type.includes('extra')
    || type.includes('reroll')
    || type.includes('d20')
  ) return 'Combat';

  if (
    type.includes('spell')
    || type.includes('cantrip')
    || type.includes('magic')
    || type.includes('metamagic')
    || type.includes('summon')
  ) return 'Magic';

  return 'Passive Traits';
}

export function collectEffectCategories(character = {}) {
  const grouped = {};
  collectSheetEffects(character).forEach((effect) => {
    const cat = effectCategory(effect);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(effect);
  });
  return grouped;
}

// Known sense-effect type tokens. Adapters may register either `type:'sense'`
// (+ senseType) or the sense name directly (e.g. Shadow Arts → type:'darkvision').
const SENSE_EFFECT_TYPES = [
  'sense', 'darkvision', 'devilssight', 'blindsight', 'truesight', 'tremorsense',
  'telepathy', 'underwaterbreathing',
];

export function collectSenseEffects(character = {}) {
  return collectSheetEffects(character).filter((effect) => {
    if (effect.senseType) return true;
    const type = norm(effect.type);
    return SENSE_EFFECT_TYPES.some((token) => type.includes(token));
  });
}

export function collectMovementEffects(character = {}) {
  return collectSheetEffects(character).filter((effect) => {
    const type = norm(effect.type);
    return type.includes('speed')
      || type.includes('fly')
      || type.includes('climb')
      || type.includes('swim')
      || type.includes('teleport')
      || type.includes('mobility')
      || type.includes('reach')
      || type.includes('jump');
  });
}

export function collectResistanceEffects(character = {}) {
  return collectSheetEffects(character).filter((effect) => norm(effect.type).includes('resistance'));
}


function splitDefenseText(value) {
  return cleanText(value)
    .split(/[;,/]/)
    .map((item) => displayLabel(item))
    .filter(Boolean);
}

function defenseItemsFromBlock(block, kind, source) {
  const out = [];

  const push = (label) => {
    const text = displayLabel(label);
    if (!text) return;
    out.push({ label: text, kind, source });
  };

  if (block == null) return out;

  if (typeof block === 'string') {
    splitDefenseText(block).forEach(push);
    return out;
  }

  if (Array.isArray(block)) {
    block.forEach((entry) => out.push(...defenseItemsFromBlock(entry, kind, source)));
    return out;
  }

  if (typeof block === 'object') {
    if (block.special) push(block.special);
    if (block.note) push(block.note);

    if (block.resist) out.push(...defenseItemsFromBlock(block.resist, 'Resistance', source));
    if (block.immune) out.push(...defenseItemsFromBlock(block.immune, 'Immunity', source));
    if (block.vulnerable) out.push(...defenseItemsFromBlock(block.vulnerable, 'Vulnerability', source));

    // Important: `choose.from` means "pick one", not "gain all".
    // The selected value is read separately from character.choices / normalized choices.
    // Do not expand all possible choices here, otherwise Dragonborn appears resistant
    // to Acid, Cold, Fire, Lightning, and Poison at the same time.
    Object.entries(block).forEach(([key, value]) => {
      if (['choose', 'special', 'note', 'resist', 'immune', 'vulnerable'].includes(key)) return;
      if (value === true) push(key);
      else if (typeof value === 'string') push(value);
      else if (Array.isArray(value)) value.forEach((entry) => push(entry));
    });
  }

  return out;
}

function collectSelectedSpeciesResistanceChoices(character = {}, source = 'Species') {
  const out = [];

  const pushMaybeDamageType = (value) => {
    const raw = displayLabel(value);
    const damageType = inferDamageTypeFromText(raw);
    if (damageType) out.push({ label: damageType, kind: 'Resistance', source });
  };

  const speciesChoiceCanGrantResistance = (key) => {
    const k = norm(String(key).replace(/^mc\d+_/, ''));
    if (!k.startsWith('species')) return false;
    return k.includes('resist') || k.includes('resistance');
  };

  Object.entries(character.choices || {}).forEach(([key, value]) => {
    if (!speciesChoiceCanGrantResistance(key)) return;
    asArray(value).forEach((entry) => pushMaybeDamageType(entry, key));
  });

  const normalized = character.normalizedChoices || {};
  [
    normalized.species?.options,
    normalized.speciesOptions,
    normalized.rawByKey,
  ].forEach((bucket) => {
    if (!bucket || typeof bucket !== 'object') return;
    Object.entries(bucket).forEach(([key, value]) => {
      if (!speciesChoiceCanGrantResistance(key)) return;
      asArray(value).forEach((entry) => pushMaybeDamageType(entry, key));
    });
  });

  return dedupeDefenseItems(out);
}

function collectStaticDefenseItems(character = {}) {
  const species = character.speciesSnapshot || character.speciesObj || {};
  const cls = character.clsSnapshot || character.cls || {};
  const bg = character.backgroundSnapshot || character.backgroundObj || {};

  const groups = [
    { source: species.name || character.speciesName || 'Species', data: species },
    { source: cls.name || character.className || 'Class', data: cls },
    { source: bg.name || character.backgroundName || 'Background', data: bg },
  ];

  const out = [];
  groups.forEach(({ source, data }) => {
    out.push(...defenseItemsFromBlock(data.resist, 'Resistance', source));
    out.push(...defenseItemsFromBlock(data.immune, 'Immunity', source));
    out.push(...defenseItemsFromBlock(data.vulnerable, 'Vulnerability', source));
    out.push(...defenseItemsFromBlock(data.conditionImmune, 'Immunity', source));
  });

  out.push(...collectSelectedSpeciesResistanceChoices(character, species.name || character.speciesName || 'Species'));

  return dedupeDefenseItems(out);
}

function resistanceItemsFromEffects(character = {}) {
  return collectSheetEffects(character)
    .filter((effect) => norm(effect.type).includes('resistance'))
    .flatMap((effect) => {
      const summary = effectSummary(effect, character);
      const fromSummary = summary
        .split('•')[0]
        .trim()
        .replace(/\s+Resistance.*$/i, '');

      const labels = [];
      if (fromSummary && !/^choose$/i.test(fromSummary)) labels.push(fromSummary);
      asArray(effect.damageTypes).forEach((type) => labels.push(cleanText(type)));

      return labels
        .map((label) => displayLabel(label))
        .filter(Boolean)
        .map((label) => ({
          label,
          kind: 'Resistance',
          source: effect.ownerName || '',
          note: cleanText(effect.note || ''),
        }));
    });
}

function immunityItemsFromEffects(character = {}) {
  return collectSheetEffects(character)
    .filter((effect) => norm(effect.type).includes('immunity'))
    .flatMap((effect) => {
      const labels = [];

      if (norm(effect.type).includes('immunitychoice')) {
        const resolved = resolveChoiceValue(effect, character);
        if (resolved && !/^choose$/i.test(resolved)) labels.push(resolved);
      } else {
        labels.push(...asArray(effect.conditions).map(cleanText));
        labels.push(...asArray(effect.damageTypes).map(cleanText));
        if (effect.value != null) labels.push(cleanText(effect.value));
      }

      if (!labels.length) {
        const fallback = effectSummary(effect, character).split('•')[0].trim() || effectTitle(effect);
        if (fallback && !/^choose$/i.test(fallback)) labels.push(fallback);
      }

      return labels
        .map((label) => displayLabel(label))
        .filter(Boolean)
        .map((label) => ({
          label,
          kind: 'Immunity',
          source: effect.ownerName || '',
          note: cleanText(effect.note || ''),
        }));
    });
}

function dedupeDefenseItems(items) {
  const byKey = new Map();
  items.forEach((item) => {
    const label = displayLabel(item.label);
    if (!label) return;
    const key = `${norm(item.kind)}|${norm(label)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...item, label });
      return;
    }
    if (!existing.source && item.source) byKey.set(key, { ...item, label });
  });
  return [...byKey.values()].sort((a, b) => (
    String(a.kind).localeCompare(String(b.kind)) || String(a.label).localeCompare(String(b.label))
  ));
}

export function collectResolvedResistanceItems(character = {}) {
  const staticItems = collectStaticDefenseItems(character).filter((item) => item.kind === 'Resistance');
  return dedupeDefenseItems([...staticItems, ...resistanceItemsFromEffects(character)]);
}

export function collectResolvedImmunityItems(character = {}) {
  const staticItems = collectStaticDefenseItems(character).filter((item) => item.kind === 'Immunity');
  return dedupeDefenseItems([...staticItems, ...immunityItemsFromEffects(character)]);
}

export function collectPreviewDefenseSections(character = {}) {
  const resistanceItems = collectResolvedResistanceItems(character)
    .map((item) => `${displayLabel(item.label)}${item.source ? ` (${item.source})` : ''}`);
  const immunityItems = collectResolvedImmunityItems(character)
    .map((item) => `${displayLabel(item.label)}${item.source ? ` (${item.source})` : ''}`);

  return [
    resistanceItems.length ? { title: 'Resistances', items: resistanceItems } : null,
    immunityItems.length ? { title: 'Immunities', items: immunityItems } : null,
  ].filter(Boolean);
}

function bladesingerIntMod(character) {
  return Math.max(1, Math.floor((Number(character?.finalScores?.int ?? 10) - 10) / 2));
}

// Additive AC bonus from active effects. Some effects are gated on wearing armor
// (Fighting Style: Defense → +1 AC only while wearing armor); the caller passes
// `ctx.wearingArmor` since equipped-armor state lives in the AC layer, not here.
export function getAcBonusEffects(character = {}, ctx = {}) {
  let total = 0;
  collectSheetEffects(character).forEach((effect) => {
    if (norm(effect.type) !== 'acbonus') return;
    if (effect.requiresArmor && !ctx.wearingArmor) return;
    if (effect.ability === 'int') total += bladesingerIntMod(character);
    else total += Number(effect.value ?? 1);
  });
  return total;
}

// Weapon-scoped attack/damage bonuses from active effects (e.g. Fighting Style:
// Archery +2 ranged attack, Dueling +2 one-handed melee damage, Thrown Weapon
// +2 thrown damage). `info` carries precomputed weapon flags
// ({ ranged, melee, thrown, oneHanded, twoHanded, soloWeapon }) so this stays
// decoupled from the equipment helpers and can be called per weapon from the
// actions layer. `requiresSoloWeapon` effects (Dueling: "no other weapons")
// apply only when no other weapon is wielded.
export function getWeaponEffectBonuses(character = {}, info = {}) {
  let attack = 0;
  let damage = 0;
  collectSheetEffects(character).forEach((effect) => {
    const type = norm(effect.type);
    if (type !== 'weaponattackbonus' && type !== 'weapondamagebonus') return;
    if (effect.requiresSoloWeapon && !info.soloWeapon) return;
    if (!weaponFilterMatches(effect.weaponFilter, info)) return;
    if (type === 'weaponattackbonus') attack += Number(effect.value ?? 0);
    else damage += Number(effect.value ?? 0);
  });
  return { attack, damage };
}

export function getSkillAdvantageFromEffects(character = {}, skillName) {
  const s = String(skillName || '').toLowerCase();
  let found = null;
  collectSheetEffects(character).forEach((effect) => {
    if (norm(effect.type) !== 'advantage') return;
    if (effect.target !== 'skill') return;
    if (String(effect.skill || '').toLowerCase() !== s) return;
    found = { source: effect.note || effect.ownerName || 'Advantage' };
  });
  // No extra toggle gate: any toggle/condition (e.g. Bladesong) is already
  // enforced per-effect by collectSheetEffects via `condition`.
  return found;
}

// Advantage on Initiative rolls from any source (Barbarian Feral Instinct,
// Champion Remarkable Athlete, Assassin Assassinate, …). Canonical effect shape:
// { type: 'advantage', target: 'initiative' }.
export function getInitiativeAdvantageFromEffects(character = {}) {
  let found = null;
  collectSheetEffects(character).forEach((effect) => {
    if (norm(effect.type) !== 'advantage') return;
    if (effect.target !== 'initiative') return;
    found = { source: effect.note || effect.ownerName || 'Advantage' };
  });
  return found;
}

export function getConcentrationBonus(character = {}) {
  let total = 0;
  collectSheetEffects(character).forEach((effect) => {
    if (norm(effect.type) !== 'concentrationbonus') return;
    if (effect.ability === 'int') total += bladesingerIntMod(character);
    else total += Number(effect.value ?? 0);
  });
  return total;
}

// Active `d20-floor` effects (e.g. Stars Druid Dragon constellation: treat a
// d20 roll at or below minRoll-1 as minRoll on INT/WIS checks and Concentration
// saves). Only active effects survive collectSheetEffects, so a gated effect
// appears only when its requiredChoice matches. Surfaced as a reminder.
export function getD20FloorReminders(character = {}) {
  return collectSheetEffects(character)
    .filter((effect) => norm(effect?.type) === 'd20floor')
    .map((effect) => ({
      minRoll: Number(effect.minRoll || 10),
      note: cleanText(effect.note) || '',
      source: cleanText(effect.ownerName) || '',
    }));
}

// Additive bonus to spell save DC from active effects (e.g. Sorcerer Innate
// Sorcery while toggled on). Only active effects survive collectSheetEffects.
export function getSpellSaveDcBonus(character = {}) {
  let total = 0;
  collectSheetEffects(character).forEach((effect) => {
    if (norm(effect.type) !== 'spellsavedcbonus') return;
    total += Number(effect.value ?? 0);
  });
  return total;
}

// Advantage on spell attack rolls from active effects (e.g. Sorcerer Innate
// Sorcery while toggled on). An effect may scope to a class via `spellClass`;
// when set it only applies to spells whose owning class matches the entry's
// ownerClassName (multiclass-safe). Returns the source label or null.
export function getSpellAttackAdvantage(character = {}, { ownerClassName } = {}) {
  let found = null;
  collectSheetEffects(character).forEach((effect) => {
    if (found) return;
    if (norm(effect.type) !== 'spellattackadvantage') return;
    if (effect.spellClass && norm(effect.spellClass) !== norm(ownerClassName)) return;
    found = { source: effect.note || effect.ownerName || 'Advantage' };
  });
  return found;
}

// Additive damage bonus for Strength-based melee attacks (e.g. Barbarian Rage).
// Tiers are separate effects gated by minLevel + condition; only the active
// ones survive collectSheetEffects, so the highest value is the current tier.
export function getMeleeStrDamageBonus(character = {}) {
  let bonus = 0;
  collectSheetEffects(character).forEach((effect) => {
    if (norm(effect.type) !== 'meleedamagebonus') return;
    if (effect.ability && String(effect.ability).toLowerCase() !== 'str') return;
    bonus = Math.max(bonus, Number(effect.value ?? 0));
  });
  return bonus;
}

export function getSpeedBonus(character = {}) {
  let total = 0;
  collectSheetEffects(character).forEach((effect) => {
    if (!norm(effect.type).includes('speed')) return;
    if (norm(effect.type).includes('fly') || norm(effect.type).includes('climb') || norm(effect.type).includes('swim')) return;
    total += Number(effect.value ?? 0);
  });
  return total;
}

export function collectPreviewEffectProficiencySections(character = {}) {
  const sections = new Map();

  const add = (title, item) => {
    const label = displayLabel(item);
    if (!label) return;
    if (!sections.has(title)) sections.set(title, new Set());
    sections.get(title).add(label);
  };

  collectSheetEffects(character).forEach((effect) => {
    const type = norm(effect.type);
    const summary = effectSummary(effect, character);
    const source = effect.ownerName ? ` (${effect.ownerName})` : '';

    if (type.includes('armortraining')) {
      asArray(effect.values).forEach((value) => add('Armor Training', `${displayLabel(value)}${source}`));
    } else if (type.includes('weapontraining')) {
      asArray(effect.values).forEach((value) => add('Weapon Training', `${displayLabel(value)}${source}`));
    } else if (type.includes('toolproficiency')) {
      asArray(effect.values).forEach((value) => add('Tools', `${displayLabel(value)}${source}`));
      if (!effect.values && summary) add('Tools', `${summary}${source}`);
    } else if (type.includes('skillproficiency')) {
      asArray(effect.values).forEach((value) => add('Skills', `${displayLabel(value)}${source}`));
      if (!effect.values && summary) add('Skills', `${summary}${source}`);
    } else if (type.includes('expertise')) {
      asArray(effect.values).forEach((value) => add('Expertise', `${displayLabel(value)}${source}`));
      if (!effect.values && summary) add('Expertise', `${summary}${source}`);
    } else if (type.includes('language')) {
      asArray(effect.values).forEach((value) => add('Languages', `${displayLabel(value)}${source}`));
      if (!effect.values && summary) add('Languages', `${summary}${source}`);
    }
  });

  return [...sections.entries()].map(([title, set]) => ({
    title,
    items: [...set],
  }));
}
