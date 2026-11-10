import { installFeatAdapter } from '../featAdapterHelpers.js';

// World of Warcraft origin feat.
export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arathi Heritage',
    effects: [{ type: 'advantage', target: 'save', conditions: ['Charmed'], note: 'Fey Ancestry' }],
  });
}
