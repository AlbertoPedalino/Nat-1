import { WEAPON_FILTERS } from '../../shared/character/inventory/weaponFilters.js';
import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Rules of the weapon they are used with: a tag and the official text on
  // those weapon cards (sheetEffects.getWeaponNotes), not a card with nothing
  // to use.
  registerFeatSheetEffects("Shield Master", [
    {
      type: "weaponNote",
      weaponFilter: WEAPON_FILTERS.SHIELD_MELEE,
      tag: "Shield Bash",
      title: "Shield Bash",
      note: "Shield Master: Shield Bash",
      entries: [
        "If you attack a creature within 5 feet of you as part of the Attack action and hit with a Melee weapon, you can immediately bash the target with your Shield if it's equipped, forcing the target to make a Strength saving throw (DC 8 plus your Strength modifier and Proficiency Bonus). On a failed save, you either push the target 5 feet from you or cause it to have the Prone condition (your choice). You can use this benefit only once on each of your turns."
      ]
    }
  ]);
}
