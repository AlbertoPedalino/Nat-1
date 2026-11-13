import {
  GiAllSeeingEye, GiAnvil, GiBackpack, GiBleedingWound, GiBookCover, GiBookshelf, GiCandleLight,
  GiCheckedShield, GiCrystalBall, GiDualityMask, GiHearts, GiKnapsack, GiMagicSwirl, GiMuscleUp, GiQuill,
  GiScrollQuill, GiShield, GiShieldReflect, GiSkills, GiSpellBook, GiStarFormation, GiStarSwirl,
  GiStarsStack, GiSwordClash, GiSwordsEmblem, GiTiedScroll, GiTreasureMap, GiTwoCoins, GiUpgrade,
  GiWalkingBoot, GiAcorn, GiAnchor, GiBarracksTent, GiBattleAxe, GiBowArrow, GiBroadsword, GiCandlebright,
  GiChest, GiCloverSpiked, GiCrenelCrown, GiCrenulatedShield, GiCrossedSwords, GiCutDiamond, GiDeathSkull,
  GiDiamondRing, GiDiceSixFacesFive, GiFallingStar, GiFeather, GiFeatheredWing, GiFire, GiFireAxe, GiFist,
  GiFlame, GiFloatingCrystal, GiGhost, GiGhostAlly, GiGinkgoLeaf, GiHatchet, GiHeartBottle, GiHelmet, GiHood,
  GiHourglass, GiKey, GiLantern, GiMoon, GiMoonBats, GiOpenBook, GiPineTree, GiPlainDagger, GiPocketBow,
  GiPotionBall, GiRing, GiSevenPointedStar, GiShardSword, GiShinyApple, GiSnake, GiStoneTower, GiSwordsPower,
  GiThrownSpear, GiTorch, GiTowerFlag, GiTrident, GiVisoredHelm, GiWarhammer, GiWarlockEye, GiWaterDrop,
  GiWhiteTower, GiWolfHead, GiMushroomGills,
} from 'react-icons/gi';
import { Dices, HeartPulse, History, ShieldPlus, Sword, Swords, Target } from 'lucide-react';

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
  attack: Target,
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
  weaponMasteries: Swords,
  species: GiDualityMask,
  background: GiTiedScroll,
  equipment: GiKnapsack,
  currency: GiTwoCoins,
  inventory: GiBackpack,
  sheet: GiScrollQuill,
  preview: GiCrystalBall,

  // The battle map.
  scenes: GiTreasureMap,

  // The compendium.
  compendium: GiBookCover,
});

// The game's things drawn small all over the app's paper (stickerPaper.js):
// only drawings with a plain silhouette, which still read at 20px — a d20 or
// an owl at that size is a smudge.
export const STICKER_DRAWINGS = Object.freeze([
  GiShield, GiWaterDrop, GiDiceSixFacesFive, GiSevenPointedStar, GiBarracksTent, GiHearts, GiFallingStar,
  GiHelmet, GiGinkgoLeaf, GiFire, GiThrownSpear, GiWhiteTower, GiCloverSpiked, GiTowerFlag,
  GiCrenulatedShield, GiTrident, GiCrenelCrown, GiHatchet, GiShardSword, GiMoon, GiFeatheredWing,
  GiCandlebright, GiFireAxe, GiFloatingCrystal, GiStoneTower, GiWarlockEye, GiGhostAlly, GiDeathSkull,
  GiChest, GiCutDiamond, GiFist, GiHourglass, GiWarhammer, GiRing, GiDiamondRing, GiCandleLight, GiFlame,
  GiFeather, GiBowArrow, GiSwordsPower, GiHood, GiTorch, GiQuill, GiMoonBats, GiAnchor, GiPlainDagger,
  GiTwoCoins, GiSnake, GiPocketBow, GiWolfHead, GiOpenBook, GiCrossedSwords, GiBattleAxe, GiPineTree,
  GiBroadsword, GiShinyApple, GiVisoredHelm, GiCrystalBall, GiPotionBall, GiHeartBottle, GiGhost, GiLantern,
  GiAcorn, GiKey, GiMushroomGills,
]);
