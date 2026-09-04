import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Elemental Familiar',
    actions: [{
      name: 'Energy Pulse', icon: 'zap', cat: 'bonus', uses: "Familiar's Reaction",
      rollers: [{ kind: 'damage', formula: '2d4', label: 'Elemental damage' }],
      desc: 'Command your familiar within 120 feet to emit a 5-foot Emanation (Dexterity save), dealing 2d4 chosen elemental damage and knocking eligible creatures Prone.',
    }],
  });
}
