import { WEAPON_FILTERS } from '../../shared/character/inventory/weaponFilters.js';
import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Rules of the weapon they are used with: a tag and the official text on
  // those weapon cards (sheetEffects.getWeaponNotes), not a card with nothing
  // to use.
  registerFeatSheetEffects("Polearm Master", [
    {
      type: "weaponNote",
      weaponFilter: WEAPON_FILTERS.POLEARM,
      tag: "PAM",
      title: "Pole Strike",
      note: "Polearm Master: Pole Strike",
      entries: [
        "Immediately after you take the Attack action and attack with a Quarterstaff, a Spear, or a weapon that has the Heavy and Reach properties, you can use a Bonus Action to make a melee attack with the opposite end of the weapon. The weapon deals Bludgeoning damage, and the weapon's damage die for this attack is a d4."
      ]
    },
    {
      type: "weaponNote",
      weaponFilter: WEAPON_FILTERS.POLEARM,
      tag: "PAM",
      title: "Reactive Strike",
      note: "Polearm Master: Reactive Strike",
      entries: [
        "While you're holding a Quarterstaff, a Spear, or a weapon that has the Heavy and Reach properties, you can take a Reaction to make one melee attack against a creature that enters the reach you have with that weapon."
      ]
    }
  ]);
}
