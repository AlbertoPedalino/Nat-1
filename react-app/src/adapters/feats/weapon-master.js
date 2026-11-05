import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);


  if (typeof registerFeatAdapter !== "function") return;

  var _SIMPLE_WEAPONS = [
    "Club", "Dagger", "Greatclub", "Handaxe", "Javelin",
    "Light Hammer", "Mace", "Quarterstaff", "Sickle", "Spear",
    "Dart", "Light Crossbow", "Shortbow", "Sling"
  ];
  var _MARTIAL_WEAPONS = [
    "Battleaxe", "Flail", "Glaive", "Greataxe", "Greatsword",
    "Halberd", "Lance", "Longsword", "Maul", "Morningstar",
    "Pike", "Rapier", "Scimitar", "Shortsword", "Trident",
    "War Pick", "Warhammer", "Whip",
    "Blowgun", "Hand Crossbow", "Heavy Crossbow", "Longbow", "Net"
  ];

  registerFeatAdapter("Weapon Master", function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        weaponMastery: {
          keySuffix: "weapon_mastery",
          label: "Weapon Mastery",
          weapons: _SIMPLE_WEAPONS.concat(_MARTIAL_WEAPONS)
        }
      }
    };
  });

}

