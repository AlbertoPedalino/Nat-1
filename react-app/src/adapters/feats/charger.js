import { WEAPON_FILTERS } from '../../shared/character/inventory/weaponFilters.js';
import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Rules of the weapon they are used with: a tag and the official text on
  // those weapon cards (sheetEffects.getWeaponNotes), not a card with nothing
  // to use.
  registerFeatSheetEffects("Charger", [
    {
      type: "weaponNote",
      weaponFilter: [WEAPON_FILTERS.MELEE, WEAPON_FILTERS.UNARMED],
      tag: "Charge",
      title: "Charge Attack",
      note: "Charger: Charge Attack",
      entries: [
        "If you move at least 10 feet in a straight line toward a target immediately before hitting it with a melee attack roll as part of the Attack action, choose one of the following effects: gain a 1d8 bonus to the attack's damage roll, or push the target up to 10 feet away if it is no more than one size larger than you. You can use this benefit only once on each of your turns."
      ]
    }
  ]);
}
