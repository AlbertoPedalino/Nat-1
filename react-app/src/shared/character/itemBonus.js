// Parse and aggregate magical item bonuses (weapons, armor, cloaks, rings,
// rods, wands, etc.) from inventory data fields. Single source of truth so
// attack/damage/AC/save/spell calculations stay consistent.

export function requiresAttunement(item) {
  return !!item?.reqAttune;
}

// Item types that must be held/worn in an equip slot for their bonuses to
// apply (weapons must be wielded, armor must be worn, focuses/wands/rods/staves
// must be held). Other magic items (rings, cloaks, belts, boots, goggles,
// amulets, etc.) become active on attunement alone — attunement implies
// wearing per RAW and they have no dedicated equip slot in our model.
const HELD_OR_WORN_TYPES = new Set(['M', 'R', 'LA', 'MA', 'HA', 'S', 'WEAPON', 'ARMOR', 'WD', 'RD', 'ST', 'SCF']);

function requiresEquipForBonus(item) {
  return HELD_OR_WORN_TYPES.has(String(item?.type || '').toUpperCase());
}

// An item-granted bonus is active depending on item kind:
//   - Held/worn-slot items: must be `equipped`; if they also require
//     attunement, must additionally be `attuned`.
//   - Slotless magic items requiring attunement: active on `attuned` alone.
//   - Slotless items without attunement: need `equipped` (mundane bag/pack
//     items rarely carry numeric bonuses; included for completeness).
export function isItemBonusActive(item) {
  if (!item) return false;
  if (requiresAttunement(item)) {
    if (!item.attuned) return false;
    return requiresEquipForBonus(item) ? !!item.equipped : true;
  }
  return !!item.equipped;
}

export function parseSignedBonus(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[^\d+-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatSignedBonus(value) {
  const n = Number(value) || 0;
  return n >= 0 ? `+${n}` : `${n}`;
}

export function weaponEnhancement(item) {
  if (!isItemBonusActive(item)) return { attack: 0, damage: 0 };
  return {
    attack: parseSignedBonus(item?.bonusWeaponAttack ?? item?.bonusWeapon),
    damage: parseSignedBonus(item?.bonusWeaponDamage ?? item?.bonusWeapon),
  };
}

export function armorEnhancement(item) {
  if (!isItemBonusActive(item)) return 0;
  return parseSignedBonus(item?.bonusAc);
}

function activeEquippedItems(inventory) {
  return (inventory || []).filter((item) => isItemBonusActive(item));
}

function sumField(inventory, field) {
  return activeEquippedItems(inventory)
    .reduce((sum, item) => sum + parseSignedBonus(item[field]), 0);
}

// Sum `bonusAc` across all equipped items that aren't body armor / shield
// (those are already folded into armor AC + shield bonus). Captures Cloak of
// Protection, Ring of Protection, etc.
export function aggregateMiscAcBonus(inventory) {
  return activeEquippedItems(inventory)
    .filter((item) => !['LA', 'MA', 'HA', 'S'].includes(String(item.type || '').toUpperCase()))
    .reduce((sum, item) => sum + parseSignedBonus(item.bonusAc), 0);
}

// Sum `bonusSavingThrow` across all equipped items. 5etools tags apply to all
// save categories unless qualified, so we aggregate to a single +N.
export function aggregateSavingThrowBonus(inventory) {
  return sumField(inventory, 'bonusSavingThrow');
}

// Sum `bonusAbilityCheck` across all equipped items (Cloak of Protection-like).
export function aggregateAbilityCheckBonus(inventory) {
  return sumField(inventory, 'bonusAbilityCheck');
}

// Spellcasting focuses (Wand of the War Mage +1 etc.).
export function aggregateSpellBonuses(inventory) {
  return {
    spellAttack: sumField(inventory, 'bonusSpellAttack'),
    spellSaveDc: sumField(inventory, 'bonusSpellSaveDc'),
  };
}

// Count items currently attuned. Use to surface RAW 3-attunement-slot limit.
export function countAttunedItems(inventory) {
  return (inventory || []).filter((item) => requiresAttunement(item) && item?.attuned).length;
}

// RAW cap on simultaneously attuned items.
export const ATTUNEMENT_LIMIT = 3;

// Human-readable attunement requirement. 5etools `reqAttune` is either `true`
// (generic) or a qualifier string ("by a wizard", "by a creature of good
// alignment"). `reqAttuneAlt` carries an alternative qualifier on the rare item
// that has one. Returns null when the item needs no attunement.
export function attunementRequirementText(item) {
  const req = item?.reqAttune;
  if (!req) return null;
  if (req === true || typeof req !== 'string') return 'Requires attunement';
  const format = (value) => {
    const trimmed = String(value).trim();
    if (!trimmed) return 'Requires attunement';
    return trimmed.toLowerCase().startsWith('by ') ? `Requires attunement ${trimmed}` : `Requires attunement (${trimmed})`;
  };
  const alt = typeof item?.reqAttuneAlt === 'string' ? ` or ${item.reqAttuneAlt.trim()}` : '';
  return format(req) + alt;
}

const ATTUNEMENT_CLASS_NAMES = [
  'artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter',
  'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
];
const ATTUNEMENT_CLASS_SET = new Set(ATTUNEMENT_CLASS_NAMES);

// Split text into lowercased whole-word tokens without regex: letters form a
// word, anything else is a boundary. Whole-word matching avoids substring false
// positives (e.g. "monk" inside another word).
function wordTokens(text) {
  const out = [];
  let word = '';
  for (const ch of String(text).toLowerCase()) {
    if (ch >= 'a' && ch <= 'z') {
      word += ch;
    } else if (word) {
      out.push(word);
      word = '';
    }
  }
  if (word) out.push(word);
  return out;
}

// Class names named in the attunement qualifier (e.g. "by a cleric or paladin"
// -> ['cleric','paladin']). Returns null when the qualifier names no class we
// can validate against (alignment / species / "spellcaster" / generic) so
// callers treat null as "can't validate — don't warn".
export function attunementClasses(item) {
  const parts = [item?.reqAttune, item?.reqAttuneAlt].filter((v) => typeof v === 'string');
  if (!parts.length) return null;
  const found = [...new Set(wordTokens(parts.join(' ')))].filter((token) => ATTUNEMENT_CLASS_SET.has(token));
  return found.length ? found : null;
}

// Best-effort eligibility: true unless the qualifier names specific classes and
// the character has none of them. Conservative — only the explicit-class case
// is validated, to avoid false negatives on freeform qualifiers.
export function meetsAttunementClassRequirement(item, characterClassNames) {
  const required = attunementClasses(item);
  if (!required) return true;
  const have = (characterClassNames || []).map((c) => String(c).toLowerCase());
  return required.some((cls) => have.includes(cls));
}
