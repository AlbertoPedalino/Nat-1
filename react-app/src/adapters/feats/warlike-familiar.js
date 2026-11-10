import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Warlike Familiar',
    actions: [{
      name: 'Intercept Attack', cat: 'reaction', 
    }],
  });
}
