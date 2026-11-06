import { WEAPON_FILTERS } from '../../shared/character/inventory/weaponFilters.js';
import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Rules of the weapon they are used with: a tag and the official text on
  // those weapon cards (sheetEffects.getWeaponNotes), not a card with nothing
  // to use.
  registerFeatSheetEffects("Tavern Brawler", [
    { type: "unarmedStrike", face: 4, note: "Tavern Brawler: Enhanced Unarmed Strike" },
    {
      type: "weaponNote",
      weaponFilter: WEAPON_FILTERS.UNARMED,
      tag: "Push",
      title: "Push",
      note: "Tavern Brawler: Push",
      entries: [
        "When you hit a creature with an Unarmed Strike as part of the Attack action on your turn, you can deal damage to the target and also push it 5 feet away from you. You can use this benefit only once per turn."
      ]
    }
  ]);
}
