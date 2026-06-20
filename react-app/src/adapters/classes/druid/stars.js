import { createAdapterBindings } from '../../adapterBindings.js';
import { getChoiceValue } from '../../../shared/character/choiceUtils.js';
import { ENTITY_COLORS } from '../../../shared/entityColors.js';

export default function install(registry, context = {}) {
  const getPB = context?.getPB;
  const getMod = context?.getMod;
  const getFinal = context?.getFinal;

  // Starry Form constellations (Archer attack / Chalice heal) share one scaling
  // rule: a d8 that doubles at level 10 (Twinkling Constellations), plus WIS.
  // Single source so the action roller and the spell rider can't drift.
  const starryFormDie = (level) => (Number(level || 0) >= 10 ? '2d8' : '1d8');
  const withWisMod = (dice, character) => {
    if (typeof getMod !== 'function' || typeof getFinal !== 'function') return dice;
    try {
      const wis = getMod(getFinal(character, 'wis'));
      return wis > 0 ? `${dice}+${wis}` : wis < 0 ? `${dice}${wis}` : dice;
    } catch { return dice; }
  };
  const isConstellation = (character, value) =>
    String(getChoiceValue(character, 'stars_constellation') || '').toLowerCase() === value;
  const {
    SKILLS,
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    _GAMING_SETS,
    _VEHICLE_TOOLS,
    _STD_LANGS,
    _EXOTIC_LANGS,
    _ALL_LANGS,
    _ALL_TOOLS,
    allItemsDb,
    registerClassAdapter,
    getClassAdapter,
    registerSubclassAdapter,
    getSubclassAdapter,
    registerSpeciesAdapter,
    getSpeciesAdapter,
    registerFeatAdapter,
    getFeatAdapter,
    registerClassSheetActions,
    getClassSheetActions,
    registerSubclassSheetActions,
    getSubclassSheetActions,
    registerSpeciesSheetActions,
    getSpeciesSheetActions,
    registerFeatSheetActions,
    getFeatSheetActions,
    registerClassSheetResources,
    getClassSheetResources,
    registerSubclassSheetResources,
    getSubclassSheetResources,
    registerSpeciesSheetResources,
    getSpeciesSheetResources,
    registerFeatSheetResources,
    getFeatSheetResources,
    registerClassSheetEffects,
    getClassSheetEffects,
    registerSubclassSheetEffects,
    getSubclassSheetEffects,
    registerSpeciesSheetEffects,
    getSpeciesSheetEffects,
    registerFeatSheetEffects,
    getFeatSheetEffects,
    registerClassRuntimeConfig,
    getClassRuntimeConfig,
    registerSubclassRuntimeConfig,
    getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig,
    getSpeciesRuntimeConfig,
    registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta,
    getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta,
    getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta,
    registerSubclassSheetCommonChoiceMeta,
    registerSpeciesSheetCommonChoiceMeta,
    registerItemFlagDef,
    getItemFlagDef,
    getAllItemFlagDefs,
    registerWeaponAbilityOverride,
    getWeaponAbilityOverrides,
    registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter,
    getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter,
    getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies,
    getClassSheetProficiencies,
    registerSubclassSheetProficiencies,
    getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies,
    getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers,
    getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers,
    getSpeciesSheetSpellModifiers,
    registerSubclassSpellRiders,
    registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus,
    getSpeciesSheetHpBonus,
    registerClassAtWillSpells,
    getClassAtWillSpells,
    registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants,
    registerResourceSideEffect,
    getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider,
    registerGlobalClassAdapter,
    getGlobalClassAdapters,
    registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter,
    getGlobalFeatAdapters,
    registerGlobalSpellAdapter,
    getGlobalSpellAdapters,
    registerGlobalItemAdapter,
    getGlobalItemAdapters,
    registerCantripData,
    getCantripData,
    registerCantripDataModifier,
    getCantripDataModifiers,
    registerSpellData,
    getSpellData,
    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Druid_Stars", function (cls, lv, specs) {});

// [SheetRuntime] START
registerSubclassSheetActions("Druid_Stars", [
  {
    "name": "Star Map",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "You create a star chart (Tiny object) that serves as your spellcasting focus. The Guidance and Guiding Bolt spells are always prepared for you. You can cast Guiding Bolt without expending a spell slot (WIS modifier uses, min 1, per Long Rest) — tracked on the Guiding Bolt spell. If you lose the map, perform a 1-hour ceremony to create a replacement (can be done during a Short or Long Rest)."
  },
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
    "choiceRestNote": "Choose a constellation when you assume Starry Form. Click the active one again to clear it. At level 10+ you can change it at the start of each of your turns.",
    "desc": "Spend a Wild Shape use to take on a starry form for 10 minutes (retain your stats; body becomes luminous, sheds Bright Light 10 ft and Dim Light 10 ft beyond). Choose one constellation: Archer — when you activate this form and as a Bonus Action on subsequent turns, make a ranged spell attack (60 ft, 1d8+WIS Radiant on hit; 2d8+WIS at lv.10). Chalice — when you cast a spell using a spell slot that restores HP to a creature, you or another creature within 30 ft also regains 1d8+WIS HP (2d8+WIS at lv.10). Dragon — when you make an INT or WIS check or a CON save to maintain Concentration, treat a d20 roll of 9 or lower as a 10. At lv.10, you can change constellation at the start of each of your turns."
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
      if (typeof getPB !== 'function' || typeof getMod !== 'function' || typeof getFinal !== 'function') return 0;
      try { return getPB(character) + getMod(getFinal(character, 'wis')); } catch { return 0; }
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
    "minLevel": 6,
    "desc": "After each Long Rest, consult your Star Map and roll any die. Even = Weal, Odd = Woe. Uses: WIS modifier (min 1) per Long Rest. Reaction when a creature you can see within 30 ft is about to make a D20 Test: Weal — roll 1d6 and add the number to the roll. Woe — roll 1d6 and subtract the number from the roll."
  },
  {
    "name": "Twinkling Constellations",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 10,
    "desc": "Passive: while in Starry Form, the Archer and Chalice damage/healing increases to 2d8+WIS. The Dragon form instead grants a Fly Speed of 20 ft with Hover. Additionally, at the start of each of your turns while in Starry Form, you can change which constellation glimmers on your body."
  },
  {
    "name": "Full of Stars",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 14,
    "desc": "Passive: while in Starry Form, you become partially incorporeal and gain Resistance to Bludgeoning, Piercing, and Slashing damage."
  }
]);
if (typeof registerSubclassRuntimeConfig === "function") {
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
}
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
  { type: "speed", speedType: "fly", value: 20, minLevel: 10,
    requiredChoice: { key: "stars_constellation", value: "Dragon" },
    note: "Twinkling Constellations: Dragon form fly speed with Hover." },
  { type: "resistance", damageTypes: ["Bludgeoning", "Piercing", "Slashing"], minLevel: 14, note: "Full of Stars while Starry Form is active." },

]);

// Starry Form: Chalice constellation. While selected, every healing spell also
// restores extra HP to you or a creature within 30 ft. Surfaced on each healing
// spell row (extra heal button + tag + description) via the spell-rider system.
if (typeof registerSubclassSpellRiders === "function") {
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
// [SheetRuntime] END

}

