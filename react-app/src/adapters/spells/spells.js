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
    baseDie: "", upcastDie: "",
    range: "30 ft", 
    heal: false, concentration: true,
    utilityDie: "1d4",
    utilityKind: "bonus",
    
  });
  registerSpellData("Magic Missile", {
    baseDie: "3d4+3",  // 3 darts × (1d4+1)
    upcastDie: "1d4+1",  // +1 dardo per slot superiore
    range: "120 ft", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Burning Hands", {
    baseDie: "3d6", upcastDie: "1d6",
    range: "Self", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Cure Wounds", {
    baseDie: "2d8", upcastDie: "2d8",
    range: "Touch", 
    heal: true, concentration: false,
    
  });
  registerSpellData("Healing Word", {
    baseDie: "2d4", upcastDie: "2d4",
    range: "60 ft", 
    heal: true, concentration: false,
    
  });
  registerSpellData("Thunderwave", {
    baseDie: "2d8", upcastDie: "1d8",
    range: "Self", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Chromatic Orb", {
    baseDie: "3d8", upcastDie: "1d8",
    range: "90 ft", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Inflict Wounds", {
    baseDie: "2d10", upcastDie: "1d10",
    range: "Touch", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Guiding Bolt", {
    baseDie: "4d6", upcastDie: "1d6",
    range: "120 ft", 
    heal: false, concentration: false,
    
  });

  /* ════════════════════════════
     LIVELLO 2
  ════════════════════════════ */
  registerSpellData("Shatter", {
    baseDie: "3d8", upcastDie: "1d8",
    range: "60 ft", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Scorching Ray", {
    baseDie: "6d6", upcastDie: "2d6",
    range: "120 ft", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Spiritual Weapon", {
    baseDie: "1d8", upcastDie: "1d8",
    range: "60 ft", 
    heal: false, concentration: true,
    
  });
  registerSpellData("Prayer of Healing", {
    baseDie: "2d8", upcastDie: "1d8",
    range: "30 ft", 
    heal: true, concentration: false,
    
  });

  /* ════════════════════════════
     LIVELLO 3
  ════════════════════════════ */
  registerSpellData("Fireball", {
    baseDie: "8d6", upcastDie: "1d6",
    range: "150 ft", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Lightning Bolt", {
    baseDie: "8d6", upcastDie: "1d6",
    range: "Self", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Mass Healing Word", {
    baseDie: "2d4", upcastDie: "1d4",
    range: "60 ft", 
    heal: true, concentration: false,
    
  });

  /* ════════════════════════════
     LIVELLO 4
  ════════════════════════════ */
  registerSpellData("Ice Storm", {
    baseDie: "2d8+4d6", upcastDie: "1d8",
    range: "300 ft", 
    heal: false, concentration: false,
    
  });

  /* ════════════════════════════
     LIVELLO 5
  ════════════════════════════ */
  registerSpellData("Cone of Cold", {
    baseDie: "8d8", upcastDie: "1d8",
    range: "Self", 
    heal: false, concentration: false,
    
  });
  registerSpellData("Mass Cure Wounds", {
    baseDie: "5d8", upcastDie: "1d8",
    range: "60 ft", 
    heal: true, concentration: false,
    
  });

  /* ════════════════════════════
     LIVELLO 6
  ════════════════════════════ */
  registerSpellData("Chain Lightning", {
    baseDie: "10d8", upcastDie: "1d8",
    range: "150 ft", 
    heal: false, concentration: false,
    
  });

  /* ════════════════════════════
     LIVELLO 7
  ════════════════════════════ */
  registerSpellData("Fire Storm", {
    baseDie: "7d10", upcastDie: "",
    range: "150 ft", 
    heal: false, concentration: false,
    
  });

  /* ════════════════════════════
     LIVELLO 8
  ════════════════════════════ */
  registerSpellData("Sunburst", {
    baseDie: "12d6", upcastDie: "",
    range: "150 ft", 
    heal: false, concentration: false,
    
  });

  /* ════════════════════════════
     LIVELLO 9
  ════════════════════════════ */
  registerSpellData("Meteor Swarm", {
    baseDie: "40d6", upcastDie: "",
    range: "1 mile", 
    heal: false, concentration: false,
    
  });
  registerSpellData("False Life", {
    baseDie: "2d4+4", upcastDie: "5",
    range: "Self", 
    heal: false, concentration: false,
    
  });
})();

}

