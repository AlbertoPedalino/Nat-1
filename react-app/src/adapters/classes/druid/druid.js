import { createAdapterBindings } from '../../adapterBindings.js';
import { classChoiceIs } from '../../../shared/character/progression/choiceUtils.js';

export default function install(registry, context = {}) {
  const {
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
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
    "cat": "bonus",
    "resKey": "wild_shape",
    "minLevel": 2,
    detailType: 'wildShape'
  },
  {
    "name": "Wild Companion",
    "cat": "action",
    "minLevel": 2,
    detailType: 'wildCompanion'
  },
  // Wild Resurgence (level 5), both halves with no action required: its use,
  // once per Long Rest, turns a Wild Shape use into a level 1 slot; its effect,
  // as often as wanted, a spell slot into a Wild Shape use while none is left
  // (once per turn: the player's to keep).
  {
    name: "Wild Resurgence",
    cat: "special",
    resKey: "wild_resurgence",
    resLabel: "Wild Shape → Level 1 Slot",
    effects: [{ key: "wild_resurgence_shape", label: "Spell Slot → Wild Shape" }],
    minLevel: 5
  }
]);
registerClassSheetResources("Druid", [
  {
    "key": "wild_shape",
    "name": "Wild Shape",
    "recharge": "LR",
    "srRecover": 1,
    "max": (lv)=>lv>=17?4:lv>=6?3:2
  },
  {
    key: "wild_resurgence",
    name: "Wild Resurgence",
    recharge: "LR",
    minLevel: 5,
    max: () => 1
  }
]);
registerClassSheetProficiencies("Druid", [
  { type: "language", values: ["Druidic"], minLevel: 1 },
  { type: "armor",  values: ["Medium"],  minLevel: 1, requiredChoice: { key: "druid_primal_order", value: "Warden" } },
  { type: "weapon", values: ["Martial"], minLevel: 1, requiredChoice: { key: "druid_primal_order", value: "Warden" } }
]);

// A Wild Shape use for a level 1 spell slot (the 1/Long Rest use just spent).
registerResourceSideEffect('wild_resurgence', () => ({
  type: 'spend_resource_for_slot',
  costKey: 'wild_shape',
  slotLevel: 1,
  label: 'Wild Resurgence',
}));

// A spell slot for a Wild Shape use, only with none left.
registerResourceSideEffect('wild_resurgence_shape', ({ resources, resourceMax }) => {
  if (Number(resources?.wild_shape || 0) > 0) {
    return { type: 'notice', label: 'Wild Resurgence', message: 'Only when you have no uses of Wild Shape left.' };
  }
  return {
    type: 'spend_slot_recover_resource',
    targetKey: 'wild_shape',
    recoverAmount: 1,
    recoverMax: Number(resourceMax?.wild_shape ?? 1),
    label: 'Wild Resurgence',
    note: 'Expend a spell slot to give yourself one use of Wild Shape (no action required).',
  };
});

}

