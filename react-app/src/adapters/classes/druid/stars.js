import { createAdapterBindings } from '../../adapterBindings.js';
import { getChoiceValue } from '../../../shared/character/progression/choiceUtils.js';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';
import { getProficiencyBonus } from '../../../shared/character/progression/proficiency.js';

export default function install(registry, context = {}) {
  // Starry Form constellations (Archer attack / Chalice heal) share one scaling
  // rule: a d8 that doubles at level 10 (Twinkling Constellations), plus WIS.
  // Single source so the action roller and the spell rider can't drift.
  const starryFormDie = (level) => (Number(level || 0) >= 10 ? '2d8' : '1d8');
  const withWisMod = (dice, character) => {
    try {
      const wis = finalAbilityModifier(character, 'wis');
      return wis > 0 ? `${dice}+${wis}` : wis < 0 ? `${dice}${wis}` : dice;
    } catch { return dice; }
  };
  const isConstellation = (character, value) =>
    String(getChoiceValue(character, 'stars_constellation') || '').toLowerCase() === value;
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
    registerSubclassSpellRiders,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Druid_Stars", function (cls, lv, specs) {});

registerSubclassSheetActions("Druid_Stars", [
  {
    "name": "Starry Form",
    "icon": "",
    "cat": "bonus",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 3,
    "choiceKey": "stars_constellation",
    "choiceLabel": "Constellation",
    "choiceOptions": [
      { "value": "Archer", "label": "Archer (Ranged Attack)" },
      { "value": "Chalice", "label": "Chalice (Healing)" },
      { "value": "Dragon", "label": "Dragon (Steady Mind)" }
    ],
    "choiceNoToast": true,
    "choiceAllowClear": true,
    "choiceRestNote": "Choose a constellation when you assume Starry Form. Click the active one again to clear it. At level 10+ you can change it at the start of each of your turns."
  },
  {
    "name": "Starry Form: Archer",
    "icon": "",
    "cat": "bonus",
    "uses": "While in Starry Form",
    "minLevel": 3,
    "noDescription": true,
    "requiresChoice": { "key": "stars_constellation", "value": "Archer" },
    "attackBonus": ({ character }) => {
      try { return getProficiencyBonus(character) + finalAbilityModifier(character, 'wis'); } catch { return 0; }
    },
    rollers: [{ kind: 'damage', formula: ({ character, ownerLevel }) => withWisMod(starryFormDie(ownerLevel), character), label: ({ formula }) => `${formula} radiant` }],
    "entries": ["Archer constellation. When you assume Starry Form and as a Bonus Action on later turns, make a ranged spell attack (60 ft) hurling a luminous arrow. On a hit it deals Radiant damage equal to 1d8 + your WIS modifier (2d8 + WIS at level 10)."]
  },
  {
    "name": "Cosmic Omen",
    "icon": "",
    "cat": "reaction",
    "uses": "WIS mod / LR",
    "resKey": "stars_cosmic_omen",
    "minLevel": 6
  }
]);
registerSubclassRuntimeConfig("Druid_Stars", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Guidance", minLevel: 3, level: 0 },
      {
        name: "Guiding Bolt",
        minLevel: 3,
        level: 1,
        source: "Star Map",
        sourceType: "subclass",
        freeCast: {
          id: "druid-stars-star-map-guiding-bolt",
          label: "Star Map",
          source: "Star Map",
          sourceType: "subclass",
          usesFormula: "abilityMod:wis",
          recharge: "longRest",
          consumesSlot: false,
          canAlsoUseSlots: true,
        },
      },
    ],
  },
});
registerSubclassSheetResources("Druid_Stars", [
  {
    "key": "stars_cosmic_omen",
    "name": "Cosmic Omen",
    "icon": "sparkles",
    "recharge": "LR",
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  }
]);

registerSubclassSheetEffects("Druid_Stars", [

  { type: "d20-floor", minRoll: 10, minLevel: 3,
    requiredChoice: { key: "stars_constellation", value: "Dragon" },
    note: "Starry Form: Dragon constellation for INT/WIS checks and Concentration saves." },
  { type: "speed", speedType: "fly", value: 20, situational: true, minLevel: 10,
    requiredChoice: { key: "stars_constellation", value: "Dragon" },
    note: "Twinkling Constellations: Dragon form fly speed with Hover." },
  { type: "resistance", damageTypes: ["Bludgeoning", "Piercing", "Slashing"], minLevel: 14, note: "Full of Stars while Starry Form is active." },

]);

// Starry Form: Chalice constellation. While selected, every healing spell also
// restores extra HP to you or a creature within 30 ft. Surfaced on each healing
// spell row (extra heal button + tag + description) via the spell-rider system.
registerSubclassSpellRiders("Druid_Stars", [
  ({ character, hasHeal, ownerLevel }) => {
    if (!hasHeal || ownerLevel < 3 || !isConstellation(character, "chalice")) return null;
    const formula = withWisMod(starryFormDie(ownerLevel), character);
    return {
      id: "stars-chalice",
      tag: { label: "Chalice", color: ENTITY_COLORS.subclass },
      rollers: [{ key: "chalice-heal", kind: "heal", formula, label: `Chalice ${formula}`, title: "Chalice Heal" }],
      modifierDetails: [{
        key: "stars-chalice",
        detailGroupLabel: "Starry Form",
        detailTitle: "Chalice (extra healing)",
        detailText: `Chalice constellation (Starry Form): whenever you cast a spell with a spell slot that restores Hit Points, you or another creature within 30 ft of you also regains ${formula} Hit Points.`,
      }],
    };
  },
]);

}

