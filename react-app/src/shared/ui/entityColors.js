import { UI_COLORS, OPACITY, TEMP_HP_TONE, uiAlpha, washImage } from './colors.js';
import { pressableSx, stickerSx, textTone } from './pressable.js';
import { inkShadow } from './shadows.js';

// Canonical color coding for game entity kinds, shared by builder and sheet.
// Use these instead of hardcoding hex values when tagging an entity type.
// These are colours of meaning, not of style: each says "class", "feat",
// "fire"… wherever it is shown, apart from every interface role even where a
// value happens to match one. Their hexes are the palettes' (colors.js
// MEANING_COLORS: one each, the same in every palette unless a palette fades
// them into its own light); here each is named for what it means. Something
// that is not an entity (a heading, a neutral highlight) takes
// UI_COLORS.accentText.
export const ENTITY_COLORS = {
  class: UI_COLORS.entityClass,
  subclass: UI_COLORS.entitySubclass,
  species: UI_COLORS.entitySpecies,
  background: UI_COLORS.entityBackground,
  feat: UI_COLORS.entityFeat,
  skill: UI_COLORS.entitySkill,
  tool: UI_COLORS.entityTool,
  language: UI_COLORS.entityLanguage,
};


// Bordeaux accent for everything item/attunement related: item source chips on
// spells and the attune button/attuned state. Items are not an entity kind, so
// this lives apart from ENTITY_COLORS but follows the same "one hex" rule.
export const ITEM_ATTUNEMENT = UI_COLORS.item;

// Dedicated accent for structured rich-text descriptions. Kept separate from
// entity, action, spell-tag, and item-state colors so highlighted rules text
// never implies one of those semantic meanings. A palette role (ruleEmphasis),
// as it is read as text: each palette darkens or lightens it to be read.
export const RICH_TEXT_ACCENT = UI_COLORS.ruleEmphasis;

// Action-economy accents (action / bonus action / reaction). Deliberately
// outside every entity-kind hue (teal/violet/blue/etc.) so action type never
// reads as an entity. Shared by the Actions tab category bar and the spell
// tab's cast-time chip, so a given action type looks identical everywhere.
export const ACTION_COLORS = {
  action: UI_COLORS.actionMain,       // vivid electric cyan (kept clear of the muted subclass teal)
  bonus: UI_COLORS.actionBonus,       // lime green: told apart from the action's cyan at a glance (user, 2026-11-13)
  reaction: UI_COLORS.actionReaction, // orchid purple
  special: UI_COLORS.actionOther,     // neutral slate: no-action / triggered features ("Other")
};

// Spell-tag mini-chip accents (Concentration / Ritual) shown next to spell
// names everywhere: sheet spell card, builder lists, picker dialogs and the
// wizard spellbook. One home so the chip reads identically across all of them.
export const SPELL_TAG_COLORS = {
  concentration: UI_COLORS.spellConcentration, // rose, kept clear of the species/choice violets
  ritual: UI_COLORS.spellRitual,               // green
};

// One hue per damage type, for the sheet's Defenses chips (resistances and
// immunities). Physical types share one stone tone; `all` covers "All damage".
const PHYSICAL_DAMAGE_TONE = UI_COLORS.damagePhysical;
export const DAMAGE_TYPE_COLORS = {
  acid: UI_COLORS.damageAcid,
  cold: UI_COLORS.damageCold,
  fire: UI_COLORS.damageFire,
  force: UI_COLORS.damageForce,
  lightning: UI_COLORS.damageLightning,
  necrotic: UI_COLORS.damageNecrotic,
  poison: UI_COLORS.damagePoison,
  psychic: UI_COLORS.damagePsychic,
  radiant: UI_COLORS.damageRadiant,
  thunder: UI_COLORS.damageThunder,
  bludgeoning: PHYSICAL_DAMAGE_TONE,
  piercing: PHYSICAL_DAMAGE_TONE,
  slashing: PHYSICAL_DAMAGE_TONE,
  all: UI_COLORS.accentText,
};

// The hue of the first damage type named in a defense label ("Fire",
// "All damage", "Bludgeoning (nonmagical)"…), or null when it names none.
// Whole words only, so "all" never matches inside another word.
const DAMAGE_TYPE_PATTERN = new RegExp(`\\b(${Object.keys(DAMAGE_TYPE_COLORS).join('|')})\\b`, 'i');
export function damageTypeTone(label) {
  const match = String(label || '').match(DAMAGE_TYPE_PATTERN);
  return match ? DAMAGE_TYPE_COLORS[match[1].toLowerCase()] : null;
}

// Semantic tones for the action-tab entry chips. Muted on purpose so a chip
// reads as a status/fact, never as an entity-kind tag. `info` = neutral fact
// (weapon hand, range, duration, save DC…), `positive`/`negative` = good/bad
// status (Active vs Suppressed, proficient vs not), `mastery` = active mastery.
export const CHIP_TONES = {
  info: UI_COLORS.factNeutral,
  positive: UI_COLORS.factGood,
  negative: UI_COLORS.factBad,
  mastery: UI_COLORS.factMastery,
};

// Tones for the inline roll buttons on the sheet (attack, damage, heal, …).
// `attack` blue is the neutral default; `attackNotProficient` red flags a malus
// baked into the bonus; `attackDisadvantage` reuses CHIP_TONES.negative so a
// penalized roll reads like a negative status chip.
export const ROLL_TONES = {
  attack: UI_COLORS.accent,
  attackNotProficient: UI_COLORS.rollMalus,
  attackDisadvantage: CHIP_TONES.negative,
  damage: UI_COLORS.rollDamage,
  heal: UI_COLORS.rollHeal,
  utility: UI_COLORS.rollUtility,
  // The temporary hit points' own colour, as on their bar.
  tempHp: TEMP_HP_TONE,
};

// The colour of each sheet panel (its badge, title and screentone), by what it
// is about. A roll made from a panel wears its panel's colour (ROLL_KIND_TONES).
export const PANEL_TONES = Object.freeze({
  abilityScores: UI_COLORS.secondary,
  hitPoints: UI_COLORS.success,
  savingThrows: ENTITY_COLORS.skill,
  skills: ENTITY_COLORS.skill,
  senses: UI_COLORS.info,
  movement: UI_COLORS.secondary,
  proficiencies: ENTITY_COLORS.tool,
  defenses: ENTITY_COLORS.background,
  conditions: UI_COLORS.danger,
  reminders: UI_COLORS.spell,
  // Everything an item is (starting equipment, currency, the inventory)
  // wears the items' bordeaux, as the attune button and item tags do.
  items: ITEM_ATTUNEMENT,
  // The stat tiles beside Defenses, each its own: AC steel, Initiative the
  // accent its roll wears, Proficiency Bonus the skills' green, Inspiration
  // the violet. A tile with no tone of its own (the spell figures) wears the
  // theme's accent, as a panel's bar does by default.
  armorClass: UI_COLORS.armor,
  initiative: UI_COLORS.accent,
  proficiencyBonus: ENTITY_COLORS.skill,
  inspiration: UI_COLORS.spell,
  statTile: UI_COLORS.accent,
});

// A counter's gem (GemPip) by what it counts, under a style's own colours
// (shapes.js gemCuts `tones`).
export const GEM_TONES = Object.freeze({
  slot: UI_COLORS.info,
  pact: UI_COLORS.spell,
  uses: UI_COLORS.accent,
  temporary: UI_COLORS.success,
  hitDice: PANEL_TONES.hitPoints,
});

// A skill's or a save's training gem (TrainingGem): half and full proficiency in the accent, expertise
// in a colour well apart from it (a lime next to the sunflower read as one).
export const TRAINING_TONES = Object.freeze({
  half: UI_COLORS.accent,
  prof: UI_COLORS.accent,
  exp: UI_COLORS.info,
});

// The colour a roll's toast and log line wear, by the kind of roll (the
// toast's `meta.kind`): a check or save the colour of the panel it was rolled
// from, an attack, damage, healing or temporary hit points the colour of its
// roll button, Initiative the colour of its tile. A roll of no known kind (a
// free roll, an old saved one) has none and stays neutral.
export const ROLL_KIND_TONES = Object.freeze({
  abilityCheck: PANEL_TONES.abilityScores,
  save: PANEL_TONES.savingThrows,
  skill: PANEL_TONES.skills,
  initiative: PANEL_TONES.initiative,
  attack: ROLL_TONES.attack,
  damage: ROLL_TONES.damage,
  heal: ROLL_TONES.heal,
  tempHp: ROLL_TONES.tempHp,
});

// Kind tags in the compendium. No hue of its own: each kind wears the one it
// already has elsewhere in the app (an item the attunement bordeaux, a feat
// its entity red…), so a tag reads the same as on the sheet.
export const COMPENDIUM_KIND_COLORS = {
  spell: ENTITY_COLORS.tool,
  item: ITEM_ATTUNEMENT,
  monster: ROLL_TONES.damage,
  condition: SPELL_TAG_COLORS.concentration,
  action: ACTION_COLORS.action,
  rule: UI_COLORS.accentText,
  feat: ENTITY_COLORS.feat,
  species: ENTITY_COLORS.species,
  background: ENTITY_COLORS.background,
  classFeature: ENTITY_COLORS.class,
  option: ENTITY_COLORS.subclass,
  skill: ENTITY_COLORS.skill,
};

// The one roll-button recipe: the raised, drawn button filled with the roll's
// tone (shared/ui/pressable.js), so every roll button reads as one family and
// as the same kind of thing as the app's filled buttons. Pass a ROLL_TONES
// value.
export function rollerToneSx(tone) {
  return pressableSx(tone);
}

// Tint for an attack-roll button. Disadvantage outranks not-proficient: it
// changes how the die is rolled, the red only annotates the bonus.
export function attackRollerToneSx({ disadv = false, notProficient = false } = {}) {
  if (disadv) return rollerToneSx(ROLL_TONES.attackDisadvantage);
  return rollerToneSx(notProficient ? ROLL_TONES.attackNotProficient : ROLL_TONES.attack);
}

// Single recipe for a tinted chip or badge: its tone washed over the raised
// paper (never see-through, so it reads the same on a panel, a bubble or the
// map), an edge in the tone and its text. The theme's MuiChip colours,
// TagChip, MiniBadge and every tinted chip derive from this, so the visual
// language stays in one place.
export function chipTintStyle(tone, { bgAlpha = OPACITY.fill, borderAlpha = OPACITY.heavy, text = tone } = {}) {
  return {
    backgroundColor: UI_COLORS.surfaceRaised,
    backgroundImage: washImage(tone, bgAlpha),
    borderColor: uiAlpha(tone, borderAlpha),
    color: textTone(text),
  };
}

// A solid chip, the one mark of a fact on show (a tag, a condition or a
// reminder on a piece, a count): a sticker in its tone (pressable.js
// stickerSx: the tone, pale on a light palette) with the ink that reads on it,
// an ink edge and a small solid shadow. TagChip and every mark on the map are
// this one. CSS names, for sx and the theme alike.
export function chipSolidStyle(tone) {
  return {
    ...stickerSx(tone),
    borderColor: UI_COLORS.edge,
    boxShadow: inkShadow(UI_COLORS.edge, 1),
  };
}

// Standard tint for the action-tab entry chips (tag chips + Active/Suppressed
// status). One alpha config so every such chip reads identically; pass a
// CHIP_TONES value.
export function chipToneStyle(tone) {
  return chipTintStyle(tone, { bgAlpha: OPACITY.tint, borderAlpha: OPACITY.strong });
}
