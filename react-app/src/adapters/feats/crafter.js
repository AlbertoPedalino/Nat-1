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

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Crafter', [
      {
        name: 'Crafter',
        icon: 'tool',
        cat: 'action',
        uses: 'Passive',
        passive: true,
        desc: "Proficient with three Artisan's Tools; 20% discount on nonmagical gear you buy; craft items faster during a Long Rest.",
      },
    ]);
  }
}
