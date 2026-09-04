import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Soothing Familiar',
    effects: [{
      type: 'reminder',
      note: 'Healing Beacon: nearby allies can treat healing-die rolls of 1 or 2 as 3 while the familiar is within 120 feet.',
    }],
  });
}
