// The rules vocabulary of D&D 2024, written once: abilities, skills, tools,
// languages. Every page and adapter reads these lists from here.

export const ABILITIES = Object.freeze(['str', 'dex', 'con', 'int', 'wis', 'cha']);

export const ABILITY_ABBREVIATIONS = Object.freeze({
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
});

export const ABILITY_NAMES = Object.freeze({
  str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
});

const ABILITY_BY_WORD = Object.freeze(Object.fromEntries(
  ABILITIES.flatMap((key) => [[key, key], [ABILITY_NAMES[key].toLowerCase(), key]]),
));

// 'str', 'STR', 'Strength' -> 'str'; anything else -> null.
export function abilityKey(value) {
  return ABILITY_BY_WORD[String(value ?? '').trim().toLowerCase()] || null;
}

export const SKILLS = [
  { name: 'Acrobatics', ability: 'dex' },
  { name: 'Animal Handling', ability: 'wis' },
  { name: 'Arcana', ability: 'int' },
  { name: 'Athletics', ability: 'str' },
  { name: 'Deception', ability: 'cha' },
  { name: 'History', ability: 'int' },
  { name: 'Insight', ability: 'wis' },
  { name: 'Intimidation', ability: 'cha' },
  { name: 'Investigation', ability: 'int' },
  { name: 'Medicine', ability: 'wis' },
  { name: 'Nature', ability: 'int' },
  { name: 'Perception', ability: 'wis' },
  { name: 'Performance', ability: 'cha' },
  { name: 'Persuasion', ability: 'cha' },
  { name: 'Religion', ability: 'int' },
  { name: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth', ability: 'dex' },
  { name: 'Survival', ability: 'wis' },
];

export const SKILL_NAMES = Object.freeze(SKILLS.map((skill) => skill.name));

export const ARTISAN_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
];

export const MUSICAL_INSTRUMENTS = [
  'Bagpipes',
  'Drum',
  'Dulcimer',
  'Flute',
  'Hand Drum',
  'Horn',
  'Lute',
  'Lyre',
  'Pan Flute',
  'Shawm',
  'Viol',
];

export const GAMING_SETS = [
  'Dice Set',
  'Dragonchess Set',
  'Playing Card Set',
  'Three-Dragon Ante Set',
];

export const VEHICLE_TOOLS = ['Vehicles (Land)', 'Vehicles (Water)'];

export const STANDARD_LANGUAGES = [
  'Common',
  'Common Sign Language',
  'Draconic',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Orc',
];

export const EXOTIC_LANGUAGES = [
  'Abyssal',
  'Celestial',
  'Deep Speech',
  'Infernal',
  'Primordial',
  'Sylvan',
  'Undercommon',
];

export const ALL_LANGUAGES = [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES];
export const ALL_TOOLS = [
  ...ARTISAN_TOOLS,
  ...MUSICAL_INSTRUMENTS,
  ...GAMING_SETS,
  ...VEHICLE_TOOLS,
  "Thieves' Tools",
  'Disguise Kit',
  'Forgery Kit',
  "Herbalism Kit",
  "Navigator's Tools",
  "Poisoner's Kit",
];
