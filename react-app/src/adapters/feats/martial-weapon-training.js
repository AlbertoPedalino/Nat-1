import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);


  if (typeof registerFeatAdapter !== "function") return;

  var _MARTIAL_WEAPONS = [
    "Battleaxe", "Flail", "Glaive", "Greataxe", "Greatsword",
    "Halberd", "Lance", "Longsword", "Maul", "Morningstar",
    "Pike", "Rapier", "Scimitar", "Shortsword", "Trident",
    "War Pick", "Warhammer", "Whip",
    "Blowgun", "Hand Crossbow", "Heavy Crossbow", "Longbow", "Net"
  ];

  registerFeatAdapter("Martial Weapon Training", function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        weaponMastery: {
          keySuffix: "martial_weapon_prof",
          label: "Martial Weapon Proficiency",
          weapons: _MARTIAL_WEAPONS
        }
      }
    };
  });

}

