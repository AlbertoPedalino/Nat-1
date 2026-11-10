import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Elemental Familiar',
    actions: [{
      name: 'Energy Pulse', cat: 'bonus', 
      rollers: [{ kind: 'damage', formula: '2d4', label: 'Elemental damage' }],
    }],
  });
}
