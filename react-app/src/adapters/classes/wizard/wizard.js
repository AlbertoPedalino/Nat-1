import { createAdapterBindings } from '../../adapterBindings.js';
import { classLevel } from '../../../shared/character/progression/classLevel.js';

export default function install(registry, context = {}) {
  const {
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerResourceSideEffect,
  } = createAdapterBindings(registry, context);
registerClassAdapter("Wizard", function (cls, lv, specs) {
  if (lv >= 2) {
    specs.push({
      key: 'wizard_scholar',
      label: 'Scholar (Expertise)',
      type: 'expertise',
      from: ['Arcana', 'Investigation', 'Medicine', 'Religion', 'History', 'Nature'],
      count: 1,
      level: 2,
      requiresProficiency: true
    });
  }
  if (lv >= 18) {
    // Spell Mastery: 1 spell L1 + 1 spell L2 sempre preparate e gratis
    specs.push({
      key: 'wizard_spell_mastery_l1',
      label: 'Spell Mastery — Spell L1',
      type: 'spell_choice',
      spellFilter: { spellLevel: 1, classes: ['Wizard'] },
      count: 1,
      level: 18
    });
    specs.push({
      key: 'wizard_spell_mastery_l2',
      label: 'Spell Mastery — Spell L2',
      type: 'spell_choice',
      spellFilter: { spellLevel: 2, classes: ['Wizard'] },
      count: 1,
      level: 18
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'wizard_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
  if (lv >= 20) {
    // Signature Spells: 2 spell L3 gratuite 1×/SR
    specs.push({
      key: 'wizard_signature_1',
      label: 'Signature Spell 1',
      type: 'spell_choice',
      spellFilter: { spellLevel: 3, classes: ['Wizard'] },
      count: 1,
      level: 20
    });
    specs.push({
      key: 'wizard_signature_2',
      label: 'Signature Spell 2',
      type: 'spell_choice',
      spellFilter: { spellLevel: 3, classes: ['Wizard'] },
      count: 1,
      level: 20
    });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Wizard", [
  {
    "name": "Arcane Recovery",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "arc_recovery"
  },
  {
    "name": "Memorize Spell",
    "icon": "",
    "cat": "bonus",
    "uses": "1 / SR",
    "minLevel": 5
  },
  {
    "name": "Spell Mastery",
    "icon": "",
    "cat": "action",
    "uses": "At will",
    "minLevel": 18
  },
  {
    "name": "Signature Spells",
    "icon": "",
    "cat": "action",
    "uses": "1 / SR each",
    "minLevel": 20
  }
]);
registerClassSheetResources("Wizard", [
  {
    "key": "arc_recovery",
    "name": "Arcane Recovery",
    "icon": "book-open",
    "recharge": "LR",
    "max": ()=>1
  }
]);
// [SheetRuntime] END

// Arcane Recovery: when used, recover spell slots up to budget (Wizard level/2, rounded up).
registerResourceSideEffect('arc_recovery', function (ctx = {}) {
  const C = ctx.character || ctx.C;
  const wizLv = classLevel(C, 'Wizard');
  if (!wizLv) return null;
  const budget = Math.ceil(wizLv / 2);
  return {
    type: 'recover_spell_slots',
    budget,
    maxSlotLevel: 6,
    label: 'Arcane Recovery',
  };
});

}
