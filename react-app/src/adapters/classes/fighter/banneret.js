import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
const _BANNERET_ENVOY_SKILLS = ['Insight', 'Intimidation', 'Persuasion', 'Performance'];

registerSubclassAdapter("Fighter_Banneret", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_banneret_envoy_skill',
      label: 'Knightly Envoy — Well Spoken (Skill)',
      type: 'skill_choice',
      from: _BANNERET_ENVOY_SKILLS,
      count: 1,
      level: 3
    });
    specs.push({
      key: 'subclass_banneret_language',
      label: 'Knightly Envoy — Polyglot (Language)',
      type: 'language_choice',
      count: 1,
      level: 3
    });
  }
});

registerSubclassSheetActions("Fighter_Banneret", [
  {
    "name": "Shared Resilience",
    
    "cat": "reaction",
    
    "minLevel": 15
  }
]);

registerSubclassSheetEffects("Fighter_Banneret", [

  { type: "skillExpertise", values: ["Persuasion"], minLevel: 7, note: "Royal Envoy." },
]);

}

