import { createAdapterBindings } from '../../adapterBindings.js';
import { classLevel } from '../../../shared/character/progression/classLevel.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerResourceSideEffect,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Druid_Land", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_land_terrain',
      label: 'Land Type (Circle of the Land)',
      type: 'generic_choice',
      from: ['Arid', 'Polar', 'Temperate', 'Tropical'],
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Druid_Land", [
  {
    "name": "Land's Aid",
    "icon": "",
    "cat": "action",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 3,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      return lv >= 14 ? "4d6" : lv >= 10 ? "3d6" : "2d6";
    }, label: ({ formula }) => `${formula} necrotic` }]
  },
  {
    "name": "Natural Recovery",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "natural_recovery",
    "minLevel": 6
  },
  {
    "name": "Nature's Sanctuary",
    "icon": "",
    "cat": "action",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 14
  }
]);
registerSubclassSheetResources("Druid_Land", [
  {
    "key": "natural_recovery",
    "name": "Natural Recovery",
    "icon": "leaf",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Druid_Land", [

  { type: "conditionImmunity", conditions: ["Poisoned"], minLevel: 10, note: "Nature's Ward." },
  { type: "resistance-choice", key: "subclass_land_terrain", minLevel: 10, note: "Nature's Ward: resistance based on selected land type.",
    map: {
      arid: 'Fire',
      polar: 'Cold',
      temperate: 'Lightning',
      tropical: 'Poison',
    } },

]);

registerResourceSideEffect('natural_recovery', function (ctx = {}) {
  const C = ctx.character || ctx.C;
  const druidLv = classLevel(C, 'Druid');
  if (!druidLv) return null;
  const budget = Math.ceil(druidLv / 2);
  return {
    type: 'recover_spell_slots',
    budget,
    maxSlotLevel: 5,
    label: 'Natural Recovery',
  };
});
// [SheetRuntime] END

}

