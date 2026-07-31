import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  // Grave Domain Spells come from the subclass additionalSpells data. Path to the
  // Grave and Enhanced Necromancy spend Channel Divinity (a class resource).
  registerSubclassAdapter('Cleric_Grave', function () {});

  registerSubclassSheetActions('Cleric_Grave', [
    {
      name: 'Path to the Grave',
      icon: 'skull',
      cat: 'bonus',
      uses: '1 Channel',
      resKey: 'channel_div',
      minLevel: 3,
      desc: 'Bonus Action: present your Holy Symbol and expend a use of Channel Divinity to curse one creature within 30 ft until the start of your next turn (Disadvantage on attack rolls and saving throws). When you or an ally hits the cursed target, you can end the curse early (no action) to make the attack deal extra Necrotic or Radiant damage equal to your Cleric level.',
    },
    {
      name: 'Return to Life',
      icon: 'cross',
      cat: 'special',
      uses: 'Passive',
      passive: true,
      minLevel: 3,
      desc: 'You can cast Spare the Dying as a Bonus Action. When you would roll dice to restore Hit Points to a creature at 0 HP with a spell or Channel Divinity, use the highest possible number for each die instead of rolling.',
    },
    {
      name: "Sentinel at Death's Door",
      icon: 'shield',
      cat: 'reaction',
      uses: 'WIS mod / LR',
      resKey: 'grave_sentinel',
      minLevel: 6,
      desc: 'When you or a Bloodied creature you can see within 60 ft is hit by an attack roll, take a Reaction to halve that attack\'s damage (round down). If the attack was a Critical Hit, its critical effects are canceled. Uses equal to your Wisdom modifier (minimum 1), regained on a Long Rest.',
    },
    {
      name: 'Enhanced Necromancy',
      icon: 'skull',
      cat: 'special',
      uses: 'Channel Divinity',
      passive: true,
      minLevel: 17,
      desc: 'When you cast a Necromancy spell of level 5 or lower that targets one creature, or a spell from the Grave Domain Spells table, you can expend a use of Channel Divinity to target a second creature within range.',
    },
    {
      name: 'Keeper of Souls',
      icon: 'heart',
      cat: 'special',
      uses: '1 / SR-LR',
      resKey: 'grave_keeper',
      minLevel: 17,
      desc: 'When an enemy dies within 60 ft of you, you or a creature you can see within 60 ft regains Hit Points equal to twice your Cleric level (can\'t use while Incapacitated). Once per Short or Long Rest, or expend a level 6+ spell slot (no action) to restore the use.',
    },
  ]);

  registerSubclassSheetResources('Cleric_Grave', [
    {
      key: 'grave_sentinel',
      name: "Sentinel at Death's Door",
      icon: 'shield',
      recharge: 'LR',
      minLevel: 6,
      max: (lv, mods) => Math.max(1, mods?.wis ?? 1),
    },
    {
      key: 'grave_keeper',
      name: 'Keeper of Souls',
      icon: 'heart',
      recharge: 'SR+LR',
      minLevel: 17,
      max: 1,
    },
  ]);

  registerSubclassSheetEffects('Cleric_Grave', [
    {
      type: 'reminder',
      minLevel: 3,
      note: 'Pull of Death: once per turn, when you deal damage to a creature missing any Hit Points (by a spell or an attack roll), it takes an extra 1d4 Necrotic damage (1d6 at Cleric level 11).',
    },
  ]);
}
