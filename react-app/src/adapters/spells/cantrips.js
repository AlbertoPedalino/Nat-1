import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerCantripData } = createAdapterBindings(registry, context);
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

  /* ── Damaging — attack roll ─────────────────────────────────── */
  registerCantripData("Fire Bolt", {
    range: "120 ft",
    
    
  });
  registerCantripData("Ray of Frost", {
    range: "60 ft",
    
    
  });
  registerCantripData("Eldritch Blast", {
    range: "120 ft",
    beamCount: function (lv) {
      var level = Number(lv || 1);
      if (level >= 17) return 4;
      if (level >= 11) return 3;
      if (level >= 5) return 2;
      return 1;
    },
  });
  registerCantripData("Chill Touch", {
    range: "Touch",
    
    
  });
  registerCantripData("Shocking Grasp", {
    range: "Touch",
    
    
  });
  registerCantripData("Produce Flame", {
    range: "30 ft",
    
    
  });
  registerCantripData("Thorn Whip", {
    range: "30 ft",
    
    
  });
  // `weaponAttack`: the attack is made with a weapon the character picks on the
  // spell card, which rolls that weapon's attack and damage (SpellEntry).
  registerCantripData("True Strike", {
    range: "Self",
    weaponAttack: true,
    
  });

  /* ── Damaging — saving throw ────────────────────────────────── */
  registerCantripData("Sacred Flame", {
    range: "60 ft",
    
    
  });
  registerCantripData("Toll the Dead", {
    range: "60 ft",
    
    
  });
  registerCantripData("Mind Sliver", {
    range: "60 ft",
    
    
  });
  registerCantripData("Poison Spray", {
    range: "30 ft",
    
    
  });
  registerCantripData("Vicious Mockery", {
    range: "60 ft",
    
    
  });
  registerCantripData("Acid Splash", {
    range: "60 ft",
    
    
  });
  registerCantripData("Thunderclap", {
    range: "5 ft",
    
    
  });

  /* ── Utility — no attack, no save ───────────────────────────── */
  registerCantripData("Blade Ward", {
    range: "Self",
    concentration: true,
    
  });
  registerCantripData("Guidance", {
    range: "Touch",
    concentration: true,
    utilityDie: "1d4",
    utilityLabel: "Bonus",
    
  });
  registerCantripData("Light", {
    range: "Touch",
    
    
  });
  registerCantripData("Mending", {
    range: "Touch",
    
    
  });
  registerCantripData("Message", {
    range: "120 ft",
    
    
  });
  registerCantripData("Prestidigitation", {
    range: "10 ft",
    
    
  });
  registerCantripData("Druidcraft", {
    range: "30 ft",
    
    
  });
  registerCantripData("Thaumaturgy", {
    range: "30 ft",
    
    
  });
  registerCantripData("Spare the Dying", {
    range: "15 ft",
    
    
  });
  registerCantripData("Dancing Lights", {
    range: "120 ft",
    
    
  });
  registerCantripData("Friends", {
    range: "Self",
    
    
  });
  registerCantripData("Minor Illusion", {
    range: "30 ft",
    
    
  });
  registerCantripData("Mage Hand", {
    range: "30 ft",
    
    
  });
  registerCantripData("Resistance", {
    range: "Touch",
    concentration: true,
    
  });
  registerCantripData("Shillelagh", {
    range: "Self",
    
    
  });
  registerCantripData("Word of Radiance", {
    range: "5 ft",
    
    
  });
})();

}

