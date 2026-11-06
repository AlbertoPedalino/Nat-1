// The 5etools data files each catalog downloads.

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

export const SPELL_FILES = [
  'spells-xphb.json',
  'spells-frhof.json',
  'spells-efa.json',
  'spells-au.json',
];

// Bestiary files for Wild Shape beast forms. The 2024 Monster Manual (XMM) is the
// main roster; the other supported 2024 manuals contribute a handful of beasts.
// (FRHoF ships no bestiary file.) loadBeasts still source-filters to
// BEAST_ALLOWED_SOURCES, so adding a file can never leak disallowed creatures.
export const BEAST_FILES = [
  'bestiary/bestiary-xmm.json',
  'bestiary/bestiary-xphb.json',
  'bestiary/bestiary-xdmg.json',
  'bestiary/bestiary-fraif.json',
  'bestiary/bestiary-rhw.json',
  'bestiary/bestiary-efa.json',
];
