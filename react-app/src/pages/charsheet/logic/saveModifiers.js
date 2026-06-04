// Single source of truth for saving-throw modifiers (advantage / disadvantage)
// shown under the Saving Throws block.
//
// Each modifier is normalized to:
//   { kind, mode, ability, label, source }
//     kind:    'advantage' | 'disadvantage'
//     mode:    'fixed'      | 'conditional'
//     ability: 'str'|'dex'|...|null   (null = applies regardless of ability)
//     label:   human text, e.g. 'CON saves' | 'vs Spells' | 'vs Poison'
//     source:  feature / item name that grants it
//
// mode semantics:
//   'fixed'       → unconditional for that ability: it drives the auto-roll
//                   (clicking the save rolls with adv/disadv automatically).
//   'conditional' → situational ("vs spells", "vs being frightened", ...): a
//                   reminder only, never auto-applied to the roll.
//
// Adding a save modifier from a class/subclass/species/feat = register a
// `{ type: 'advantage'|'disadvantage', target: 'save', ... }` sheet effect in
// that adapter; nothing in this file changes. A brand-new *domain* (armor,
// items, …) = one collector spread into collectSaveModifiers.

import { collectItemEffects } from '../../../shared/character/itemEffects.js';
import { getEquippedArmorPenalties } from './armorPenalties.js';
import { collectSheetEffects } from './sheetEffects.js';
import { SLBL, STATS, getConditionsWithEffect } from './calculations.js';

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (c) => c.toUpperCase());
}

function abilityLabel(ability) {
  return ability ? `${SLBL[ability]} saves` : 'saves';
}

// --- Class / subclass / species / feat sheet effects ---------------------
// Reuses the central effect pipeline (collectSheetEffects), so any source it
// already resolves — multiclass, species, feats, conditions, requiredChoice,
// requiredItemFlag, dedupe — is covered for free. Adding a save modifier from
// a new source means registering a `{ type: 'advantage'|'disadvantage',
// target: 'save' }` effect; nothing here changes.

function collectSheetSaveEffects(C) {
  return collectSheetEffects(C).filter((effect) => (
    effect.target === 'save' && (effect.type === 'advantage' || effect.type === 'disadvantage')
  ));
}

// One sheet effect → one or more normalized modifiers. An effect may target a
// single ability (`ability`) or several (`abilities: [...]`); the latter is
// expanded so each ability gets its own per-stat entry while staying a single
// registered effect (avoids the note-based dedupe collision in the pipeline).
function normalizeSheetEffect(effect) {
  const kind = effect.type; // 'advantage' | 'disadvantage'
  const feature = effect.note || (effect.source && titleCase(effect.source)) || effect.ownerName || 'Feature';

  // Bound to specific conditions (e.g. Charmed / Frightened) → situational.
  if (Array.isArray(effect.conditions) && effect.conditions.length) {
    return [{ kind, mode: 'conditional', ability: null, label: `vs ${effect.conditions.join(', ')}`, source: feature }];
  }
  // Bound to a damage/effect category (e.g. source: "spells") → situational.
  if (effect.source && !effect.ability && !Array.isArray(effect.abilities)) {
    return [{ kind, mode: 'conditional', ability: null, label: `vs ${titleCase(effect.source)}`, source: feature }];
  }

  const abilities = Array.isArray(effect.abilities)
    ? effect.abilities
    : (effect.ability ? [effect.ability] : [null]);

  return abilities.map((raw) => {
    const ability = raw ? String(raw).toLowerCase() : null;
    // Explicit opt-out: ability-wide but situational (e.g. Concentration only).
    if (effect.conditional) {
      return { kind, mode: 'conditional', ability, label: abilityLabel(ability), source: feature };
    }
    // Ability-wide, unconditional → drives the auto-roll.
    if (ability) {
      return { kind, mode: 'fixed', ability, label: abilityLabel(ability), source: feature };
    }
    // No ability, no qualifier → treat as a generic reminder.
    return { kind, mode: 'conditional', ability: null, label: 'saves', source: feature };
  });
}

// --- Armor training penalties -------------------------------------------

function collectArmorSaveDisadvantages(C, inventory, profSets) {
  const armor = getEquippedArmorPenalties(C, inventory, profSets);
  if (!armor.hasPenalty) return [];
  return STATS
    .filter((st) => armor.disadvantageOn.includes(`${st}-saves`))
    .map((st) => {
      const detail = armor.details.find((d) => d.type === 'disadvantage' && d.applies?.includes(`${st}-saves`));
      return { kind: 'disadvantage', mode: 'fixed', ability: st, label: abilityLabel(st), source: detail?.reason || detail?.item || 'Armor' };
    });
}

// --- Magic-item contextual advantages (vs poison, vs spells, ...) --------

function collectItemSaveAdvantages(inventory) {
  const effects = collectItemEffects(inventory);
  return [...effects.advantageOnSaveAgainst.entries()].map(([target, sources]) => ({
    kind: 'advantage',
    mode: 'conditional',
    ability: null,
    label: `vs ${titleCase(target)}`,
    source: sources.join(', '),
  }));
}

// --- Active conditions (XPHB 2024) --------------------------------------
// Restrained → disadvantage on DEX saves (fixed, drives the auto-roll).
// Paralyzed/Petrified/Stunned/Unconscious → auto-fail STR & DEX saves; that is
// harsher than disadvantage and isn't a roll modifier, so it's surfaced as a
// situational reminder rather than flipping the roll.

function collectConditionSaveModifiers(activeConditions = []) {
  const out = [];
  getConditionsWithEffect(activeConditions, 'dexSaveDisadv').forEach((source) => {
    out.push({ kind: 'disadvantage', mode: 'fixed', ability: 'dex', label: abilityLabel('dex'), source });
  });
  getConditionsWithEffect(activeConditions, 'autoFailStrDexSave').forEach((source) => {
    out.push({ kind: 'autofail', mode: 'conditional', ability: null, label: 'STR & DEX saves', source });
  });
  return out;
}

// --- Public API ----------------------------------------------------------

export function collectSaveModifiers(C, inventory, profSets, activeConditions = []) {
  return [
    ...collectSheetSaveEffects(C).flatMap(normalizeSheetEffect),
    ...collectArmorSaveDisadvantages(C, inventory, profSets),
    ...collectItemSaveAdvantages(inventory),
    ...collectConditionSaveModifiers(activeConditions),
  ];
}

// Fixed modifiers for one ability — these are what the auto-roll honors.
export function fixedModifiersForAbility(modifiers, ability) {
  return modifiers.filter((m) => m.mode === 'fixed' && m.ability === ability);
}

// Collapse modifiers that share kind + mode + source into one display row,
// merging the affected ability saves into a single label (e.g. Gnomish
// Cunning → "INT/WIS/CHA saves"). Used for the reminder list under the stats.
export function summarizeSaveModifiers(modifiers) {
  const groups = new Map();
  modifiers.forEach((m) => {
    const key = `${m.kind}|${m.mode}|${m.source}`;
    if (!groups.has(key)) {
      groups.set(key, { kind: m.kind, mode: m.mode, source: m.source, abilities: [], labels: [] });
    }
    const group = groups.get(key);
    if (m.ability) group.abilities.push(SLBL[m.ability]);
    else group.labels.push(m.label);
  });
  return [...groups.values()].map((group) => {
    const parts = [];
    if (group.abilities.length) parts.push(`${group.abilities.join('/')} saves`);
    parts.push(...group.labels);
    return { kind: group.kind, mode: group.mode, source: group.source, label: parts.join(', ') };
  });
}
