import { createAdapterBindings } from '../../adapterBindings.js';
import { levelTable, MARTIAL_ARTS_DIE } from '../../classAdapterHelpers.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Monk_Mercy", function (cls, lv, specs) {});

registerSubclassSheetActions("Monk_Mercy", [
  { name: "Hand of Harm", cat: "attack", resKey: "ki", minLevel: 3,
    rollers: [{ kind: 'damage', formula: ({ character, ownerLevel }) => (
      withModifier(`1d${levelTable(ownerLevel, MARTIAL_ARTS_DIE)}`, finalAbilityModifier(character, 'wis'))
    ), label: ({ formula }) => `+${formula} necrotic` }] },
  { name: "Hand of Healing", cat: "action", resKey: "ki", minLevel: 3 },
  { name: "Flurry of Healing and Harm", cat: "bonus", resKey: "mercy_flurry", minLevel: 11 },
  { name: "Hand of Ultimate Mercy", cat: "action", resKey: "mercy_ultimate", minLevel: 17 },
]);
registerSubclassSheetResources("Monk_Mercy", [
  { key: "mercy_flurry", name: "Flurry of Healing and Harm", recharge: "LR",
    max: 'abilityMod:wis', minMax: 1 },
  { key: "mercy_ultimate", name: "Hand of Ultimate Mercy", recharge: "LR", max: () => 1 },
]);
registerSubclassSheetProficiencies("Monk_Mercy", [
  { type: "skill",  values: ["Insight", "Medicine"], minLevel: 3 },
  { type: "tool",   values: ["Herbalism Kit"],        minLevel: 3 },
]);

registerSubclassSheetEffects("Monk_Mercy", [

  { type: "healing", minLevel: 3, note: "Hand of Healing." },
  { type: "conditionRemoval", conditions: ["Blinded", "Deafened", "Paralyzed", "Poisoned", "Stunned"], minLevel: 6, note: "Physician's Touch." },
]);

}

