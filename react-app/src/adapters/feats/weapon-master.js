import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter, getWeaponMasteryChoiceNames, allItemsDb } = createAdapterBindings(registry, context);

  // Weapon Master (XPHB 2024): the mastery property of one kind of Simple or
  // Martial weapon — read from the item data, as a Fighter's picks are.
  registerFeatAdapter("Weapon Master", function (feat, ctx = {}) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        weaponMastery: {
          keySuffix: "weapon_mastery",
          label: "Weapon Mastery",
          weapons: getWeaponMasteryChoiceNames(ctx.items, allItemsDb),
        },
      },
    };
  });
}
