import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    _GAMING_SETS,
    _VEHICLE_TOOLS,
    _STD_LANGS,
    _EXOTIC_LANGS,
    _ALL_LANGS,
    _ALL_TOOLS,
    allItemsDb,
    registerClassAdapter,
    getClassAdapter,
    registerSubclassAdapter,
    getSubclassAdapter,
    registerSpeciesAdapter,
    getSpeciesAdapter,
    registerFeatAdapter,
    getFeatAdapter,
    registerClassSheetActions,
    getClassSheetActions,
    registerSubclassSheetActions,
    getSubclassSheetActions,
    registerSpeciesSheetActions,
    getSpeciesSheetActions,
    registerFeatSheetActions,
    getFeatSheetActions,
    registerClassSheetResources,
    getClassSheetResources,
    registerSubclassSheetResources,
    getSubclassSheetResources,
    registerSpeciesSheetResources,
    getSpeciesSheetResources,
    registerFeatSheetResources,
    getFeatSheetResources,
    registerClassSheetEffects,
    getClassSheetEffects,
    registerSubclassSheetEffects,
    getSubclassSheetEffects,
    registerSpeciesSheetEffects,
    getSpeciesSheetEffects,
    registerFeatSheetEffects,
    getFeatSheetEffects,
    registerClassRuntimeConfig,
    getClassRuntimeConfig,
    registerSubclassRuntimeConfig,
    getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig,
    getSpeciesRuntimeConfig,
    registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta,
    getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta,
    getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta,
    registerSubclassSheetCommonChoiceMeta,
    registerSpeciesSheetCommonChoiceMeta,
    registerItemFlagDef,
    getItemFlagDef,
    getAllItemFlagDefs,
    registerWeaponAbilityOverride,
    getWeaponAbilityOverrides,
    registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter,
    getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter,
    getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies,
    getClassSheetProficiencies,
    registerSubclassSheetProficiencies,
    getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies,
    getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers,
    getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers,
    getSpeciesSheetSpellModifiers,
    registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus,
    getSpeciesSheetHpBonus,
    registerClassAtWillSpells,
    getClassAtWillSpells,
    registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants,
    registerResourceSideEffect,
    getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider,
    registerGlobalClassAdapter,
    getGlobalClassAdapters,
    registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter,
    getGlobalFeatAdapters,
    registerGlobalSpellAdapter,
    getGlobalSpellAdapters,
    registerGlobalItemAdapter,
    getGlobalItemAdapters,
    registerCantripData,
    getCantripData,
    registerCantripDataModifier,
    getCantripDataModifiers,
    registerSpellData,
    getSpellData,
    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
  } = createAdapterBindings(registry, context);
/**
 * adapters/spells/cantrips.js
 *
 * Dati strutturati per i cantrip. Nessun fallback su testo raw.
 * Ogni entry definisce esplicitamente:
 *   icon     — nome lucide icon
 *   die      — dado base danno (es. '1d8'). Scalato automaticamente x lv 5/11/17.
 *   dmgType  — tipo danno (stringa) o '' per utility
 *   range    — portata (stringa)
 *   toHit    — true = tiro per colpire (ATK); false = no
 *   hasSave  — true = tiro salvezza richiesto (SAV); false = no
 *   notes    — testo note extra (opzionale)
 *
 * Per aggiungere cantrip: registerCantripData('Nome', { ... });
 * Cantrip non registrati: la sheet usa i dati 5etools raw come fallback.
 */

(function () {
  "use strict";
  if (typeof registerCantripData !== "function") return;

  /* ── Damaging — attack roll ─────────────────────────────────── */
  registerCantripData("Fire Bolt", {
    icon: "flame",
    die: "1d10", dmgType: "fire",
    range: "120 ft",
    toHit: true, hasSave: false,
    notes: ""
  });
  registerCantripData("Ray of Frost", {
    icon: "snowflake",
    die: "1d8", dmgType: "cold",
    range: "60 ft",
    toHit: true, hasSave: false,
    notes: "Speed −10 ft to target"
  });
  registerCantripData("Eldritch Blast", {
    icon: "zap",
    die: "1d10", dmgType: "force",
    range: "120 ft",
    toHit: true, hasSave: false,
    notes: "",
    beamCount: function (lv) {
      var level = Number(lv || 1);
      if (level >= 17) return 4;
      if (level >= 11) return 3;
      if (level >= 5) return 2;
      return 1;
    },
  });
  registerCantripData("Chill Touch", {
    icon: "bug",
    die: "1d10", dmgType: "necrotic",
    range: "Touch",
    toHit: true, hasSave: false,
    notes: "Prevents HP regeneration"
  });
  registerCantripData("Shocking Grasp", {
    icon: "zap",
    die: "1d8", dmgType: "lightning",
    range: "Touch",
    toHit: true, hasSave: false,
    notes: "Advantage vs metal; target loses reaction"
  });
  registerCantripData("Produce Flame", {
    icon: "flame",
    die: "1d8", dmgType: "fire",
    range: "30 ft",
    toHit: true, hasSave: false,
    notes: "Illuminates 20 ft or throw it"
  });
  registerCantripData("Thorn Whip", {
    icon: "leaf",
    die: "1d6", dmgType: "piercing",
    range: "30 ft",
    toHit: true, hasSave: false,
    notes: "Pulls target 10 ft toward you"
  });
  registerCantripData("Booming Blade", {
    icon: "zap",
    die: "1d8", dmgType: "thunder",
    range: "5 ft",
    toHit: true, hasSave: false,
    notes: "+1d8 extra if target moves"
  });
  registerCantripData("Green-Flame Blade", {
    icon: "flame",
    die: "1d8", dmgType: "fire",
    range: "5 ft",
    toHit: true, hasSave: false,
    notes: "Fire splash on nearby creature"
  });
  registerCantripData("True Strike", {
    icon: "target",
    die: "1d6", dmgType: "radiant/weapon",
    range: "Self",
    toHit: true, hasSave: false,
    notes: "Make one attack with the weapon used in the spell's casting. Use your spellcasting ability for attack and damage; damage can be Radiant or the weapon's normal type. Extra Radiant damage at lv.5/11/17."
  });

  /* ── Damaging — saving throw ────────────────────────────────── */
  registerCantripData("Sacred Flame", {
    icon: "sparkles",
    die: "1d8", dmgType: "radiant",
    range: "60 ft",
    toHit: false, hasSave: true,
    notes: "DEX save negates — no benefit from cover"
  });
  registerCantripData("Toll the Dead", {
    icon: "skull",
    die: "1d8", dmgType: "necrotic",
    range: "60 ft",
    toHit: false, hasSave: true,
    notes: "1d12 if target is already injured"
  });
  registerCantripData("Mind Sliver", {
    icon: "brain",
    die: "1d6", dmgType: "psychic",
    range: "60 ft",
    toHit: false, hasSave: true,
    notes: "INT save — target subtracts 1d4 from its next saving throw before the end of your next turn"
  });
  registerCantripData("Poison Spray", {
    icon: "circle",
    die: "1d12", dmgType: "poison",
    range: "30 ft",
    toHit: true, hasSave: false,
    notes: "Ranged spell attack. On hit, target takes Poison damage."
  });
  registerCantripData("Vicious Mockery", {
    icon: "masks",
    die: "1d4", dmgType: "psychic",
    range: "60 ft",
    toHit: false, hasSave: true,
    notes: "WIS save — disadvantage on next attack"
  });
  registerCantripData("Acid Splash", {
    icon: "droplets",
    die: "1d6", dmgType: "acid",
    range: "60 ft",
    toHit: false, hasSave: true,
    notes: "DEX save — can hit 2 adjacent targets"
  });
  registerCantripData("Thunderclap", {
    icon: "cloud-lightning",
    die: "1d6", dmgType: "thunder",
    range: "5 ft",
    toHit: false, hasSave: true,
    notes: "CON save — audible 100 ft away"
  });

  /* ── Utility — no attack, no save ───────────────────────────── */
  registerCantripData("Blade Ward", {
    icon: "shield",
    die: "", dmgType: "",
    range: "Self",
    toHit: false, hasSave: false,
    concentration: true,
    notes: "Concentration, up to 1 minute. Until the spell ends, any creature that makes an attack roll against you subtracts 1d4 from the roll."
  });
  registerCantripData("Guidance", {
    icon: "hand-helping",
    die: "", dmgType: "",
    range: "Touch",
    toHit: false, hasSave: false,
    concentration: true,
    utilityDie: "1d4",
    utilityLabel: "Bonus",
    notes: "Choose a skill. Until the spell ends, the willing creature adds 1d4 to ability checks using that skill."
  });
  registerCantripData("Light", {
    icon: "sun",
    die: "", dmgType: "",
    range: "Touch",
    toHit: false, hasSave: false,
    notes: "Object sheds bright light 20 ft, dim 20 ft further. 1 hour."
  });
  registerCantripData("Mending", {
    icon: "wrench",
    die: "", dmgType: "",
    range: "Touch",
    toHit: false, hasSave: false,
    notes: "Repairs a single break or tear in an object"
  });
  registerCantripData("Message", {
    icon: "message-circle",
    die: "", dmgType: "",
    range: "120 ft",
    toHit: false, hasSave: false,
    notes: "Whispered message + reply, only target hears"
  });
  registerCantripData("Prestidigitation", {
    icon: "wand",
    die: "", dmgType: "",
    range: "10 ft",
    toHit: false, hasSave: false,
    notes: "Minor magical effect: clean, soil, chill, warm, flavor, mark, trinket, etc."
  });
  registerCantripData("Druidcraft", {
    icon: "leaf",
    die: "", dmgType: "",
    range: "30 ft",
    toHit: false, hasSave: false,
    notes: "Minor nature effects: predict weather, bloom/wilt plant, scent, sensory effect"
  });
  registerCantripData("Thaumaturgy", {
    icon: "sparkles",
    die: "", dmgType: "",
    range: "30 ft",
    toHit: false, hasSave: false,
    notes: "Minor divine effects: tremor, flames, eyes glow, voice booms, door opens, etc."
  });
  registerCantripData("Spare the Dying", {
    icon: "heart-pulse",
    die: "", dmgType: "",
    range: "15 ft",
    toHit: false, hasSave: false,
    notes: "Stabilizes a dying creature (0 HP, making death saves)"
  });
  registerCantripData("Dancing Lights", {
    icon: "lightbulb",
    die: "", dmgType: "",
    range: "120 ft",
    toHit: false, hasSave: false,
    notes: "Up to 4 torch-sized lights, move 60 ft/turn. Concentration, 1 min."
  });
  registerCantripData("Friends", {
    icon: "smile",
    die: "", dmgType: "",
    range: "Self",
    toHit: false, hasSave: false,
    notes: "Advantage on CHA checks vs one non-hostile creature. Hostile after effect ends."
  });
  registerCantripData("Minor Illusion", {
    icon: "eye-off",
    die: "", dmgType: "",
    range: "30 ft",
    toHit: false, hasSave: false,
    notes: "Create a sound or image. INT (Investigation) vs Spell Save DC to see through."
  });
  registerCantripData("Mage Hand", {
    icon: "hand",
    die: "", dmgType: "",
    range: "30 ft",
    toHit: false, hasSave: false,
    notes: "Spectral hand carries up to 10 lbs, manipulates objects. 1 min."
  });
  registerCantripData("Resistance", {
    icon: "shield-check",
    die: "", dmgType: "",
    range: "Touch",
    toHit: false, hasSave: false,
    concentration: true,
    notes: "Choose a damage type. Until the spell ends, the willing creature reduces damage of that type by 1d4 the first time it takes it each turn."
  });
  registerCantripData("Shillelagh", {
    icon: "tree-deciduous",
    die: "1d8", dmgType: "force/weapon",
    range: "Self",
    toHit: true, hasSave: false,
    notes: "Club/quarterstaff uses your spellcasting ability instead of STR. Weapon damage die becomes d8, then d10 at lv.5, d12 at lv.11, 2d6 at lv.17; damage can be Force or normal type."
  });
  registerCantripData("Word of Radiance", {
    icon: "sun",
    die: "1d6", dmgType: "radiant",
    range: "5 ft",
    toHit: false, hasSave: true,
    notes: "CON save — each creature of your choice within range"
  });
  registerCantripData("Infestation", {
    icon: "bug",
    die: "1d6", dmgType: "poison",
    range: "30 ft",
    toHit: false, hasSave: true,
    notes: "CON save — target moves 5 ft in random direction on fail"
  });
  registerCantripData("Create Bonfire", {
    icon: "flame",
    die: "1d8", dmgType: "fire",
    range: "60 ft",
    toHit: false, hasSave: true,
    notes: "DEX save — bonfire lasts 1 min, concentration. Entering it re-triggers save."
  });
  registerCantripData("Frostbite", {
    icon: "snowflake",
    die: "1d6", dmgType: "cold",
    range: "60 ft",
    toHit: false, hasSave: true,
    notes: "CON save — disadvantage on next weapon attack on fail"
  });
  registerCantripData("Lightning Lure", {
    icon: "zap",
    die: "1d8", dmgType: "lightning",
    range: "15 ft",
    toHit: false, hasSave: true,
    notes: "STR save — pull target up to 10 ft toward you"
  });
})();

}

