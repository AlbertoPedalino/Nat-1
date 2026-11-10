import { createAdapterBindings } from '../adapterBindings.js';
import { SKILL_NAMES } from '../../shared/content/rulesVocabulary.js';

export default function install(registry, context = {}) {
  const {
    _ALL_TOOLS,
    registerSpeciesAdapter,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Khoravar_EFA", function (s) {
  const specs = [];

  // Skill Versatility: choose 1 skill or tool (replaceable on Long Rest)
  const skillsAndTools = [
    ...(SKILL_NAMES),
    ...(_ALL_TOOLS),
  ];
  specs.push({
    key: 'khoravar_skill_versatility',
    label: 'Skill Versatility — Skill or Tool (replaceable after a Long Rest)',
    type: 'generic_choice',
    from: skillsAndTools,
    count: 1,
    level: 1,
  });

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

