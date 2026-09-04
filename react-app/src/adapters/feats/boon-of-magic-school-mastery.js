import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Boon of Magic School Mastery',
    actions: [
      { name: 'Rote Casting', icon: 'repeat', cat: 'action', uses: 'At will', desc: 'Cast the selected level 1 spell from the mastered school without a slot or components.' },
      { name: 'Signature Arcanum', icon: 'sparkles', cat: 'special', uses: '1 / LR', desc: 'Cast the selected level 7-or-lower spell from the mastered school once without a spell slot.' },
    ],
  });
}
