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

// XPHB Crafter "Fast Crafting" table: gear craftable with each Artisan's Tools.
// The sheet panel only shows rows for tools the character is proficient with.
const FAST_CRAFTING_TABLE = [
  { tool: "Carpenter's Tools", items: ['Ladder', 'Torch'] },
  { tool: "Leatherworker's Tools", items: ['Crossbow Bolt Case', 'Map or Scroll Case', 'Pouch'] },
  { tool: "Mason's Tools", items: ['Block and Tackle'] },
  { tool: "Potter's Tools", items: ['Jug', 'Lamp'] },
  { tool: "Smith's Tools", items: ['Ball Bearings', 'Bucket', 'Caltrops', 'Grappling Hook', 'Iron Pot'] },
  { tool: "Tinker's Tools", items: ['Bell', 'Shovel', 'Tinderbox'] },
  { tool: "Weaver's Tools", items: ['Basket', 'Rope', 'Net', 'Tent'] },
  { tool: "Woodcarver's Tools", items: ['Club', 'Greatclub', 'Quarterstaff'] },
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
        // Description lives in the Features tab; the card drives the create panel.
        entries: [],
        noDescription: true,
        detailType: 'createdItems',
        detail: () => ({
          flag: 'fastcraft',
          tagLabel: 'Fast Crafting',
          toolGroups: FAST_CRAFTING_TABLE,
          max: 1,
          emptyHint: "Gain proficiency with an Artisan's Tools to craft gear here.",
        }),
      },
    ]);
  }
}
