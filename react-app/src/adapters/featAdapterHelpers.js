import { createAdapterBindings } from './adapterBindings.js';
import { ABILITY_NAMES } from '../shared/content/rulesVocabulary.js';

// The Intelligence / Wisdom / Charisma pick a feat's granted spells are cast
// with, as one choiceUi entry.
export const SPELL_ABILITY_CHOICE = Object.freeze({
  keySuffix: 'spell_ability',
  label: 'Spellcasting Ability',
  options: ['int', 'wis', 'cha'].map((value) => ({ value, label: ABILITY_NAMES[value] })),
});

export function withSpellAbilityChoice(feat) {
  return {
    ...feat,
    choiceUi: {
      ...(feat.choiceUi || {}),
      spellAbility: SPELL_ABILITY_CHOICE,
    },
  };
}

export function installFeatAdapter(registry, context, {
  name,
  adapt,
  actions,
  resources,
  effects,
}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
    registerFeatSheetResources,
    registerFeatSheetEffects,
  } = createAdapterBindings(registry, context);

  if (typeof adapt === 'function') registerFeatAdapter(name, adapt);
  if (Array.isArray(actions)) registerFeatSheetActions(name, actions);
  if (Array.isArray(resources)) registerFeatSheetResources(name, resources);
  if (Array.isArray(effects)) registerFeatSheetEffects(name, effects);
}
