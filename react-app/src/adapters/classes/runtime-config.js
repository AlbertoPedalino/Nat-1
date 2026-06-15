import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
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


  if (typeof registerClassRuntimeConfig !== "function") return;

  function regClass(name, cfg) {
    registerClassRuntimeConfig(name, cfg || {});
  }
  function regSubclass(key, cfg) {
    if (typeof registerSubclassRuntimeConfig === "function") {
      registerSubclassRuntimeConfig(key, cfg || {});
    }
  }
  function regSpecies(key, cfg) {
    if (typeof registerSpeciesRuntimeConfig === "function") {
      registerSpeciesRuntimeConfig(key, cfg || {});
    }
  }

  // XPHB 2024 fixed prepared-spell tables (source: 5etools class JSON)
  const _PREP_FULL      = [4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
  const _PREP_WIZARD    = [4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25];
  const _PREP_HALF      = [2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15];
  const _PREP_SORCERER  = [2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
  const _PREP_WARLOCK   = [2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15];

  regClass("Barbarian", {
    multiclassPrerequisites: [{ str: 13 }],
    unarmoredDefense: [{ name: "Unarmored Defense", base: 10, abilities: ["dex", "con"], allowShield: true, minLevel: 1 }],
  });
  regClass("Bard", {
    multiclassPrerequisites: [{ cha: 13 }],
    spellcasting: {
      ability: "cha",
      casterProgression: "full",
      preparedMode: "prepared",
      cantripKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      preparedSpellsProgression: _PREP_FULL,
      alwaysPreparedSpells: [
        { name: "Power Word Heal", minLevel: 20, level: 9, source: "Words of Creation", sourceType: "class" },
        { name: "Power Word Kill", minLevel: 20, level: 9, source: "Words of Creation", sourceType: "class" },
      ],
      choiceSpellSources: {
        bard_magical_secrets_lv10: { label: "Magical Secrets", ability: "cha" },
      },
    },
    skillRules: { jackOfAllTradesMinLevel: 2 },
    featureDice: {
      bardicInspiration: [
        { minLevel: 15, faces: 12 },
        { minLevel: 10, faces: 10 },
        { minLevel: 5, faces: 8 },
        { minLevel: 1, faces: 6 },
      ],
    },
  });
  regClass("Cleric", {
    multiclassPrerequisites: [{ wis: 13 }],
    spellcasting: {
      ability: "wis",
      casterProgression: "full",
      preparedMode: "prepared",
      cantripKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      preparedSpellsProgression: _PREP_FULL,
      ritualCasting: true,
      choiceSpellSources: {
        cleric_thaumaturge_cantrip: { label: "Divine Order (Thaumaturge)", ability: "wis" },
      },
    },
  });
  regClass("Druid", {
    multiclassPrerequisites: [{ wis: 13 }],
    spellcasting: {
      ability: "wis",
      casterProgression: "full",
      preparedMode: "prepared",
      cantripKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      preparedSpellsProgression: _PREP_FULL,
      ritualCasting: true,
      choiceSpellSources: {
        druid_magician_cantrip: { label: "Primal Order (Magician)", ability: "wis" },
      },
    },
  });
  regClass("Fighter", {
    multiclassPrerequisites: [{ str: 13 }, { dex: 13 }],
  });
  regClass("Monk", {
    multiclassPrerequisites: [{ dex: 13, wis: 13 }],
    unarmoredDefense: [{ name: "Unarmored Defense", base: 10, abilities: ["dex", "wis"], allowShield: false, minLevel: 1 }],
  });
  regClass("Paladin", {
    multiclassPrerequisites: [{ str: 13, cha: 13 }],
    spellcasting: {
      ability: "cha",
      casterProgression: "half",
      preparedMode: "prepared",
      preparedSpellsProgression: _PREP_HALF,
      alwaysPreparedSpells: [
        {
          name: "Divine Smite",
          minLevel: 2,
          level: 1,
          source: "Paladin's Smite",
          sourceType: "class",
          freeCast: {
            id: "paladin-paladins-smite-divine-smite",
            label: "Paladin's Smite",
            source: "Paladin's Smite",
            sourceType: "class",
            maxUses: 1,
            recharge: "longRest",
            consumesSlot: false,
            canAlsoUseSlots: true,
          },
        },
      ],
    },
  });
  regClass("Ranger", {
    multiclassPrerequisites: [{ dex: 13, wis: 13 }],
    spellcasting: {
      ability: "wis",
      casterProgression: "half",
      preparedMode: "prepared",
      preparedSpellsProgression: _PREP_HALF,
      alwaysPreparedSpells: [
        {
          name: "Hunter's Mark",
          minLevel: 1,
          level: 1,
          source: "Favored Enemy",
          sourceType: "class",
          freeCast: {
            id: "ranger-favored-enemy-hunters-mark",
            label: "Favored Enemy",
            source: "Favored Enemy",
            sourceType: "class",
            usesFormula: ({ ownerLevel = 1 }) => {
              if (ownerLevel >= 17) return 6;
              if (ownerLevel >= 13) return 5;
              if (ownerLevel >= 9) return 4;
              if (ownerLevel >= 5) return 3;
              return 2;
            },
            recharge: "longRest",
            consumesSlot: false,
            canAlsoUseSlots: true,
          },
        },
      ],
    },
  });
  regClass("Rogue", {
    multiclassPrerequisites: [{ dex: 13 }],
  });
  regClass("Sorcerer", {
    multiclassPrerequisites: [{ cha: 13 }],
    spellcasting: {
      ability: "cha",
      casterProgression: "full",
      preparedMode: "prepared",
      cantripKnown: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      preparedSpellsProgression: _PREP_SORCERER,
    },
  });
  regClass("Warlock", {
    multiclassPrerequisites: [{ cha: 13 }],
    spellcasting: {
      ability: "cha",
      casterProgression: "pact",
      preparedMode: "prepared",
      cantripKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      preparedSpellsProgression: _PREP_WARLOCK,
      alwaysPreparedSpells: [
        { name: "Contact Other Plane", minLevel: 9, level: 5 },
      ],
      choiceSpellSources: {
        warlock_tome_cantrip_1: { label: "Pact of the Tome", ability: "cha" },
        warlock_tome_cantrip_2: { label: "Pact of the Tome", ability: "cha" },
        warlock_tome_cantrip_3: { label: "Pact of the Tome", ability: "cha" },
      },
    },
  });
  regClass("Wizard", {
    multiclassPrerequisites: [{ int: 13 }],
    spellcasting: {
      ability: "int",
      casterProgression: "full",
      preparedMode: "prepared",
      cantripKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      preparedSpellsProgression: _PREP_WIZARD,
      ritualCasting: true,
      choiceSpellSources: {
        wizard_spell_mastery_l1: { label: "Spell Mastery (Lv.18)", ability: "int" },
        wizard_spell_mastery_l2: { label: "Spell Mastery (Lv.18)", ability: "int" },
        wizard_signature_1: { label: "Signature Spell (Lv.20)", ability: "int" },
        wizard_signature_2: { label: "Signature Spell (Lv.20)", ability: "int" },
      },
    },
  });
  regClass("Artificer", {
    multiclassPrerequisites: [{ int: 13 }],
    spellcasting: {
      ability: "int",
      casterProgression: "artificer",
      preparedMode: "prepared",
      preparedSpellsProgression: _PREP_HALF,
      cantripKnown: [2,2,2,2,2,2,2,2,2,3,3,3,3,4,4,4,4,4,4,4],
      alwaysKnownSpells: [
        { name: "Mending", minLevel: 1, level: 0, source: "Tinker's Magic", sourceType: "class" },
      ],
      ritualCasting: true,
    },
  });

  regSubclass("Bard_Dance", {
    unarmoredDefense: [{ name: "Dance of the Wind", base: 10, abilities: ["dex", "cha"], allowShield: false, minLevel: 3 }],
    unarmedStrike: {
      minLevel: 3,
      requiresNoArmor: true,
      requiresNoShield: true,
      attackAbility: "dex",
      damage: {
        kind: "featureDie",
        className: "Bard",
        feature: "bardicInspiration",
        ability: "dex",
        label: "Bardic Damage (Unarmed)",
      },
      badge: "Bardic Damage",
    },
  });
  regSubclass("Paladin_Noble Genies", {
    unarmoredDefense: [{ name: "Genie's Splendor", base: 10, abilities: ["dex", "cha"], allowShield: true, minLevel: 3 }],
  });
}

