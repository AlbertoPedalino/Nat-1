import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    _GAMING_SETS,
    _VEHICLE_TOOLS,
    _STD_LANGS,
    _EXOTIC_LANGS,
    _ALL_LANGS,
    _ALL_TOOLS,
    allItemsDb,
    registerClassAdapter,
    getClassAdapter,
    registerSubclassAdapter,
    getSubclassAdapter,
    registerSpeciesAdapter,
    getSpeciesAdapter,
    registerFeatAdapter,
    getFeatAdapter,
    registerClassSheetActions,
    getClassSheetActions,
    registerSubclassSheetActions,
    getSubclassSheetActions,
    registerSpeciesSheetActions,
    getSpeciesSheetActions,
    registerFeatSheetActions,
    getFeatSheetActions,
    registerClassSheetResources,
    getClassSheetResources,
    registerSubclassSheetResources,
    getSubclassSheetResources,
    registerSpeciesSheetResources,
    getSpeciesSheetResources,
    registerFeatSheetResources,
    getFeatSheetResources,
    registerClassSheetEffects,
    getClassSheetEffects,
    registerSubclassSheetEffects,
    getSubclassSheetEffects,
    registerSpeciesSheetEffects,
    getSpeciesSheetEffects,
    registerFeatSheetEffects,
    getFeatSheetEffects,
    registerClassRuntimeConfig,
    getClassRuntimeConfig,
    registerSubclassRuntimeConfig,
    getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig,
    getSpeciesRuntimeConfig,
    registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta,
    getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta,
    getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta,
    registerSubclassSheetCommonChoiceMeta,
    registerSpeciesSheetCommonChoiceMeta,
    registerItemFlagDef,
    getItemFlagDef,
    getAllItemFlagDefs,
    registerWeaponAbilityOverride,
    getWeaponAbilityOverrides,
    registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter,
    getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter,
    getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies,
    getClassSheetProficiencies,
    registerSubclassSheetProficiencies,
    getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies,
    getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers,
    getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers,
    getSpeciesSheetSpellModifiers,
    registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus,
    getSpeciesSheetHpBonus,
    registerClassAtWillSpells,
    getClassAtWillSpells,
    registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants,
    registerResourceSideEffect,
    getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider,
    registerGlobalClassAdapter,
    getGlobalClassAdapters,
    registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter,
    getGlobalFeatAdapters,
    registerGlobalSpellAdapter,
    getGlobalSpellAdapters,
    registerGlobalItemAdapter,
    getGlobalItemAdapters,
    registerCantripData,
    getCantripData,
    registerCantripDataModifier,
    getCantripDataModifiers,
    registerSpellData,
    getSpellData,
    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Aasimar_XPHB", function (s) {
  let specs = getGenericSpeciesChoiceSpecs(s);
  // Aasimar XPHB has fixed Celestial Resistance; avoid showing it as a build choice.
  // Also remove a generic size spec, if parsed from the raw JSON, so we do not show it twice.
  specs = specs.filter(function (x) {
    return !String(x.key || '').startsWith('species_resist') && x.key !== 'species_size';
  });

  specs.push({ key: 'species_size', label: 'Choose Size', type: 'generic_choice', from: ['Medium', 'Small'], count: 1, level: 1 });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Aasimar_XPHB", {
  labels: {
    species_size: 'Size',
  },
});
registerSpeciesSheetActions("Aasimar_XPHB", [
  {
    name: 'Healing Hands',
    icon: 'cross',
    cat: 'action',
    uses: '1 / LR',
    resKey: 'aasimar_healing_hands',
    healFormula: ({ character }) => {
      const lv = Number(character?.level || 1);
      const pb = Math.floor((lv - 1) / 4) + 2;
      return `${pb}d4`;
    },
    minLevel: 1,
    desc: "As a {@b Magic} action, you touch a creature and roll a number of d4s equal to your Proficiency Bonus. The creature regains a number of Hit Points equal to the roll's total. Once you use this trait, you can't do so again until you finish a Long Rest.",
  },
  {
    name: 'Celestial Revelation',
    icon: '',
    cat: 'bonus',
    uses: '1 / LR',
    resKey: 'aasimar_revelation',
    minLevel: 3,
    detailType: 'panel',
    detail: ({ character }) => {
      const lv = Number(character?.level || 1);
      const pb = Math.floor((lv - 1) / 4) + 2;
      const chaScore = character?.finalScores?.cha ?? 10;
      const chaMod = Math.floor((chaScore - 10) / 2);
      const saveDc = 8 + pb + chaMod;
      return {
        sections: [
          {
            title: 'Heavenly Wings',
            accent: '#70b7e6',
            body: `<b>Movement.</b> Gain a Fly Speed equal to your Speed for 1 minute.<br><b>Extra Damage.</b> Once on each of your turns, when you damage a target with an attack or spell, deal +${pb} Radiant damage to one target.`,
          },
          {
            title: 'Inner Radiance',
            accent: '#edd48a',
            body: `<b>Light.</b> Shed Bright Light in a 10-foot radius and Dim Light for an additional 10 feet for 1 minute.<br><b>Area Damage.</b> At the end of each of your turns, each creature within 10 feet of you takes ${pb} Radiant damage.<br><b>Extra Damage.</b> Once on each of your turns, when you damage a target with an attack or spell, deal +${pb} Radiant damage to one target.`,
          },
          {
            title: 'Necrotic Shroud',
            accent: '#b58fd9',
            body: `<b>Save DC.</b> Nearby creatures make a Charisma save, DC ${saveDc}. On a failed save, a creature has the Frightened condition until the end of your next turn.<br><b>Extra Damage.</b> Once on each of your turns, when you damage a target with an attack or spell, deal +${pb} Necrotic damage to one target.`,
          },
        ],
      };
    },
    desc: 'Bonus Action at character level 3: transform for 1 minute, ending early with no action. Choose the option each time you transform: Heavenly Wings grants Fly Speed equal to Speed; Inner Radiance sheds light and damages nearby creatures at the end of your turns; Necrotic Shroud can Frighten nearby enemies. Once on each of your turns during the transformation, deal extra damage equal to PB to one target you damage with an attack or spell. Damage is Necrotic for Necrotic Shroud, Radiant for Heavenly Wings or Inner Radiance. Recharge: Long Rest.',
  },
]);
registerSpeciesSheetResources("Aasimar_XPHB", [
  {
    key: 'aasimar_healing_hands',
    name: 'Healing Hands',
    icon: 'cross',
    recharge: 'LR',
    max: 1,
  },
  {
    key: 'aasimar_revelation',
    name: 'Celestial Revelation',
    icon: 'sparkles',
    recharge: 'LR',
    max: 1,
  },
]);

registerSpeciesRuntimeConfig("Aasimar_XPHB", {
  spellcasting: {
    ability: 'cha',
    alwaysKnownSpells: [
      { name: 'Light', level: 0, source: 'Light Bearer', sourceType: 'species', ability: 'cha' },
    ],
  },
});

}
