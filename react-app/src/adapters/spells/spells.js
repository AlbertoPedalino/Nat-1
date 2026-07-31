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
 * adapters/spells/spells.js
 *
 * Dati strutturati per spell di livello 1–9. Nessun fallback su testo raw.
 * Ogni entry definisce:
 *   icon       — nome lucide icon
 *   toHit      — true = tiro per colpire
 *   hasSave    — true = tiro salvezza
 *   saveAbility — ability del save ('dex','con','wis', ecc.) o null
 *   dmgType    — tipo danno o ''
 *   baseDie    — dado/formula danno al livello base (es. '8d6')
 *   upcastDie  — dado/formula aggiuntivo per ogni slot superiore (es. '1d6') o ''
 *   range      — portata
 *   aoe        — area effetto (es. '20-ft sphere') o ''
 *   heal       — true se è una spell di cura
 *   concentration — true se richiede concentrazione
 *   notes      — testo note extra
 *
 * Per aggiungere una spell: registerSpellData('Nome', { ... });
 * Spell non registrate: la sheet usa i dati 5etools raw.
 */

(function () {
  "use strict";
  if (typeof registerSpellData !== "function") return;

  /* ════════════════════════════
     LIVELLO 1
  ════════════════════════════ */
  registerSpellData("Bless", {
    icon: "sparkles",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "", upcastDie: "",
    range: "30 ft", aoe: "",
    heal: false, concentration: true,
    utilityDie: "1d4",
    utilityLabel: "Bonus",
    notes: "Up to 3 creatures add 1d4 to attack rolls and saving throws. +1 creature per slot above 1st."
  });
  registerSpellData("Magic Missile", {
    icon: "zap",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "force",
    baseDie: "3d4+3",  // 3 dardi × (1d4+1)
    upcastDie: "1d4+1",  // +1 dardo per slot superiore
    range: "120 ft", aoe: "",
    heal: false, concentration: false,
    notes: "3 dardi automatici (nessun tiro). +1 dardo per ogni slot superiore al 1°."
  });
  registerSpellData("Burning Hands", {
    icon: "flame",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "fire",
    baseDie: "3d6", upcastDie: "1d6",
    range: "Self", aoe: "15-ft cone",
    heal: false, concentration: false,
    notes: "DEX save. Metà danno su successo."
  });
  registerSpellData("Cure Wounds", {
    icon: "heart-pulse",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "2d8", upcastDie: "2d8",
    range: "Touch", aoe: "",
    heal: true, concentration: false,
    notes: "Cura 2d8 + mod. spellcasting. +2d8 per slot superiore al 1°."
  });
  registerSpellData("Healing Word", {
    icon: "heart",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "2d4", upcastDie: "2d4",
    range: "60 ft", aoe: "",
    heal: true, concentration: false,
    notes: "Bonus Action. Cura 2d4 + mod. spellcasting. +2d4 per slot superiore al 1°."
  });
  registerSpellData("Thunderwave", {
    icon: "waves",
    toHit: false, hasSave: true, saveAbility: "con",
    dmgType: "thunder",
    baseDie: "2d8", upcastDie: "1d8",
    range: "Self", aoe: "15-ft cube",
    heal: false, concentration: false,
    notes: "CON save. Metà danno su successo. Fallimento: spinto 10 ft."
  });
  registerSpellData("Chromatic Orb", {
    icon: "circle",
    toHit: true, hasSave: false, saveAbility: null,
    dmgType: "varies",
    baseDie: "3d8", upcastDie: "1d8",
    range: "90 ft", aoe: "",
    heal: false, concentration: false,
    notes: "Scegli tipo danno: acid/cold/fire/lightning/poison/thunder."
  });
  registerSpellData("Inflict Wounds", {
    icon: "skull",
    toHit: false, hasSave: true, saveAbility: "con",
    dmgType: "necrotic",
    baseDie: "2d10", upcastDie: "1d10",
    range: "Touch", aoe: "",
    heal: false, concentration: false,
    notes: "CON save. Full damage on failed save, half on success."
  });
  registerSpellData("Guiding Bolt", {
    icon: "sparkles",
    toHit: true, hasSave: false, saveAbility: null,
    dmgType: "radiant",
    baseDie: "4d6", upcastDie: "1d6",
    range: "120 ft", aoe: "",
    heal: false, concentration: false,
    notes: "Prossimo attacco contro il bersaglio ha vantaggio (entro fine del tuo prossimo turno)."
  });

  /* ════════════════════════════
     LIVELLO 2
  ════════════════════════════ */
  registerSpellData("Shatter", {
    icon: "volume-2",
    toHit: false, hasSave: true, saveAbility: "con",
    dmgType: "thunder",
    baseDie: "3d8", upcastDie: "1d8",
    range: "60 ft", aoe: "10-ft sphere",
    heal: false, concentration: false,
    notes: "CON save. Metà danno su successo. Svantaggio per creature in armatura o inorganiche."
  });
  registerSpellData("Scorching Ray", {
    icon: "flame",
    toHit: true, hasSave: false, saveAbility: null,
    dmgType: "fire",
    baseDie: "6d6", upcastDie: "2d6",
    range: "120 ft", aoe: "",
    heal: false, concentration: false,
    notes: "3 raggi, ogni raggio fa 2d6. +1 raggio per slot superiore al 2°."
  });
  registerSpellData("Spiritual Weapon", {
    icon: "sword",
    toHit: true, hasSave: false, saveAbility: null,
    dmgType: "force",
    baseDie: "1d8", upcastDie: "1d8",
    range: "60 ft", aoe: "",
    heal: false, concentration: true,
    notes: "Concentration, up to 1 minute. Create the spectral force and immediately make a melee spell attack. On later turns, Bonus Action to move it up to 20 ft and repeat the attack. +1d8 per slot level above 2."
  });
  registerSpellData("Prayer of Healing", {
    icon: "heart-pulse",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "2d8", upcastDie: "1d8",
    range: "30 ft", aoe: "",
    heal: true, concentration: false,
    notes: "10-minute casting. Up to 5 creatures that remain within range gain the benefits of a Short Rest and regain 2d8 HP. A creature can't benefit again until it finishes a Long Rest. +1d8 per slot above 2."
  });

  /* ════════════════════════════
     LIVELLO 3
  ════════════════════════════ */
  registerSpellData("Fireball", {
    icon: "flame",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "fire",
    baseDie: "8d6", upcastDie: "1d6",
    range: "150 ft", aoe: "20-ft sphere",
    heal: false, concentration: false,
    notes: "DEX save. Metà danno su successo. Il fuoco si espande attorno agli angoli."
  });
  registerSpellData("Lightning Bolt", {
    icon: "zap",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "lightning",
    baseDie: "8d6", upcastDie: "1d6",
    range: "Self", aoe: "100-ft line",
    heal: false, concentration: false,
    notes: "DEX save. Metà danno su successo. Il fulmine rimbalza sulle pareti."
  });
  registerSpellData("Mass Healing Word", {
    icon: "heart",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "2d4", upcastDie: "1d4",
    range: "60 ft", aoe: "",
    heal: true, concentration: false,
    notes: "Bonus Action. Up to 6 visible creatures regain 2d4 + spellcasting modifier HP. +1d4 per slot level above 3."
  });

  /* ════════════════════════════
     LIVELLO 4
  ════════════════════════════ */
  registerSpellData("Ice Storm", {
    icon: "snowflake",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "bludgeoning/cold",
    baseDie: "2d8+4d6", upcastDie: "1d8",
    range: "300 ft", aoe: "20-ft cylinder",
    heal: false, concentration: false,
    notes: "DEX save. Metà danno su successo. Terreno ghiacciato = difficile."
  });

  /* ════════════════════════════
     LIVELLO 5
  ════════════════════════════ */
  registerSpellData("Cone of Cold", {
    icon: "snowflake",
    toHit: false, hasSave: true, saveAbility: "con",
    dmgType: "cold",
    baseDie: "8d8", upcastDie: "1d8",
    range: "Self", aoe: "60-ft cone",
    heal: false, concentration: false,
    notes: "CON save. Metà danno su successo."
  });
  registerSpellData("Mass Cure Wounds", {
    icon: "heart-pulse",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "5d8", upcastDie: "1d8",
    range: "60 ft", aoe: "",
    heal: true, concentration: false,
    notes: "Fino a 6 creature. Cura 5d8 + mod. spellcasting ciascuna. +1d8 per slot superiore al 5°."
  });

  /* ════════════════════════════
     LIVELLO 6
  ════════════════════════════ */
  registerSpellData("Chain Lightning", {
    icon: "zap",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "lightning",
    baseDie: "10d8", upcastDie: "1d8",
    range: "150 ft", aoe: "",
    heal: false, concentration: false,
    notes: "DEX save. Metà danno su successo. 3 archi secondari a bersagli entro 30 ft. +1 arco per slot superiore al 6°."
  });

  /* ════════════════════════════
     LIVELLO 7
  ════════════════════════════ */
  registerSpellData("Fire Storm", {
    icon: "flame",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "fire",
    baseDie: "7d10", upcastDie: "",
    range: "150 ft", aoe: "10 10-ft cubes",
    heal: false, concentration: false,
    notes: "DEX save. Metà danno su successo. Piante non magiche bruciano."
  });

  /* ════════════════════════════
     LIVELLO 8
  ════════════════════════════ */
  registerSpellData("Sunburst", {
    icon: "sun",
    toHit: false, hasSave: true, saveAbility: "con",
    dmgType: "radiant",
    baseDie: "12d6", upcastDie: "",
    range: "150 ft", aoe: "60-ft sphere",
    heal: false, concentration: false,
    notes: "CON save. Metà danno su successo. Fallimento: accecato fino alla prossima verifica al termine turno."
  });

  /* ════════════════════════════
     LIVELLO 9
  ════════════════════════════ */
  registerSpellData("Meteor Swarm", {
    icon: "flame",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "fire/bludgeoning",
    baseDie: "40d6", upcastDie: "",
    range: "1 mile", aoe: "4× 40-ft sphere",
    heal: false, concentration: false,
    notes: "DEX save. Metà danno su successo. 4 meteore (20d6 bludg + 20d6 fire ciascuna) — possono colpire punti diversi."
  });
  registerSpellData("False Life", {
    icon: "skull",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "2d4+4", upcastDie: "5",
    range: "Self", aoe: "",
    heal: false, concentration: false,
    notes: "Gain temporary HP. +5 temp HP per slot level above 1st."
  });
})();

}

