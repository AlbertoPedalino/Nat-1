import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    getGenericSpeciesChoiceSpecs,
    registerSpeciesAdapter,
    registerSpeciesSheetCommonChoiceMeta,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesRuntimeConfig,
  } = createAdapterBindings(registry, context);

  registerSpeciesAdapter('Hexblood_RHW', function (s) {
    const specs = getGenericSpeciesChoiceSpecs(s);
    // Hex Magic lets you pick the spellcasting ability for Disguise Self / Hex.
    specs.push({ key: 'species_spell_ability', label: 'Spellcasting Ability (Hexblood)', type: 'ability_choice', from: ['int', 'wis', 'cha'], count: 1, level: 1 });
    return specs;
  });

  registerSpeciesSheetCommonChoiceMeta('Hexblood_RHW', {
    labels: {
      species_spell_ability: 'Spellcasting Ability (Hexblood)',
    },
  });

  registerSpeciesSheetActions('Hexblood_RHW', [
    {
      name: 'Eerie Token',
      icon: 'eye',
      cat: 'bonus',
      uses: '1 / LR',
      resKey: 'hexblood_token',
      minLevel: 1,
      desc: 'Bonus Action: create a magical token from a lock of hair, a nail, or similar. Distant Message — as a Magic action, send a telepathic message of 25 words or fewer to a creature holding the token while within 10 miles. Remote Viewing — within 10 miles, take a Magic action to see and hear from the token for 1 minute (ends if Incapacitated or you end it), destroying the token afterward. The token otherwise lasts until you finish a Long Rest. Once you create a token, you can\'t do so again until you finish a Long Rest.',
    },
  ]);

  registerSpeciesSheetResources('Hexblood_RHW', [
    {
      key: 'hexblood_token',
      name: 'Eerie Token',
      icon: 'eye',
      recharge: 'LR',
      max: 1,
    },
  ]);

  // Hex Magic: Disguise Self and Hex always prepared, each castable once per Long
  // Rest without a slot (or with slots you have). Ability comes from species_spell_ability.
  registerSpeciesRuntimeConfig('Hexblood_RHW', {
    spellcasting: {
      alwaysKnownSpells: [
        { name: 'Disguise Self', level: 1, minLevel: 1, source: 'Hex Magic', sourceType: 'species', freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
        { name: 'Hex', level: 1, minLevel: 1, source: 'Hex Magic', sourceType: 'species', freeCast: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true } },
      ],
    },
  });
}
