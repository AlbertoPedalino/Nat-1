import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Otherworldly Familiar',
    effects: [{
      type: 'reminder',
      note: 'Otherworldly Familiar: the familiar gains a selected Resistance and can move through creatures and objects.',
    }],
  });
}
