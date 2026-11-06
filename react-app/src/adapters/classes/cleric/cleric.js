import { createAdapterBindings } from '../../adapterBindings.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';
import { classChoiceIs, hasChoiceValue, readChoiceValue } from '../../../shared/character/progression/choiceUtils.js';
import { asArray } from '../../../shared/lists.js';
import { choiceKey, choiceText } from '../../../shared/content/nameKeys.js';

export default function install(registry, context = {}) {
  const {
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetEffects,
    registerClassSheetProficiencies,
    registerClassSheetSpellModifiers,
  } = createAdapterBindings(registry, context);

function firstCharacterChoice(character, key, fallback = '') {
  const first = asArray(readChoiceValue(character, key))
    .find((value) => value != null && value !== '');

  return choiceText(first) || fallback;
}

function divineStrikeDamageType(character) {
  const chosen = firstCharacterChoice(character, 'cleric_divine_strike_damage_type', 'Radiant');
  return choiceKey(chosen) === 'necrotic' ? 'Necrotic' : 'Radiant';
}
registerClassAdapter("Cleric", function (cls, lv, specs, ctx = {}) {
  const character = ctx.character || {};
  const choices = ctx.choices || character.choices || {};
  const keyPrefix = ctx.keyPrefix || '';
  const hasChoice = (key, value) => classChoiceIs(choices, key, value, keyPrefix);

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
    "name": "Turn Undead",
    "icon": "",
    "cat": "action",
    "uses": "1 Channel",
    "resKey": "channel_div",
    "minLevel": 2
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
          const wis = Number(finalAbilityModifier(character, "wis") || 0);
          const lv = Number(ownerLevel || 1);
          const dice = lv >= 18 ? 4 : lv >= 13 ? 3 : lv >= 7 ? 2 : 1;
          return withModifier(`${dice}d8`, wis);
        },
        label: ({ formula }) => `${String(formula || "")} radiant/necrotic`,
      },
      {
        kind: "heal",
        formula: ({ character, ownerLevel }) => {
          const wis = Number(finalAbilityModifier(character, "wis") || 0);
          const lv = Number(ownerLevel || 1);
          const dice = lv >= 18 ? 4 : lv >= 13 ? 3 : lv >= 7 ? 2 : 1;
          return withModifier(`${dice}d8`, wis);
        },
      },
    ],
    "rollLabelPrefix": "Divine Spark"
  },
  {
    "name": "Sear Undead",
    "icon": "",
    "cat": "action",
    "uses": "With Turn Undead",
    "resKey": "channel_div",
    "minLevel": 5,
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      const wis = Number(finalAbilityModifier(character, 'wis') || 1);
      return `${Math.max(1, wis)}d8`;
    }, label: ({ formula }) => `${formula} radiant` }]
  },
  {
    "name": "Divine Intervention",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "divine_intervention",
    "minLevel": 10
  },
  {
    "name": "Blessed Strikes: Divine Strike",
    "icon": "",
    "cat": "attack",
    "uses": "Once/turn",
    "minLevel": 7,
    "condition": (character) => hasChoiceValue(character, "cleric_blessed_strikes", "Divine Strike"),
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      return lv >= 14 ? "2d8" : "1d8";
    }, label: ({ character, ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const dice = lv >= 14 ? "2d8" : "1d8";
      return `+${dice} ${divineStrikeDamageType(character).toLowerCase()}`;
    } }]
  },
  {
    "name": "Blessed Strikes: Potent Spellcasting",
    "icon": "",
    "cat": "action",
    "uses": "Cantrip damage",
    "minLevel": 7,
    "condition": (character) => hasChoiceValue(character, "cleric_blessed_strikes", "Potent Spellcasting")
  },
  {
    "name": "Improved Blessed Strikes",
    "icon": "",
    "cat": "action",
    "uses": "Reminder",
    "minLevel": 14
  },
  {
    "name": "Greater Divine Intervention",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "divine_intervention",
    "minLevel": 20
  }
]);
registerClassSheetSpellModifiers("Cleric", [
  function (ctx) {
    if (!ctx || ctx.kind !== "damage") return ctx?.formula;

    const character = ctx.character || {};
    const ownerClassName = ctx.ownerClassName || ctx.spell?.ownerClassName || "";
    if (choiceKey(ownerClassName) !== "cleric") return ctx?.formula;

    const isCantrip = !!ctx.spell?.isCantrip || Number(ctx.level ?? ctx.spell?.level ?? 0) === 0;
    if (!isCantrip) return ctx?.formula;

    if (!hasChoiceValue(character, "cleric_blessed_strikes", "Potent Spellcasting")) {
      return ctx?.formula;
    }

    const wis = Number(finalAbilityModifier(character, "wis") || 0);

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
    return withModifier(`${count}d${faces}`, nextMod);
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

}
