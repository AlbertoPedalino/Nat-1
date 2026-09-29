import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Familiar Friend',
    adapt: withSpellAbilityChoice,
    actions: [{
      name: 'Helpful Friend', icon: 'hand-helping', cat: 'special', uses: 'PB / LR', resKey: 'familiar_friend_helpful',
    }],
    resources: [{ key: 'familiar_friend_helpful', name: 'Helpful Friend', icon: 'hand-helping', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
