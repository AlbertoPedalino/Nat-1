import {
  GiAllSeeingEye, GiAnvil, GiBackpack, GiBookshelf, GiCheckedShield, GiDualityMask,
  GiHearts, GiKnapsack, GiMagicSwirl, GiMuscleUp, GiQuill, 
  GiScrollQuill, GiShieldReflect, GiSkills, GiSpellBook, GiStarFormation,
  GiStarsStack, GiStarSwirl, GiSwordClash, GiSwordsEmblem, GiTwoCoins, GiUpgrade, GiShield,
  GiWalkingBoot, GiBleedingWound, GiCandleLight, GiTiedScroll, GiCrystalBall,
} from 'react-icons/gi';
import { Dices, HeartPulse, History, ShieldPlus, Sword, Swords } from 'lucide-react';

// The interface's game icons, by what they stand for: one place picks the
// drawing for a role, and every panel, tile and roll button that plays that
// role takes it from here. Drawn by game-icons.net (Lorc, Delapouite and
// contributors), CC BY 3.0 — credited in the README.
//
// Two kinds, by the room they get: the game drawings stand where they are drawn
// large enough to read (a panel's badge, AC, Inspiration); a small button (a
// roll on a card, the dice pill) takes a simple stroke icon, as a detailed
// drawing at 12px is a smudge. Controls that are plain interface (close,
// chevrons, search, add) keep their own lucide icons.
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

  // Roll buttons, by what the roll does: small, so simple strokes.
  attack: Swords,
  damage: Sword,
  heal: HeartPulse,
  tempHp: ShieldPlus,
  roll: Dices,
  rollLog: History,

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
