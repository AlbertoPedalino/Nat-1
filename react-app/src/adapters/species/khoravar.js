import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ALL_TOOLS,
    registerSpeciesAdapter,
    registerSpeciesSheetCommonChoiceMeta,
    getGenericSpeciesChoiceSpecs,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Khoravar_EFA", function (s) {
  const specs = getGenericSpeciesChoiceSpecs(s);

  // Skill Versatility: choose 1 skill or tool (replaceable on Long Rest)
  const skillsAndTools = [
    ...(typeof SKILLS !== 'undefined' ? SKILLS.map(function(sk){ return sk.n; }) : []),
    ...(typeof _ALL_TOOLS !== 'undefined' ? _ALL_TOOLS : []),
  ];
  specs.push({
    key: 'khoravar_skill_versatility',
    label: 'Skill Versatility — Skill o Tool (sostituibile dopo Long Rest)',
    type: 'generic_choice',
    from: skillsAndTools,
    count: 1,
    level: 1,
  });

  const abilityChoices = (s.additionalSpells || [])
    .flatMap(g => g?.ability?.choose || [])
    .filter(Boolean);
  const uniqueAbilities = [...new Set(abilityChoices)];

  if (uniqueAbilities.length) {
    specs.push({
      key: 'species_spell_ability',
      label: 'Spellcasting Ability (Khoravar)',
      type: 'ability_choice',
      from: uniqueAbilities,
      count: 1,
      level: 1,
    });
  }

  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Khoravar_EFA", {
  isChoiceKey: function (choiceKey) {
    const k = String(choiceKey || '');
    return /^species_/i.test(k) || k === 'khoravar_skill_versatility';
  },
  labels: {
    species_spell_ability: 'Spellcasting Ability (Khoravar)',
    khoravar_skill_versatility: 'Skill Versatility',
  },
});

}

