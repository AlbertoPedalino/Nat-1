import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Druid_Sea", function (cls, lv, specs) {});

registerSubclassSheetActions("Druid_Sea", [
  {
    "name": "Wrath of the Sea",
    "icon": "",
    "cat": "bonus",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 3
  },
  {
    "name": "Stormborn",
    "icon": "",
    "cat": "action",
    "uses": "While Wrath active",
    "minLevel": 10
  },
  {
    "name": "Oceanic Gift",
    "icon": "",
    "cat": "bonus",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 14
  }
]);

registerSubclassSheetEffects("Druid_Sea", [

  { type: "speed", speedType: "swim", value: "walking", minLevel: 6, note: "Aquatic Affinity." },
  { type: "speed", speedType: "fly", value: "walking", situational: true, minLevel: 10, note: "Stormborn while Wrath of the Sea is active." },
  { type: "resistance", damageTypes: ["Cold", "Lightning", "Thunder"], minLevel: 10, note: "Stormborn while Wrath of the Sea is active." },

]);

}

