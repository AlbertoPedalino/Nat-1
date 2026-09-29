import { createAdapterBindings } from '../adapterBindings.js';
import { WEAPON_FILTERS } from '../../shared/character/inventory/weaponFilters.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetEffects } = createAdapterBindings(registry, context);

  if (typeof registerFeatSheetActions === "function") {
    // Card text = the feat's official "Hew" benefit only (entryName).
    registerFeatSheetActions("Great Weapon Master", [
      {
        name: "Hew",
        entryName: "Hew",
        icon: "swords",
        cat: "bonus",
        uses: "Bonus Action",
        desc: "Immediately after you score a Critical Hit with a Melee weapon or reduce a creature to 0 Hit Points with one, you can make one attack with the same weapon as a Bonus Action."
      }
    ]);
  }

  // Heavy Weapon Mastery (+PB damage) applies only to hits made as part of the
  // Attack action on your turn — not Hew or opportunity attacks — which
  // the sheet can't tell apart, so it is a reminder on Heavy weapon cards
  // (sheetEffects.getWeaponNotes) instead of a baked-in damage bonus.
  if (typeof registerFeatSheetEffects === "function") {
    registerFeatSheetEffects("Great Weapon Master", [
      {
        type: "weaponNote",
        weaponFilter: WEAPON_FILTERS.HEAVY,
        tag: "GWM",
        title: "Heavy Weapon Mastery",
        note: "Great Weapon Master: Heavy Weapon Mastery",
        entries: [
          "When you hit a creature with a weapon that has the Heavy property as part of the Attack action on your turn, you can cause the weapon to deal extra damage to the target. The extra damage equals your Proficiency Bonus."
        ]
      }
    ]);
  }
}
