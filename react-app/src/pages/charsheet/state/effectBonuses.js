import { weaponFilterMatches } from '../../../shared/character/inventory/weaponFilters.js';
import { featNamedEntries } from '../../../shared/character/progression/featDescription.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityModifier.js';
import { asArray, cleanText, norm, collectSheetEffects } from './sheetEffects.js';

// One question per rule, answered from the active sheet effects: AC bonuses,
// weapon damage and notes, skill / initiative / spell-attack advantage,
// concentration, D20 floors, spell save DC, melee Strength damage, speed.

function bladesingerIntMod(character) {
  return Math.max(1, finalAbilityModifier(character, 'int'));
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
// ({ ranged, melee, thrown, heavy, oneHanded, twoHanded, soloWeapon }) so this stays
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

function ownerFeatNamedEntries(character, ownerName, entryName) {
  const feat = asArray(character?.allFeatSnapshots).find((f) => norm(f?.name) === norm(ownerName));
  return feat ? featNamedEntries(feat, entryName) : null;
}

// Weapon-scoped reminders from active effects (e.g. Great Weapon Master: Heavy
// Weapon Mastery). They never change a number: the sheet can't tell which action
// an attack belongs to, so the rule is shown as a tag + description on every
// matching weapon card and the player applies it.
// Shape: { type: 'weaponNote', weaponFilter, tag, title, note, entryName?, entries? }
// — `note` keeps several notes from one owner distinct in dedupeEffects; the text
// comes from the owning feat's official entry named `entryName` (default: title),
// with `entries` as the fallback when no feat snapshot carries it.
export function getWeaponNotes(character = {}, info = {}) {
  const notes = [];
  collectSheetEffects(character).forEach((effect) => {
    if (norm(effect.type) !== 'weaponnote') return;
    if (!weaponFilterMatches(effect.weaponFilter, info)) return;
    const title = String(effect.title || effect.ownerName || '').trim();
    notes.push({
      key: norm(`${effect.ownerName}-${title}`),
      tag: String(effect.tag || title).trim(),
      title,
      source: String(effect.ownerName || '').trim(),
      entries: ownerFeatNamedEntries(character, effect.ownerName, effect.entryName || title) || asArray(effect.entries),
    });
  });
  return notes;
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

// The Unarmed Strike from active effects (type `unarmedStrike`): the largest
// damage die among them (`emptyHandedFace` while the character holds no weapon
// or Shield, e.g. Unarmed Fighting's d8), whether it may use Dexterity
// (Martial Arts) and the card's usage label. With none: a flat 1, Strength.
export function getUnarmedStrike(character = {}, { emptyHanded = false } = {}) {
  let face = 1;
  let dexterity = false;
  let uses = null;
  collectSheetEffects(character).forEach((effect) => {
    if (norm(effect.type) !== 'unarmedstrike') return;
    const value = Number(emptyHanded && effect.emptyHandedFace ? effect.emptyHandedFace : effect.face) || 0;
    if (value > face) face = value;
    if (effect.dexterity) dexterity = true;
    if (effect.uses && !uses) uses = effect.uses;
  });
  return { face, dexterity, uses };
}
