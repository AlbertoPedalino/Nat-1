import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Rogue_Thief", function (cls, lv, specs) {});

registerSubclassSheetActions("Rogue_Thief", [
  {
    "name": "Fast Hands",
    "icon": "",
    "cat": "bonus",
    "uses": "Unlimited",
    "minLevel": 3
  },
  {
    "name": "Supreme Sneak",
    "icon": "",
    "cat": "action",
    "uses": "Cunning Strike option",
    "minLevel": 9
  }
]);

registerSubclassSheetEffects("Rogue_Thief", [

  { type: "speed", speedType: "climb", value: "walking", minLevel: 3, note: "Second-Story Work." },
  { type: "jumpUsesDex", minLevel: 3, note: "Second-Story Work." },
  { type: "attunementSlots", value: 4, minLevel: 13, note: "Use Magic Device." },
]);

}

