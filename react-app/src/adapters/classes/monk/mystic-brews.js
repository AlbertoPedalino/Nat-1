import { createAdapterBindings } from '../../adapterBindings.js';

// Warrior of Mystic Brews (World of Warcraft).
export default function install(registry, context = {}) {
  const { registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);

  registerSubclassSheetActions('Monk_Mystic Brews', [
    { name: 'Redirect Attack', cat: 'reaction', resKey: 'ki', minLevel: 6 },
  ]);
  registerSubclassSheetEffects('Monk_Mystic Brews', [
    { type: 'skill', values: ['Performance'], minLevel: 3, note: 'Bonus Proficiencies' },
    { type: 'tool', values: ["Brewer's Supplies"], minLevel: 3, note: 'Bonus Proficiencies' },
  ]);
}
