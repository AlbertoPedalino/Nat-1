import {
  Backpack,
  ClipboardList,
  Dumbbell,
  Feather,
  GraduationCap,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  Wand2,
} from 'lucide-react';

export const PB_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const STEPS = [
  { id: 'class', label: 'Class', icon: Sword },
  { id: 'species', label: 'Species', icon: Sparkles },
  { id: 'background', label: 'Background', icon: Feather },
  { id: 'scores', label: 'Ability Scores', icon: Dumbbell },
  { id: 'equipment', label: 'Equipment', icon: Backpack },
  { id: 'sheet', label: 'Sheet', icon: ClipboardList },
];

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
  { name: 'Acolyte', source: 'XPHB', abilities: ['int', 'wis', 'cha'], feat: 'Magic Initiate; Cleric|XPHB' },
  { name: 'Artisan', source: 'XPHB', abilities: ['str', 'dex', 'int'], feat: 'Crafter' },
  { name: 'Charlatan', source: 'XPHB', abilities: ['dex', 'con', 'cha'], feat: 'Skilled' },
  { name: 'Criminal', source: 'XPHB', abilities: ['dex', 'con', 'int'], feat: 'Alert' },
  { name: 'Guide', source: 'XPHB', abilities: ['dex', 'con', 'wis'], feat: 'Magic Initiate; Druid|XPHB' },
  { name: 'Sage', source: 'XPHB', abilities: ['con', 'int', 'wis'], feat: 'Magic Initiate; Wizard|XPHB' },
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

