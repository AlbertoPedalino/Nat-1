import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSpellData } = createAdapterBindings(registry, context);
/**
 * adapters/spells/spells.js
 *
 * Structured data for level 1–9 spells. No fallback on raw text.
 * Each entry defines:
 *   icon       — lucide icon name
 *   toHit      — true = attack roll
 *   hasSave    — true = saving throw
 *   saveAbility — the save's ability ('dex', 'con', 'wis', …) or null
 *   dmgType    — damage type or ''
 *   baseDie    — damage die/formula at base level (e.g. '8d6')
 *   upcastDie  — extra die/formula per higher slot (e.g. '1d6') or ''
 *   range      — range
 *   aoe        — area of effect (e.g. '20-ft sphere') or ''
 *   heal       — true for a healing spell
 *   concentration — true when it needs Concentration
 *   notes      — extra note text, shown on the sheet (English)
 *
 * To add a spell: registerSpellData('Name', { ... });
 * Spells not registered here: the sheet uses the raw 5etools data.
 */

(function () {
  "use strict";

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
    baseDie: "3d4+3",  // 3 darts × (1d4+1)
    upcastDie: "1d4+1",  // +1 dardo per slot superiore
    range: "120 ft", aoe: "",
    heal: false, concentration: false,
    notes: "3 darts that hit automatically (no attack roll). +1 dart per slot level above 1st."
  });
  registerSpellData("Burning Hands", {
    icon: "flame",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "fire",
    baseDie: "3d6", upcastDie: "1d6",
    range: "Self", aoe: "15-ft cone",
    heal: false, concentration: false,
    notes: "DEX save. Half damage on a success."
  });
  registerSpellData("Cure Wounds", {
    icon: "heart-pulse",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "2d8", upcastDie: "2d8",
    range: "Touch", aoe: "",
    heal: true, concentration: false,
    notes: "Heals 2d8 + spellcasting modifier. +2d8 per slot level above 1st."
  });
  registerSpellData("Healing Word", {
    icon: "heart",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "2d4", upcastDie: "2d4",
    range: "60 ft", aoe: "",
    heal: true, concentration: false,
    notes: "Bonus Action. Heals 2d4 + spellcasting modifier. +2d4 per slot level above 1st."
  });
  registerSpellData("Thunderwave", {
    icon: "waves",
    toHit: false, hasSave: true, saveAbility: "con",
    dmgType: "thunder",
    baseDie: "2d8", upcastDie: "1d8",
    range: "Self", aoe: "15-ft cube",
    heal: false, concentration: false,
    notes: "CON save. Half damage on a success. On a failure: pushed 10 ft."
  });
  registerSpellData("Chromatic Orb", {
    icon: "circle",
    toHit: true, hasSave: false, saveAbility: null,
    dmgType: "varies",
    baseDie: "3d8", upcastDie: "1d8",
    range: "90 ft", aoe: "",
    heal: false, concentration: false,
    notes: "Choose the damage type: acid/cold/fire/lightning/poison/thunder."
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
    notes: "The next attack roll against the target has Advantage (until the end of your next turn)."
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
    notes: "CON save. Half damage on a success. Disadvantage for creatures in armor or made of inorganic material."
  });
  registerSpellData("Scorching Ray", {
    icon: "flame",
    toHit: true, hasSave: false, saveAbility: null,
    dmgType: "fire",
    baseDie: "6d6", upcastDie: "2d6",
    range: "120 ft", aoe: "",
    heal: false, concentration: false,
    notes: "3 rays, 2d6 each. +1 ray per slot level above 2nd."
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
    notes: "DEX save. Half damage on a success. The fire spreads around corners."
  });
  registerSpellData("Lightning Bolt", {
    icon: "zap",
    toHit: false, hasSave: true, saveAbility: "dex",
    dmgType: "lightning",
    baseDie: "8d6", upcastDie: "1d6",
    range: "Self", aoe: "100-ft line",
    heal: false, concentration: false,
    notes: "DEX save. Half damage on a success. The lightning bounces off walls."
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
    notes: "DEX save. Half damage on a success. The frozen ground is Difficult Terrain."
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
    notes: "CON save. Half damage on a success."
  });
  registerSpellData("Mass Cure Wounds", {
    icon: "heart-pulse",
    toHit: false, hasSave: false, saveAbility: null,
    dmgType: "",
    baseDie: "5d8", upcastDie: "1d8",
    range: "60 ft", aoe: "",
    heal: true, concentration: false,
    notes: "Up to 6 creatures. Each heals 5d8 + spellcasting modifier. +1d8 per slot level above 5th."
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
    notes: "DEX save. Half damage on a success. 3 secondary arcs to targets within 30 ft. +1 arc per slot level above 6th."
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
    notes: "DEX save. Half damage on a success. Nonmagical plants catch fire."
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
    notes: "CON save. Half damage on a success. On a failure: Blinded until it succeeds on the save at the end of its turn."
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
    notes: "DEX save. Half damage on a success. 4 meteors (20d6 bludgeoning + 20d6 fire each) that can strike different points."
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

