import { WEAPON_FILTERS } from '../../shared/character/inventory/weaponFilters.js';
import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Rules of the weapon they are used with: a tag and the official text on
  // those weapon cards (sheetEffects.getWeaponNotes), not a card with nothing
  // to use.
  registerFeatSheetEffects("Crossbow Expert", [
    {
      type: "weaponNote",
      weaponFilter: WEAPON_FILTERS.LIGHT_CROSSBOW,
      tag: "Dual Wielding",
      title: "Dual Wielding",
      note: "Crossbow Expert: Dual Wielding",
      entries: [
        "When you make the extra attack of the Light property, you can add your ability modifier to the damage of the extra attack if that attack is with a crossbow that has the Light property and you aren't already adding that modifier to the damage."
      ]
    }
  ]);
}
