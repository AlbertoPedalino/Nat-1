import { createAdapterBindings } from '../../adapterBindings.js';
import { classLevel } from '../../../shared/character/progression/classLevel.js';

export default function install(registry, context = {}) {
  const {
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetEffects,
    registerResourceSideEffect,
  } = createAdapterBindings(registry, context);
// Metamagic XPHB 2024
const _METAMAGIC = [
  'Careful Spell', 'Distant Spell', 'Empowered Spell', 'Extended Spell',
  'Heightened Spell', 'Quickened Spell', 'Seeking Spell', 'Subtle Spell',
  'Transmuted Spell', 'Twinned Spell',
];

registerClassAdapter("Sorcerer", function (cls, lv, specs, ctx = {}) {
  if (lv >= 2) {
    const count = lv >= 17 ? 6 : lv >= 10 ? 4 : 2;
    specs.push({
      key: 'sorcerer_metamagic',
      label: 'Metamagic',
      type: 'generic_choice',
      from: _METAMAGIC,
      count,
      level: 2
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'sorcerer_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

registerClassSheetActions("Sorcerer", [
  {
    "name": "Innate Sorcery",
    "cat": "bonus",
    "resKey": "innate_sorcery",
    "_toggleKey": "innate_sorcery",
    "minLevel": 1
  },
  {
    "name": "Font of Magic",
    "cat": "action",
    "resKey": "sorc_pts",
    "minLevel": 2
  },
  {
    "name": "Metamagic",
    "cat": "action",
    "resKey": "sorc_pts",
    "minLevel": 2
  },
  {
    "name": "Sorcerous Restoration",
    "cat": "action",
    "resKey": "sorc_restoration",
    "minLevel": 5
  },
  {
    "name": "Create Spell Slot (Font of Magic)",
    "cat": "action",
    "resKey": "sorc_create_slot",
    "minLevel": 2,
    "buttonLabel": "Create Slot"
  },
  {
    "name": "Convert Spell Slot (Font of Magic)",
    "cat": "action",
    "resKey": "sorc_convert_slot",
    "minLevel": 2,
    "buttonLabel": "Convert Slot"
  },
  {
    "name": "Sorcery Incarnate",
    "cat": "bonus",
    "resKey": "sorc_pts",
    "minLevel": 7
  }
]);
// Innate Sorcery (while active): +1 spell save DC and Advantage on the attack
// rolls of Sorcerer spells. The on/off flag lives on the character as
// innate_sorceryActive, set by the action's _toggleKey toggle. spellAttackAdvantage
// is scoped via spellClass so only Sorcerer-owned spells benefit (multiclass-safe).
function _sorcererInnateActive(C) { return !!C && C.innate_sorceryActive === true; }

registerClassSheetEffects("Sorcerer", [
  { type: "spellSaveDcBonus", value: 1, minLevel: 1, note: "Innate Sorcery", condition: _sorcererInnateActive },
  { type: "spellAttackAdvantage", spellClass: "Sorcerer", minLevel: 1, note: "Innate Sorcery", condition: _sorcererInnateActive },
]);
registerClassSheetResources("Sorcerer", [
  {
    "key": "sorc_restoration",
    "name": "Sorcerous Restoration",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "innate_sorcery",
    "name": "Innate Sorcery",
    "recharge": "LR",
    "max": () => 2
  },
  {
    "key": "sorc_pts",
    "name": "Sorcery Points",
    "recharge": "LR",
    "max": (lv)=>lv,
    "pool": true
  },
  {
    "key": "sorc_create_slot",
    "name": "Create/Restore Slot",
    "recharge": "LR",
    "max": () => Infinity,
    "pool": true
  },
  {
    "key": "sorc_convert_slot",
    "name": "Convert Spell Slot",
    "recharge": "LR",
    "max": () => Infinity,
    "pool": true
  }
]);

registerResourceSideEffect('sorc_restoration', function (ctx = {}) {
  const C = ctx.character;
  const sorcLv = classLevel(C, 'Sorcerer');
  if (!sorcLv) return null;
  return {
    type: 'recover_resource',
    targetResourceKey: 'sorc_pts',
    amount: Math.floor(sorcLv / 2),
    label: 'Sorcerous Restoration',
  };
});

registerResourceSideEffect('sorc_create_slot', function (ctx = {}) {
  const C = ctx.character;
  const res = ctx.resources || {};
  const currentSP = Number(res.sorc_pts || 0);
  if (currentSP < 2) return null;
  const sorcLv = classLevel(C, 'Sorcerer');
  return {
    type: 'create_spell_slot_from_points',
    sourceResourceKey: 'sorc_pts',
    currentSP,
    maxSorcererLevel: sorcLv,
    conversionTable: { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 },
    maxCreatedSlotLevel: 5,
    label: 'Create Spell Slot',
  };
});

registerResourceSideEffect('sorc_convert_slot', function (ctx = {}) {
  return {
    type: 'convert_spell_slot_to_points',
    targetResourceKey: 'sorc_pts',
    label: 'Convert Spell Slot',
  };
});

}

