import { createAdapterBindings } from '../../adapterBindings.js';

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
    registerFeatRuntimeConfig,
    getFeatRuntimeConfig,
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
  const getMod = context?.getMod;
  const getFinal = context?.getFinal;

function cleanChoice(value) {
  return String(value || '')
    .replace(/\{@[a-z]+ ([^|}]+)(?:\|[^}]*)?\}/gi, '$1')
    .split('|')[0]
    .trim();
}

function normChoice(value) {
  return cleanChoice(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function asChoiceArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function choiceValueFrom(character, key) {
  if (!character || !key) return null;

  const direct = character?.choices?.[key];
  if (direct != null) return direct;

  const prefixed = Object.entries(character?.choices || {}).find(([choiceKey]) => (
    String(choiceKey || '').replace(/^mc\d+_/, '') === key
  ));
  if (prefixed) return prefixed[1];

  const normalized = character?.normalizedChoices || {};
  const buckets = [
    normalized.rawByKey,
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

  return null;
}

function hasCharacterChoice(character, key, expected) {
  const wanted = normChoice(expected);
  if (!wanted) return false;

  return asChoiceArray(choiceValueFrom(character, key))
    .some((value) => normChoice(value) === wanted);
}

function firstCharacterChoice(character, key, fallback = '') {
  const first = asChoiceArray(choiceValueFrom(character, key))
    .find((value) => value != null && value !== '');

  return cleanChoice(first) || fallback;
}

function divineStrikeDamageType(character) {
  const chosen = firstCharacterChoice(character, 'cleric_divine_strike_damage_type', 'Radiant');
  return normChoice(chosen) === 'necrotic' ? 'Necrotic' : 'Radiant';
}
registerClassAdapter("Cleric", function (cls, lv, specs, ctx = {}) {
  const character = ctx.character || {};
  const choices = ctx.choices || character.choices || {};
  const keyPrefix = ctx.keyPrefix || '';
  const choiceValue = function (key) {
    const direct = choices[key];
    if (direct !== undefined) return direct;
    return choices[keyPrefix + key];
  };
  const hasChoice = function (key, value) {
    const raw = choiceValue(key);
    return asChoiceArray(raw).some(function (v) {
      return normChoice(v) === normChoice(value);
    });
  };

  if (lv >= 1) {
    specs.push({
      key: 'cleric_divine_order',
      label: 'Divine Order',
      type: 'generic_choice',
      from: ['Protector', 'Thaumaturge'],
      count: 1,
      level: 1
    });
    if (hasChoice('cleric_divine_order', 'Thaumaturge')) {
      specs.push({
        key: 'cleric_thaumaturge_cantrip',
        label: 'Thaumaturge — Extra Cantrip',
        type: 'spell_choice',
        spellFilter: { spellLevel: 0, classes: ['Cleric'] },
        count: 1,
        level: 1
      });
      specs.push({
        key: 'cleric_thaumaturge_skill_choice',
        label: 'Thaumaturge — Arcana or Religion',
        type: 'generic_choice',
        from: ['Arcana', 'Religion'],
        count: 1,
        level: 1
      });
    }
  }
  if (lv >= 7) {
    specs.push({
      key: 'cleric_blessed_strikes',
      label: 'Blessed Strikes',
      type: 'generic_choice',
      from: ['Divine Strike', 'Potent Spellcasting'],
      count: 1,
      level: 7
    });
    if (hasChoice('cleric_blessed_strikes', 'Divine Strike')) {
      specs.push({
        key: 'cleric_divine_strike_damage_type',
        label: 'Divine Strike Damage Type',
        type: 'generic_choice',
        from: ['Necrotic', 'Radiant'],
        count: 1,
        level: 7
      });
    }
  }
  if (lv >= 19) {
    specs.push({
      key: 'cleric_epic_boon',
      label: 'Epic Boon',
      type: 'feat_cat',
      categories: ['EB'],
      count: 1,
      level: 19
    });
  }
});

// [SheetRuntime] START
registerClassSheetProficiencies("Cleric", [
  { type: "armor",  values: ["Heavy"],   minLevel: 1, requiredChoice: { key: "cleric_divine_order", value: "Protector" } },
  { type: "weapon", values: ["Martial"], minLevel: 1, requiredChoice: { key: "cleric_divine_order", value: "Protector" } }
]);
registerClassSheetEffects("Cleric", [
  {
    type: "passiveNote",
    minLevel: 1,
    requiredChoice: { key: "cleric_divine_order", value: "Thaumaturge" },
    note: "Thaumaturge: choose Arcana or Religion; add your WIS modifier, minimum +1, to Intelligence checks with the chosen skill."
  }
]);
registerClassSheetActions("Cleric", [
  {
    "name": "Divine Order",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "desc": "Choose at lv.1 — Protector: proficiency with Martial weapons and Heavy armor; or Thaumaturge: learn one extra Cleric cantrip and gain a bonus equal to your WIS modifier (min +1) to Intelligence (Arcana or Religion) checks."
  },
  {
    "name": "Turn Undead",
    "icon": "",
    "cat": "action",
    "uses": "1 Channel",
    "resKey": "channel_div",
    "minLevel": 2,
    "desc": "Channel Divinity option. Each Undead within 30 ft that can see or hear you must succeed on a WIS save (DC = 8+PB+WIS) or have the Frightened and Incapacitated condition for 1 minute and must flee."
  },
  {
    "name": "Divine Spark",
    "icon": "",
    "cat": "action",
    "uses": "1+ Channel",
    "resKey": "channel_div",
    "minLevel": 2,
    "rollers": [
      {
        kind: "damage",
        formula: ({ character, ownerLevel }) => {
          const wis = typeof getMod === "function" && typeof getFinal === "function"
            ? Number(getMod(getFinal(character, "wis")) || 0)
            : 0;
          const lv = Number(ownerLevel || 1);
          const dice = lv >= 18 ? 4 : lv >= 13 ? 3 : lv >= 7 ? 2 : 1;
          return `${dice}d8${wis >= 0 ? "+" : ""}${wis}`;
        },
        label: ({ formula }) => `${String(formula || "")} radiant/necrotic`,
      },
      {
        kind: "heal",
        formula: ({ character, ownerLevel }) => {
          const wis = typeof getMod === "function" && typeof getFinal === "function"
            ? Number(getMod(getFinal(character, "wis")) || 0)
            : 0;
          const lv = Number(ownerLevel || 1);
          const dice = lv >= 18 ? 4 : lv >= 13 ? 3 : lv >= 7 ? 2 : 1;
          return `${dice}d8${wis >= 0 ? "+" : ""}${wis}`;
        },
      },
    ],
    "rollLabelPrefix": "Divine Spark",
    "desc": "Channel Divinity option. As a Magic action, point your Holy Symbol at a creature within 30 ft. Roll 1d8 + WIS modifier (scales by level: 2d8 at lv.7, 3d8 at lv.13, 4d8 at lv.18). Either restore that many HP, or force the creature to make a CON save — on failure it takes Radiant or Necrotic damage (your choice) equal to that total; on success it takes half."
  },
  {
    "name": "Sear Undead",
    "icon": "",
    "cat": "action",
    "uses": "With Turn Undead",
    "resKey": "channel_div",
    "minLevel": 5,
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      const wis = typeof getMod === 'function' && typeof getFinal === 'function'
        ? Number(getMod(getFinal(character, 'wis')) || 1)
        : 1;
      return `${Math.max(1, wis)}d8`;
    }, label: ({ formula }) => `${formula} radiant` }],
    "desc": "When you use Turn Undead, each Undead that fails its WIS save also takes Radiant damage equal to a number of d8s equal to your WIS modifier (minimum 1d8). This damage doesn't end the turn effect."
  },
  {
    "name": "Divine Intervention",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "divine_intervention",
    "minLevel": 10,
    "desc": "Choose any Cleric spell of level 5 or lower that doesn't require a Reaction. Cast it without expending a spell slot or needing Material components. Recharge: Long Rest."
  },
  {
    "name": "Blessed Strikes: Divine Strike",
    "icon": "",
    "cat": "attack",
    "uses": "Once/turn",
    "minLevel": 7,
    "condition": (character) => hasCharacterChoice(character, "cleric_blessed_strikes", "Divine Strike"),
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      return lv >= 14 ? "2d8" : "1d8";
    }, label: ({ character, ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const dice = lv >= 14 ? "2d8" : "1d8";
      return `+${dice} ${divineStrikeDamageType(character).toLowerCase()}`;
    } }],
    "desc": "Once per turn when you hit a creature with a weapon attack, deal additional Radiant or Necrotic damage of the type chosen for Divine Strike. The damage is 1d8, increasing to 2d8 at Cleric level 14."
  },
  {
    "name": "Blessed Strikes: Potent Spellcasting",
    "icon": "",
    "cat": "action",
    "uses": "Cantrip damage",
    "minLevel": 7,
    "condition": (character) => hasCharacterChoice(character, "cleric_blessed_strikes", "Potent Spellcasting"),
    "desc": "Add your Wisdom modifier to the damage rolls of your Cleric cantrips. At Cleric level 14, when you deal damage with a Cleric cantrip, grant Temporary HP equal to twice your WIS modifier to yourself or one creature within 60 ft."
  },
  {
    "name": "Improved Blessed Strikes",
    "icon": "",
    "cat": "action",
    "uses": "Reminder",
    "minLevel": 14,
    "desc": "Your Blessed Strikes choice is upgraded — Divine Strike: extra damage increases to 2d8; Potent Spellcasting: when you deal damage with a Cleric cantrip, you also grant Temporary HP equal to twice your WIS modifier to yourself or one creature within 60 ft."
  },
  {
    "name": "Greater Divine Intervention",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "divine_intervention",
    "minLevel": 20,
    "desc": "Your Divine Intervention can now target a Wish spell. If you cast Wish this way, you can't use Divine Intervention again until you finish 2d4 Long Rests. Otherwise functions as Divine Intervention (cast any Cleric spell ≤lv5, no slot or material component). Recharge: Long Rest."
  }
]);
registerClassSheetSpellModifiers("Cleric", [
  function (ctx) {
    if (!ctx || ctx.kind !== "damage") return ctx?.formula;

    const character = ctx.character || {};
    const ownerClassName = ctx.ownerClassName || ctx.spell?.ownerClassName || "";
    if (normChoice(ownerClassName) !== "cleric") return ctx?.formula;

    const isCantrip = !!ctx.spell?.isCantrip || Number(ctx.level ?? ctx.spell?.level ?? 0) === 0;
    if (!isCantrip) return ctx?.formula;

    if (!hasCharacterChoice(character, "cleric_blessed_strikes", "Potent Spellcasting")) {
      return ctx?.formula;
    }

    const wis = typeof getMod === "function" && typeof getFinal === "function"
      ? Number(getMod(getFinal(character, "wis")) || 0)
      : 0;

    if (!wis) return ctx?.formula;

    const formula = String(ctx.formula || "").replace(/\s+/g, "");
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!match) return ctx?.formula;

    const count = Number(match[1] || 0);
    const faces = Number(match[2] || 0);
    const existingMod = Number(match[3] || 0);

    if (!Number.isFinite(count) || !Number.isFinite(faces) || count < 1 || faces < 1) {
      return ctx?.formula;
    }

    const nextMod = existingMod + wis;
    return `${count}d${faces}${nextMod ? (nextMod > 0 ? "+" : "") + nextMod : ""}`;
  }
]);
registerClassSheetResources("Cleric", [
  {
    "key": "channel_div",
    "name": "Channel Divinity",
    "actionGroup": "Channel Divinity",
    "icon": "sun",
    "recharge": "SR",
    "max": (lv)=>lv>=18?4:lv>=6?3:2
  },
  {
    "key": "divine_intervention",
    "name": "Divine Intervention",
    "icon": "hands",
    "recharge": "LR",
    "max": (lv)=>lv>=10?1:0
  }
]);
// [SheetRuntime] END

}
