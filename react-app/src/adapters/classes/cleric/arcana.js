import { createAdapterBindings } from '../../adapterBindings.js';

const DOMAIN_SPELLS = [
  ['Detect Magic', 3, 1], ['Magic Missile', 3, 1], ['Magic Weapon', 3, 2], ["Nystul's Magic Aura", 3, 2],
  ['Counterspell', 5, 3], ['Dispel Magic', 5, 3], ['Arcane Eye', 7, 4], ["Leomund's Secret Chest", 7, 4],
  ["Bigby's Hand", 9, 5], ['Teleportation Circle', 9, 5],
];

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Cleric_Arcana', function (cls, level, specs) {
    if (level >= 3) {
      specs.push({
        key: 'subclass_arcana_skill', label: 'Student of Arcana - Skill', type: 'skill_choice',
        from: ['Arcana', 'History', 'Insight', 'Medicine', 'Persuasion', 'Religion'], count: 1, level: 3,
      });
      [1, 2].forEach((slot) => specs.push({
        key: `subclass_arcana_cantrip_${slot}`,
        label: `Student of Arcana - Wizard Cantrip ${slot}`,
        type: 'spell_choice', spellFilter: { spellLevel: 0, classes: ['Wizard'] }, count: 1, level: 3,
      }));
    }
    [6, 7, 8, 9].forEach((spellLevel) => {
      if (level < 17) return;
      specs.push({
        key: `subclass_arcana_mastery_${spellLevel}`,
        label: `Magical Mastery - Wizard Spell Lv.${spellLevel}`,
        type: 'spell_choice', spellFilter: { spellLevel, classes: ['Wizard'] }, count: 1, level: 17,
      });
    });
  });

  registerSubclassRuntimeConfig('Cleric_Arcana', {
    spellcasting: {
      choiceSpellSources: {
        subclass_arcana_cantrip_1: { label: 'Student of Arcana', ability: 'wis' },
        subclass_arcana_cantrip_2: { label: 'Student of Arcana', ability: 'wis' },
        subclass_arcana_mastery_6: { label: 'Magical Mastery', ability: 'wis' },
        subclass_arcana_mastery_7: { label: 'Magical Mastery', ability: 'wis' },
        subclass_arcana_mastery_8: { label: 'Magical Mastery', ability: 'wis' },
        subclass_arcana_mastery_9: { label: 'Magical Mastery', ability: 'wis' },
      },
      alwaysPreparedSpells: DOMAIN_SPELLS.map(([name, minLevel, level]) => ({
        name, minLevel, level, source: 'Arcana Domain', sourceType: 'subclass',
      })),
    },
  });

  registerSubclassSheetActions('Cleric_Arcana', [
    { name: 'Fortifying Spell', icon: 'shield-plus', cat: 'special', uses: '1 Channel Divinity', resKey: 'channel_div', minLevel: 3,
      rollers: [{ kind: 'utility', formula: ({ ownerLevel }) => `1d8+${Number(ownerLevel || 0)}`, label: 'Temporary HP' }],
      desc: 'When you cast a spell, expend Channel Divinity with no action. One target gains 1d8 + your Cleric level Temporary Hit Points.' },
    { name: 'Tenacious Spell', icon: 'sparkles', cat: 'special', uses: '1 Channel Divinity', resKey: 'channel_div', minLevel: 3,
      rollers: [{ kind: 'utility', formula: '1d8', label: 'Save reduction' }],
      desc: "When a creature you can see succeeds on a save against your spell, expend Channel Divinity and subtract 1d8 from that creature's first save against the spell." },
    { name: 'Dispelling Recovery', icon: 'wand-sparkles', cat: 'special', uses: '1 / SR or LR', resKey: 'arcana_dispelling_recovery', minLevel: 6,
      desc: 'After a slotted spell restores Hit Points or ends a condition, cast Dispel Magic as part of the same action without a slot. Restore the use on a Short or Long Rest, or by expending Channel Divinity.' },
  ]);
  registerSubclassSheetResources('Cleric_Arcana', [
    { key: 'arcana_dispelling_recovery', name: 'Dispelling Recovery', icon: 'wand-sparkles', recharge: 'SR+LR', minLevel: 6, max: 1 },
  ]);
  registerSubclassSheetEffects('Cleric_Arcana', [
    { type: 'reminder', minLevel: 17, note: 'Magical Mastery: the four selected Wizard spells (levels 6-9) are always prepared as Cleric spells.' },
  ]);
}
