import { createAdapterBindings } from '../../adapterBindings.js';
import { classChoiceIs } from '../../../shared/character/progression/choiceUtils.js';

export default function install(registry, context = {}) {
  const {
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassRuntimeConfig,
    registerClassSheetProficiencies,
    registerResourceSideEffect,
  } = createAdapterBindings(registry, context);
registerClassAdapter("Druid", function (cls, lv, specs, ctx = {}) {
  const character = ctx.character || {};
  const choices = ctx.choices || character.choices || {};
  const keyPrefix = ctx.keyPrefix || '';
  const hasChoice = (key, value) => classChoiceIs(choices, key, value, keyPrefix);

  if (lv >= 1) {
    specs.push({
      key: 'druid_primal_order',
      label: 'Primal Order',
      type: 'generic_choice',
      from: ['Magician', 'Warden'],
      count: 1,
      level: 1
    });
    if (hasChoice('druid_primal_order', 'Magician')) {
      specs.push({
        key: 'druid_magician_cantrip',
        label: 'Magician — Extra Cantrip',
        type: 'spell_choice',
        spellFilter: { spellLevel: 0, classes: ['Druid'] },
        count: 1,
        level: 1
      });
    }
  }
  if (lv >= 2) {
    specs.push({
      key: 'druid_wild_shape_forms',
      label: 'Wild Shape — Known Beast Forms',
      type: 'beast_choice',
      level: 2
    });
  }
  if (lv >= 7) {
    specs.push({
      key: 'druid_elemental_fury',
      label: 'Elemental Fury',
      type: 'generic_choice',
      from: ['Potent Spellcasting', 'Primal Strike'],
      count: 1,
      level: 7
    });
    if (hasChoice('druid_elemental_fury', 'Primal Strike')) {
      specs.push({
        key: 'druid_primal_strike_damage_type',
        label: 'Primal Strike Damage Type',
        type: 'generic_choice',
        from: ['Cold', 'Fire', 'Lightning', 'Thunder'],
        count: 1,
        level: 7
      });
    }
  }
  if (lv >= 19) {
    specs.push({ key: 'druid_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

registerClassSheetActions("Druid", [
  {
    "name": "Wild Shape",
    "icon": "",
    "cat": "bonus",
    "uses": "2 / SR+LR",
    "resKey": "wild_shape",
    "minLevel": 2,
    detailType: 'wildShape'
  },
  {
    "name": "Wild Companion",
    "icon": "",
    "cat": "action",
    "uses": "Spell slot or Wild Shape",
    "minLevel": 2,
    detailType: 'wildCompanion'
  },
  {
    "name": "Wild Resurgence",
    "icon": "",
    "cat": "bonus",
    "uses": "Situational",
    "resKey": "wild_resurgence",
    "minLevel": 5
  }
]);
registerClassSheetResources("Druid", [
  {
    "key": "wild_shape",
    "name": "Wild Shape",
    "icon": "paw-print",
    "recharge": "LR",
    "srRecover": 1,
    "max": (lv)=>lv>=17?4:lv>=6?3:2
  },
  {
    "key": "wild_resurgence",
    "name": "Wild Resurgence",
    "icon": "refresh-cw",
    "recharge": "LR",
    "max": () => Infinity,
    "pool": true
  }
]);
registerClassSheetProficiencies("Druid", [
  { type: "language", values: ["Druidic"], minLevel: 1 },
  { type: "armor",  values: ["Medium"],  minLevel: 1, requiredChoice: { key: "druid_primal_order", value: "Warden" } },
  { type: "weapon", values: ["Martial"], minLevel: 1, requiredChoice: { key: "druid_primal_order", value: "Warden" } }
]);

// Druidic feature (lv.1) always keeps Speak with Animals prepared.
registerClassRuntimeConfig("Druid", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Speak with Animals", minLevel: 1, level: 1 }
    ],
  },
});

registerResourceSideEffect('wild_resurgence', function (ctx = {}) {
  const res = ctx.resources || {};
  const currentWS = Number(res.wild_shape || 0);
  const slots = ctx.slots || { regular: [] };
  const used = ctx.sheet?.spellSlotUsed || {};
  const created = ctx.sheet?.createdSpellSlots || {};
  const hasWildShape = currentWS > 0;
  let hasAvailableSlot = false;
  for (let lv = 1; lv <= slots.regular.length; lv++) {
    const total = Number(slots.regular[lv - 1] || 0);
    if (!total) continue;
    const avail = total - Number(used[lv] || used[String(lv)] || 0) + Number(created[lv] || 0);
    if (avail > 0) { hasAvailableSlot = true; break; }
  }
  return {
    type: 'wild_resurgence',
    hasWildShape,
    hasAvailableSlot,
    currentWS,
    label: 'Wild Resurgence',
  };
});

}

