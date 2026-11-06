import { createAdapterBindings } from '../adapterBindings.js';
import { SKILL_NAMES } from '../../shared/content/rulesVocabulary.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetCommonChoiceMeta,
    registerSpeciesLongRestGrants,
    getGenericSpeciesChoiceSpecs,
  } = createAdapterBindings(registry, context);
// Human XPHB: Skillful + Versatile — one skill proficiency and one extra Origin Feat.
registerSpeciesAdapter("Human_XPHB", function (s) {
  let specs = getGenericSpeciesChoiceSpecs(s);
  const skillNames = SKILL_NAMES;

  if (!specs.some(function (spec) { return spec.type === 'skill_choice' || String(spec.key || '').startsWith('species_skill_'); })) {
    specs.push({
      key: 'human_skillful_skill',
      label: 'Skillful — Skill Proficiency',
      type: 'skill_choice',
      from: skillNames,
      count: 1,
      level: 1,
    });
  }

  specs.push({
    key: 'species_origin_feat',
    label: 'Versatile — Extra Origin Feat',
    type: 'feat_cat',
    categories: ['O'],
    count: 1,
    level: 1,
  });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Human_XPHB", {
  labels: {
    human_skillful_skill: 'Skillful — Skill Proficiency',
    species_origin_feat: 'Origin Feat (Human Versatile)',
  },
});

// Heroic Inspiration: regain Inspiration on Long Rest
registerSpeciesLongRestGrants('Human', 'XPHB', { inspiration: true });

}

