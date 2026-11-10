import { installFeatAdapter } from '../featAdapterHelpers.js';

// World of Warcraft origin feat: Ocean Born, a Swim Speed equal to your Speed.
export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Child of the Sea',
    effects: [{ type: 'speed', speedType: 'swim', value: 'walking', note: 'Ocean Born' }],
  });
}
