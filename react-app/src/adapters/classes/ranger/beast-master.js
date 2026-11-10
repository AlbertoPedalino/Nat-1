import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Ranger_Beast Master", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_beast_companion_type',
      label: 'Primal Companion',
      type: 'generic_choice',
      from: ['Beast of the Land', 'Beast of the Sea', 'Beast of the Sky'],
      count: 1,
      level: 3
    });
  }
});

registerSubclassSheetActions("Ranger_Beast Master", [
  {
    "name": "Primal Companion",
    "icon": "paw-print",
    "cat": "bonus",
    "uses": "Commands / turn",
    "minLevel": 3,
    // Interactive card: beast choice, HP, revive and its rollable stat block.
    "detailType": "primalCompanion"
  }
]);


}

