import { createAdapterBindings } from '../adapterBindings.js';

const ARTISAN_TOOLS_CHOICES = [
  "carpenter's tools",
  "leatherworker's tools",
  "mason's tools",
  "potter's tools",
  "smith's tools",
  "tinker's tools",
  "weaver's tools",
  "woodcarver's tools",
];

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  if (typeof registerFeatAdapter !== 'function') return;

  registerFeatAdapter('Crafter', function (feat) {
    const next = { ...feat };
    const hasToolBlock = Array.isArray(next.toolProficiencies)
      && next.toolProficiencies.some((block) => block && block.choose);
    if (!hasToolBlock) {
      next.toolProficiencies = [{
        choose: { from: ARTISAN_TOOLS_CHOICES, count: 3 },
      }];
    }
    if (!Array.isArray(next.entries) || !next.entries.length) {
      next.entries = ["You gain proficiency with three different Artisan's Tools of your choice."];
    }
    return next;
  });

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Crafter', [
      {
        key:      'crafter_fast_crafting',
        name:     'Fast Crafting',
        icon:     '',
        recharge: 'LR',
        max:      1,
      },
    ]);
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Crafter', [
      {
        name: 'Crafter: Discount',
        icon: '',
        cat: 'action',
        uses: 'Passive',
        passive: true,
        desc: "Whenever you buy a nonmagical item, you receive a 20 percent discount on it.",
      },
      {
        name: 'Fast Crafting',
        icon: '',
        cat: 'action',
        uses: '1 item / LR',
        resKey: 'crafter_fast_crafting',
        desc: "When you finish a Long Rest, craft one piece of gear from the Fast Crafting table (requires proficiency with the associated Artisan's Tools). Item lasts until you finish another Long Rest.",
      },
    ]);
  }
}
