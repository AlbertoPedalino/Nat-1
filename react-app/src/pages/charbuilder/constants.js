import {
  Backpack,
  ClipboardList,
  Coins,
  Dumbbell,
  Feather,
  GraduationCap,
  Layers,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  Wand2,
} from 'lucide-react';

export const DATA_BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/';
export const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
export const PROFICIENCY_BONUS = [null, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];
export const PB_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const SPELL_LEVEL_LABELS = ['Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
export const XP_TOTAL = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export const STEPS = [
  { id: 'class', label: 'Class', icon: Sword },
  { id: 'species', label: 'Species', icon: Sparkles },
  { id: 'background', label: 'Background', icon: Feather },
  { id: 'scores', label: 'Ability Scores', icon: Dumbbell },
  { id: 'equipment', label: 'Equipment', icon: Backpack },
  { id: 'sheet', label: 'Sheet', icon: ClipboardList },
];

export const CLASS_FILES = [
  'class-barbarian.json',
  'class-bard.json',
  'class-cleric.json',
  'class-druid.json',
  'class-fighter.json',
  'class-monk.json',
  'class-paladin.json',
  'class-ranger.json',
  'class-rogue.json',
  'class-sorcerer.json',
  'class-warlock.json',
  'class-wizard.json',
  'class-artificer.json',
];

export const SPELL_FILES = ['spells-xphb.json', 'spells-fraif.json', 'spells-frhof.json', 'spells-efa.json'];

export const FULL_SLOTS = {
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2], 6: [4, 3, 3], 7: [4, 3, 3, 1],
  8: [4, 3, 3, 2], 9: [4, 3, 3, 3, 1], 10: [4, 3, 3, 3, 2], 11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1], 13: [4, 3, 3, 3, 2, 1, 1], 14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1], 16: [4, 3, 3, 3, 2, 1, 1, 1], 17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1], 19: [4, 3, 3, 3, 3, 2, 1, 1, 1], 20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

export const HALF_SLOTS = {
  1: [2], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2], 7: [4, 3], 8: [4, 3], 9: [4, 3, 2],
  10: [4, 3, 2], 11: [4, 3, 3], 12: [4, 3, 3], 13: [4, 3, 3, 1], 14: [4, 3, 3, 1], 15: [4, 3, 3, 2],
  16: [4, 3, 3, 2], 17: [4, 3, 3, 3, 1], 18: [4, 3, 3, 3, 1], 19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2],
};

export const THIRD_SLOTS = {
  1: [], 2: [], 3: [2], 4: [3], 5: [3], 6: [3], 7: [4, 2], 8: [4, 2], 9: [4, 2], 10: [4, 3],
  11: [4, 3], 12: [4, 3], 13: [4, 3, 2], 14: [4, 3, 2], 15: [4, 3, 2], 16: [4, 3, 3],
  17: [4, 3, 3], 18: [4, 3, 3], 19: [4, 3, 3, 1], 20: [4, 3, 3, 1],
};

export const PACT_SLOTS = {
  1: { slots: 1, level: 1 }, 2: { slots: 2, level: 1 }, 3: { slots: 2, level: 2 }, 4: { slots: 2, level: 2 },
  5: { slots: 2, level: 3 }, 6: { slots: 2, level: 3 }, 7: { slots: 2, level: 4 }, 8: { slots: 2, level: 4 },
  9: { slots: 2, level: 5 }, 10: { slots: 2, level: 5 }, 11: { slots: 3, level: 5 }, 12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 }, 14: { slots: 3, level: 5 }, 15: { slots: 3, level: 5 }, 16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 }, 18: { slots: 4, level: 5 }, 19: { slots: 4, level: 5 }, 20: { slots: 4, level: 5 },
};

export const CLASS_SUMMARIES = [
  { name: 'Barbarian', source: 'XPHB', hitDie: 'd12', primary: 'STR', icon: Sword },
  { name: 'Bard', source: 'XPHB', hitDie: 'd8', primary: 'CHA', icon: Wand2 },
  { name: 'Cleric', source: 'XPHB', hitDie: 'd8', primary: 'WIS', icon: Shield },
  { name: 'Druid', source: 'XPHB', hitDie: 'd8', primary: 'WIS', icon: Feather },
  { name: 'Fighter', source: 'XPHB', hitDie: 'd10', primary: 'STR/DEX', icon: Sword },
  { name: 'Monk', source: 'XPHB', hitDie: 'd8', primary: 'DEX/WIS', icon: Dumbbell },
  { name: 'Paladin', source: 'XPHB', hitDie: 'd10', primary: 'STR/CHA', icon: Shield },
  { name: 'Ranger', source: 'XPHB', hitDie: 'd10', primary: 'DEX/WIS', icon: ScrollText },
  { name: 'Rogue', source: 'XPHB', hitDie: 'd8', primary: 'DEX', icon: GraduationCap },
  { name: 'Sorcerer', source: 'XPHB', hitDie: 'd6', primary: 'CHA', icon: Sparkles },
  { name: 'Warlock', source: 'XPHB', hitDie: 'd8', primary: 'CHA', icon: Wand2 },
  { name: 'Wizard', source: 'XPHB', hitDie: 'd6', primary: 'INT', icon: Wand2 },
  { name: 'Artificer', source: 'EFA', hitDie: 'd8', primary: 'INT', icon: ScrollText },
];

export const SPECIES_SUMMARIES = [
  { name: 'Aasimar', source: 'XPHB', traits: ['Celestial Resistance', 'Healing Hands'] },
  { name: 'Dragonborn', source: 'XPHB', traits: ['Breath Weapon', 'Draconic Resistance'] },
  { name: 'Dwarf', source: 'XPHB', traits: ['Darkvision', 'Dwarven Toughness'] },
  { name: 'Elf', source: 'XPHB', traits: ['Darkvision', 'Fey Ancestry'] },
  { name: 'Gnome', source: 'XPHB', traits: ['Gnomish Cunning', 'Darkvision'] },
  { name: 'Goliath', source: 'XPHB', traits: ['Giant Ancestry', 'Powerful Build'] },
  { name: 'Halfling', source: 'XPHB', traits: ['Brave', 'Halfling Nimbleness'] },
  { name: 'Human', source: 'XPHB', traits: ['Resourceful', 'Skillful'] },
  { name: 'Orc', source: 'XPHB', traits: ['Adrenaline Rush', 'Relentless Endurance'] },
  { name: 'Tiefling', source: 'XPHB', traits: ['Darkvision', 'Fiendish Legacy'] },
];

export const BACKGROUND_SUMMARIES = [
  { name: 'Acolyte', source: 'XPHB', abilities: ['int', 'wis', 'cha'], feat: 'Magic Initiate' },
  { name: 'Artisan', source: 'XPHB', abilities: ['str', 'dex', 'int'], feat: 'Crafter' },
  { name: 'Charlatan', source: 'XPHB', abilities: ['dex', 'con', 'cha'], feat: 'Skilled' },
  { name: 'Criminal', source: 'XPHB', abilities: ['dex', 'con', 'int'], feat: 'Alert' },
  { name: 'Guide', source: 'XPHB', abilities: ['dex', 'con', 'wis'], feat: 'Magic Initiate' },
  { name: 'Sage', source: 'XPHB', abilities: ['con', 'int', 'wis'], feat: 'Magic Initiate' },
  { name: 'Soldier', source: 'XPHB', abilities: ['str', 'dex', 'con'], feat: 'Savage Attacker' },
];

export const FEAT_SUMMARIES = [
  { name: 'Alert', category: 'Origin' },
  { name: 'Crafter', category: 'Origin' },
  { name: 'Magic Initiate', category: 'Origin' },
  { name: 'Savage Attacker', category: 'Origin' },
  { name: 'Skilled', category: 'Origin' },
  { name: 'Tough', category: 'Origin' },
  { name: 'War Caster', category: 'General' },
  { name: 'Great Weapon Master', category: 'General' },
  { name: 'Sharpshooter', category: 'General' },
  { name: 'Resilient', category: 'General' },
];

export const CURRENCY = [
  { key: 'cp', label: 'Copper', tone: '#b87333' },
  { key: 'sp', label: 'Silver', tone: '#b8b8b8' },
  { key: 'ep', label: 'Electrum', tone: '#9f9f9f' },
  { key: 'gp', label: 'Gold', tone: '#d7ad52' },
  { key: 'pp', label: 'Platinum', tone: '#dde1ff' },
];

export const ITEM_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'weapon', label: 'Weapons' },
  { key: 'armor', label: 'Armor' },
  { key: 'gear', label: 'Gear' },
  { key: 'magic', label: 'Magic' },
];

export const ITEM_SUMMARIES = [
  { name: 'Longsword', type: 'weapon', source: 'XPHB', weight: 3, value: 1500 },
  { name: 'Shield', type: 'armor', source: 'XPHB', weight: 6, value: 1000 },
  { name: 'Explorer Pack', type: 'gear', source: 'XPHB', weight: 59, value: 1000 },
  { name: 'Potion of Healing', type: 'magic', source: 'XDMG', weight: 0.5, value: 5000 },
];
