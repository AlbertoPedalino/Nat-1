import {
  GiAllSeeingEye, GiAnvil, GiBackpack, GiBookshelf, GiCheckedShield, GiCrossedSwords, GiDualityMask,
  GiHealingShield, GiHealthPotion, GiHearts, GiKnapsack, GiMagicSwirl, GiMuscleUp, GiQuill, GiRollingDices,
  GiSaberSlash, GiScrollQuill, GiScrollUnfurled, GiShieldReflect, GiSkills, GiSpellBook, GiStarFormation,
  GiStarsStack, GiStarSwirl, GiSwordClash, GiSwordsEmblem, GiTwoCoins, GiUpgrade, GiShield,
  GiWalkingBoot, GiBleedingWound, GiCandleLight, GiTiedScroll, GiCrystalBall,
} from 'react-icons/gi';

// The interface's game icons, by what they stand for: one place picks the
// drawing for a role, and every panel, tile and roll button that plays that
// role takes it from here. Drawn by game-icons.net (Lorc, Delapouite and
// contributors), CC BY 3.0 — credited in the README.
//
// Controls that are plain interface (close, chevrons, search, add) keep their
// lucide icons; these are for the game's own things.
export const GAME_ICONS = Object.freeze({
  // The sheet's panels.
  abilityScores: GiMuscleUp,
  hitPoints: GiHearts,
  armorClass: GiShield,
  inspiration: GiStarSwirl,
  savingThrows: GiShieldReflect,
  skills: GiSkills,
  senses: GiAllSeeingEye,
  movement: GiWalkingBoot,
  proficiencies: GiAnvil,
  defenses: GiCheckedShield,
  conditions: GiBleedingWound,
  reminders: GiCandleLight,
  actions: GiSwordClash,

  // Roll buttons, by what the roll does.
  attack: GiCrossedSwords,
  damage: GiSaberSlash,
  heal: GiHealthPotion,
  tempHp: GiHealingShield,
  roll: GiRollingDices,
  rollLog: GiScrollUnfurled,

  // The builder's steps and panels.
  characterName: GiQuill,
  experience: GiStarsStack,
  books: GiBookshelf,
  classes: GiSwordsEmblem,
  level: GiUpgrade,
  subclass: GiStarFormation,
  spells: GiSpellBook,
  spellSlots: GiMagicSwirl,
  species: GiDualityMask,
  background: GiTiedScroll,
  equipment: GiKnapsack,
  currency: GiTwoCoins,
  inventory: GiBackpack,
  sheet: GiScrollQuill,
  preview: GiCrystalBall,
});
