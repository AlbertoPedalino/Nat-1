import { GAME_ICONS } from '../../shared/ui/gameIcons.js';

export const PB_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// The builder's steps, each drawn as its panels are (GAME_ICONS), so a
// step's tab and the panels under it carry the same picture.
export const STEPS = [
  { id: 'class', label: 'Class', icon: GAME_ICONS.classes },
  { id: 'species', label: 'Species', icon: GAME_ICONS.species },
  { id: 'background', label: 'Background', icon: GAME_ICONS.background },
  { id: 'scores', label: 'Ability Scores', icon: GAME_ICONS.abilityScores },
  { id: 'equipment', label: 'Equipment', icon: GAME_ICONS.equipment },
  { id: 'sheet', label: 'Sheet', icon: GAME_ICONS.sheet },
];

// Stand-ins listed until the real class, species, background and feat data
// arrives: enough to list and select by.
export const CLASS_SUMMARIES = [
  { name: 'Barbarian', source: 'XPHB' },
  { name: 'Bard', source: 'XPHB' },
  { name: 'Cleric', source: 'XPHB' },
  { name: 'Druid', source: 'XPHB' },
  { name: 'Fighter', source: 'XPHB' },
  { name: 'Monk', source: 'XPHB' },
  { name: 'Paladin', source: 'XPHB' },
  { name: 'Ranger', source: 'XPHB' },
  { name: 'Rogue', source: 'XPHB' },
  { name: 'Sorcerer', source: 'XPHB' },
  { name: 'Warlock', source: 'XPHB' },
  { name: 'Wizard', source: 'XPHB' },
  { name: 'Artificer', source: 'EFA' },
];

export const SPECIES_SUMMARIES = [
  { name: 'Aasimar', source: 'XPHB' },
  { name: 'Dragonborn', source: 'XPHB' },
  { name: 'Dwarf', source: 'XPHB' },
  { name: 'Elf', source: 'XPHB' },
  { name: 'Gnome', source: 'XPHB' },
  { name: 'Goliath', source: 'XPHB' },
  { name: 'Halfling', source: 'XPHB' },
  { name: 'Human', source: 'XPHB' },
  { name: 'Orc', source: 'XPHB' },
  { name: 'Tiefling', source: 'XPHB' },
];

export const BACKGROUND_SUMMARIES = [
  { name: 'Acolyte', source: 'XPHB' },
  { name: 'Artisan', source: 'XPHB' },
  { name: 'Charlatan', source: 'XPHB' },
  { name: 'Criminal', source: 'XPHB' },
  { name: 'Guide', source: 'XPHB' },
  { name: 'Sage', source: 'XPHB' },
  { name: 'Soldier', source: 'XPHB' },
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

