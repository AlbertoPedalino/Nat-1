import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Ranger_Hunter", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_hunter_prey',
      label: "Hunter's Prey (swappable on rest)",
      type: 'generic_choice',
      from: ['Colossus Slayer', 'Horde Breaker'],
      count: 1,
      level: 3
    });
  }
  if (lv >= 7) {
    specs.push({
      key: 'subclass_hunter_defensive',
      label: 'Defensive Tactics (swappable on rest)',
      type: 'generic_choice',
      from: ['Escape the Horde', 'Multiattack Defense'],
      count: 1,
      level: 7
    });
  }
});

registerSubclassSheetActions("Ranger_Hunter", [
  {
    "name": "Superior Hunter's Prey",
    "icon": "",
    "cat": "attack",
    "uses": "1 / turn",
    "minLevel": 11
  },
  {
    "name": "Superior Hunter's Defense",
    "icon": "",
    "cat": "reaction",
    "uses": "At will",
    "minLevel": 15
  }
]);

registerSubclassSheetEffects("Ranger_Hunter", [

  { type: "damageRider", minLevel: 3, note: "Hunter's Prey choice." },
  { type: "defenseReaction", minLevel: 7, note: "Defensive Tactics choice." },
  { type: "cleaveDamage", minLevel: 11, note: "Superior Hunter's Prey." },
  { type: "damageResistanceReaction", minLevel: 15, note: "Superior Hunter's Defense." },
]);

}

