import { createAdapterBindings } from './adapterBindings.js';

const SPELL_ABILITIES = [
  { value: 'int', label: 'Intelligence' },
  { value: 'wis', label: 'Wisdom' },
  { value: 'cha', label: 'Charisma' },
];

export function withSpellAbilityChoice(feat) {
  return {
    ...feat,
    choiceUi: {
      ...(feat.choiceUi || {}),
      spellAbility: {
        keySuffix: 'spell_ability',
        label: 'Spellcasting Ability',
        options: SPELL_ABILITIES,
      },
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
