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
import {
  AlertTriangle, ArrowBigUp, Axe, Backpack, Ban, BookOpen, Castle, Cloud, CloudFog, CloudLightning, CloudRain,
  CloudSnow, CloudSun, Coins, Compass, Cross, Crosshair, Dice5, Dices, DoorOpen, Dumbbell, Eye, Feather, Flame,
  Flower2, Footprints, Gem, Hammer, HeartPulse, History, Home, House, Landmark, Leaf, LeafyGreen, Map, Moon,
  Mountain, Music, PawPrint, Rabbit, Route, ScrollText, Shield, ShieldAlert, ShieldCheck, ShieldHalf, ShieldPlus,
  ShieldQuestion, ShieldX, Skull, Snowflake, Sparkles, Sun, SunMedium, Sword, Swords, Tent, ThermometerSun,
  Trees, User, Wand2, Wheat, Wind,
} from 'lucide-react';

// The interface's game icons, by what they stand for: one place picks the
// drawing for a role, and every panel, tile and roll button that plays that
// role takes it from here. Drawn by game-icons.net (Lorc, Delapouite and
// contributors), CC BY 3.0 — credited in the README.
//
// Two kinds, by the room they get: the game drawings stand where they are drawn
// large enough to read (a panel's badge, AC, Inspiration); a small button (a
// roll on a card, the dice pill) takes a simple stroke icon, as a detailed
// drawing at 12px is a smudge. Controls that are plain interface (close,
// chevrons, search, add, edit, delete) keep their own lucide icons; every icon
// that shows the game's world — a weapon, a skull, a scroll, a castle, a die —
// is a role here, named by what it stands for, so a new look for the whole app
// (another genre) is a change to this file only (guarded).
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
  attack: Crosshair,
  damage: Sword,
  heal: HeartPulse,
  tempHp: ShieldPlus,
  roll: Dices,
  bonus: ArrowBigUp,
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

  // Small stroke icons of the game's world, by what they stand for.
  // Tools and their sections.
  characterSheet: ScrollText,
  characterBuilder: Wand2,
  encounter: Swords,
  build: BookOpen,
  reference: BookOpen,
  quest: ScrollText,
  dungeon: Castle,
  statBlock: ScrollText,
  door: DoorOpen,
  // Creatures and their state.
  monster: Skull,
  dead: Skull,
  beast: PawPrint,
  armor: Shield,
  maxHp: HeartPulse,
  // Rolls and their outcome.
  minimumRoll: Dice5,
  criticalSuccess: Sparkles,
  criticalFailure: Skull,
  magic: Sparkles,
  coinHeads: User,
  coinTails: Cross,
  // Advantage marks on a roll (advantageMark.jsx).
  advantage: ShieldCheck,
  disadvantage: ShieldAlert,
  advantageBoth: ShieldHalf,
  situational: ShieldQuestion,
  autoFail: ShieldX,
  // Rests.
  shortRest: Sun,
  longRest: Moon,
  // Item shelves (ItemGroupFilter).
  weapons: Swords,
  gear: Backpack,
  attuned: Gem,
  // What a table, a hex or a room turns up.
  loot: Coins,
  trap: Flame,
  camp: Tent,
  environment: Leaf,
  safe: ShieldCheck,
  travel: Footprints,
  mount: Rabbit,
  tier: Swords,
});

// The icon vocabularies of one feature each, kept here with the roles so the
// whole look is this file.

// A character's class mark (classIcon.js), and the mark of no known class.
export const CLASS_ICONS = Object.freeze({
  artificer: Hammer,
  barbarian: Axe,
  bard: Music,
  cleric: Cross,
  druid: Feather,
  fighter: Sword,
  monk: Dumbbell,
  paladin: Shield,
  ranger: Compass,
  rogue: Eye,
  sorcerer: Sparkles,
  warlock: Flame,
  wizard: BookOpen,
});
export const FALLBACK_CLASS_ICON = Wand2;

// The hexcrawl's seasons, weather, terrains and populations (hexIcons.js).
export const SEASON_ICONS = Object.freeze({
  Spring: Flower2, Summer: Sun, Autumn: LeafyGreen, Winter: Snowflake,
});
export const WEATHER_ICONS = Object.freeze({ Clear: Sun, Rain: CloudRain, Snow: Snowflake });
export const FALLBACK_WEATHER_ICON = CloudSun;
// Keyed by the terrain option id, and by its label too, because a hex stores the
// label rather than the id.
export const TERRAIN_ICONS = Object.freeze({
  road: Route, plains: Wheat, forest: Trees, mountain: Mountain,
  Road: Route, Plains: Wheat, Forest: Trees, Mountain,
});
export const POPULATION_ICONS = Object.freeze({
  unexplored: Compass, frontier: Tent, settled: Castle, random: Compass,
});

// The battle map's atmosphere presets (AtmospherePicker), and the mark of an
// unknown one.
export const ATMOSPHERE_ICONS = Object.freeze({
  none: Ban,
  rain: CloudRain,
  storm: CloudLightning,
  wind: Wind,
  fog: CloudFog,
  snow: Snowflake,
  blizzard: CloudSnow,
  sandstorm: Cloud,
  fire: Flame,
  heatwave: ThermometerSun,
  sunrays: SunMedium,
  swamp: Trees,
  haunted: House,
  goldvault: Coins,
});
export const FALLBACK_ATMOSPHERE_ICON = Cloud;

// The map generators a new scene can start from (NewSceneDialog), and the mark
// of an unknown one.
export const SCENE_GENERATOR_ICONS = Object.freeze({
  dungeon: Castle,
  cave: Mountain,
  dwelling: Home,
  village: Trees,
  city: Landmark,
  realm: Map,
});
export const FALLBACK_SCENE_GENERATOR_ICON = Map;

// The GM Board's random tables (tableCatalog.js).
export const TABLE_ICONS = Object.freeze({
  weather: CloudRain, event: Map, loot: Coins, compl: AlertTriangle, encounter: Swords, trap: Flame, env: Leaf,
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
