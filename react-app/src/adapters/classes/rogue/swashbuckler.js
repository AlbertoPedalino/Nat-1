import { createAdapterBindings } from '../../adapterBindings.js';

// Swashbuckler (World of Warcraft, 2024 rules).
export default function install(registry, context = {}) {
  const { registerSubclassSheetEffects } = createAdapterBindings(registry, context);

  registerSubclassSheetEffects('Rogue_Swashbuckler', [
    // Rakish Audacity: Charisma modifier added to Initiative.
    { type: 'initiativeAbilityMod', ability: 'cha', minLevel: 3, note: 'Rakish Audacity' },
  ]);
}
