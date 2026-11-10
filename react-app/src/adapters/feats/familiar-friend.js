import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Familiar Friend',
    actions: [{
      name: 'Helpful Friend', cat: 'special', resKey: 'familiar_friend_helpful',
    }],
    resources: [{ key: 'familiar_friend_helpful', name: 'Helpful Friend', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
