import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    getGenericSpeciesChoiceSpecs,
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
  } = createAdapterBindings(registry, context);

  // Werewolf Instincts (skill choice from Perception/Stealth/Survival) is parsed
  // from the species JSON skillProficiencies; only Howl needs limited-use wiring.
  registerSpeciesAdapter('Lupin_RHW', function (s) {
    return getGenericSpeciesChoiceSpecs(s);
  });

  registerSpeciesSheetActions('Lupin_RHW', [
    {
      name: 'Howl',
      icon: 'wolf',
      cat: 'bonus',
      uses: 'PB / LR',
      resKey: 'lupin_howl',
      minLevel: 1,
      detailType: 'saveDc',
      saveDc: ({ character }) => {
        const lv = Number(character?.level || 1);
        const pb = Math.floor((lv - 1) / 4) + 2;
        const conScore = character?.finalScores?.con ?? 10;
        const conMod = Math.floor((conScore - 10) / 2);
        return { ability: 'WIS', dc: 8 + pb + conMod };
      },
      desc: 'Bonus Action: let out an unearthly howl. Each creature of your choice within 15 feet must succeed on a Wisdom saving throw (DC 8 + your Constitution modifier + Proficiency Bonus) or have Disadvantage on attack rolls and saving throws until the start of your next turn. Uses equal to your Proficiency Bonus, regained on a Long Rest.',
    },
  ]);

  registerSpeciesSheetResources('Lupin_RHW', [
    {
      key: 'lupin_howl',
      name: 'Howl',
      icon: 'wolf',
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);

  registerSpeciesSheetEffects('Lupin_RHW', [
    {
      type: 'reminder',
      minLevel: 1,
      note: 'Feral Pounce: your Unarmed Strikes deal Slashing damage. When you hit with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and Shove options (once per turn).',
    },
  ]);
}
