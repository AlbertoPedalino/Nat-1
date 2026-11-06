import { WEAPON_FILTERS } from '../../shared/character/inventory/weaponFilters.js';
import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Rules of the weapon they are used with: a tag and the official text on
  // those weapon cards (sheetEffects.getWeaponNotes), not a card with nothing
  // to use.
  registerFeatSheetEffects("Defensive Duelist", [
    {
      type: "weaponNote",
      weaponFilter: WEAPON_FILTERS.FINESSE,
      tag: "Parry",
      title: "Parry",
      note: "Defensive Duelist: Parry",
      entries: [
        "If you're holding a Finesse weapon and another creature hits you with a melee attack, you can take a Reaction to add your Proficiency Bonus to your Armor Class, potentially causing the attack to miss you. You gain this bonus to your AC against melee attacks until the start of your next turn."
      ]
    }
  ]);
}
