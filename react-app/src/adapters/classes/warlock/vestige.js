import { createAdapterBindings } from '../../adapterBindings.js';

const DOMAIN_SPELLS = {
  'Life Domain': [
    ['Bless', 3, 1], ['Cure Wounds', 3, 1], ['Aid', 3, 2], ['Lesser Restoration', 3, 2],
    ['Mass Healing Word', 5, 3], ['Revivify', 5, 3], ['Aura of Life', 7, 4], ['Death Ward', 7, 4],
    ['Greater Restoration', 9, 5], ['Mass Cure Wounds', 9, 5],
  ],
  'Light Domain': [
    ['Burning Hands', 3, 1], ['Faerie Fire', 3, 1], ['Scorching Ray', 3, 2], ['See Invisibility', 3, 2],
    ['Daylight', 5, 3], ['Fireball', 5, 3], ['Arcane Eye', 7, 4], ['Wall of Fire', 7, 4],
    ['Flame Strike', 9, 5], ['Scrying', 9, 5],
  ],
  'Trickery Domain': [
    ['Charm Person', 3, 1], ['Disguise Self', 3, 1], ['Invisibility', 3, 2], ['Pass without Trace', 3, 2],
    ['Hypnotic Pattern', 5, 3], ['Nondetection', 5, 3], ['Confusion', 7, 4], ['Dimension Door', 7, 4],
    ['Dominate Person', 9, 5], ['Modify Memory', 9, 5],
  ],
  'War Domain': [
    ['Guiding Bolt', 3, 1], ['Shield of Faith', 3, 1], ['Magic Weapon', 3, 2], ['Spiritual Weapon', 3, 2],
    ["Crusader's Mantle", 5, 3], ['Spirit Guardians', 5, 3], ['Fire Shield', 7, 4], ['Freedom of Movement', 7, 4],
    ['Hold Monster', 9, 5], ['Steel Wind Strike', 9, 5],
  ],
};

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Warlock_Vestige', function (cls, level, specs) {
    if (level < 3) return;
    specs.push({
      key: 'subclass_vestige_domain', label: 'Vestige Spells - Divine Domain', type: 'generic_choice',
      from: Object.keys(DOMAIN_SPELLS), count: 1, level: 3,
    });
    specs.push({
      key: 'subclass_vestige_companion_type', label: 'Vestige Companion Type', type: 'generic_choice',
      from: ['Celestial', 'Fiend', 'Undead'], count: 1, level: 3,
    });
  });

  const alwaysPreparedSpells = Object.entries(DOMAIN_SPELLS).flatMap(([domain, spells]) => (
    spells.map(([name, minLevel, level]) => ({
      name, minLevel, level, source: `Vestige - ${domain}`, sourceType: 'subclass',
      requiredChoice: { key: 'subclass_vestige_domain', value: domain },
    }))
  ));
  registerSubclassRuntimeConfig('Warlock_Vestige', {
    spellcasting: {
      alwaysPreparedSpells,
      // The live feature contains all four domain tables. The generic prose
      // scraper cannot know which table was selected, so use the gated records above.
      disableFeatureSpellScrape: true,
    },
  });

  registerSubclassSheetActions('Warlock_Vestige', [
    { name: 'Command Vestige Companion', icon: 'ghost', cat: 'bonus', uses: 'At will', minLevel: 3,
      detailType: 'summonedCreature',
      summonedCreature: {
        name: 'Vestige Companion', source: 'AU', levelClass: 'Warlock', ability: 'cha',
        variantChoiceKey: 'subclass_vestige_companion_type',
        divinePowerResourceKey: 'vestige_power',
      },
      desc: "Command the companion to take an action from its stat block or another action. You can instead replace one of your Attack-action attacks to command its Vestige's Strike." },
    { name: 'Vestige Recovery', icon: 'heart-pulse', cat: 'reaction', uses: '1 / LR', resKey: 'vestige_recovery', minLevel: 10,
      desc: 'When the companion would fall to 0 HP, expend a Pact Magic slot as a Reaction: it falls to 1 HP, teleports within 5 feet of you, and regains HP up to its maximum.' },
    { name: 'Semblance of Life', icon: 'sparkles', cat: 'bonus', uses: '1 / LR', resKey: 'vestige_semblance', minLevel: 14,
      desc: 'Transform the companion for 1 hour into the spirit form matching its Celestial, Fiend, or Undead type. It follows the summoning spell rules described by the feature.' },
  ]);
  registerSubclassSheetResources('Warlock_Vestige', [
    { key: 'vestige_power', name: 'Divine Power', icon: 'sparkles', recharge: 'SR+LR', minLevel: 6, max: 1 },
    { key: 'vestige_recovery', name: 'Vestige Recovery', icon: 'heart-pulse', recharge: 'LR', minLevel: 10, max: 1 },
    { key: 'vestige_semblance', name: 'Semblance of Life', icon: 'ghost', recharge: 'LR', minLevel: 14, max: 1 },
  ]);
  registerSubclassSheetEffects('Warlock_Vestige', [
    { type: 'reminder', minLevel: 6, note: "Vestige Power: within 30 ft of your companion, you gain all damage Resistances in its stat block." },
  ]);
}
