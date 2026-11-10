import { createAdapterBindings } from '../../adapterBindings.js';
import {
  REPLICATE_BUCKETS,
  collectReplicatePlanChoices,
  hasImprovedArmorer,
  isReplicateArmorItem,
  replicateChoiceLabel,
  resolveReplicateChoice,
} from '../../../shared/character/inventory/replicateMagicItem.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import {
  MAGIC_ITEM_TINKER_DRAIN_RESOURCE,
  MAGIC_ITEM_TINKER_TRANSMUTE_RESOURCE,
} from '../../../shared/character/inventory/magicItemTinker.js';
import { titleCase } from '../../../shared/ui/textCase.js';
import { matchKey, stripSource } from '../../../shared/content/nameKeys.js';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';
import { stripMarkup } from '../../../shared/content/markupText.js';

const _REPLICATE_BUCKET_LABEL = Object.fromEntries(REPLICATE_BUCKETS.map((b) => [b.id, b.label]));

export default function install(registry, context = {}) {
  const {
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetEffects,
    registerClassSheetChoiceMeta,
  } = createAdapterBindings(registry, context);

// ── EFA (Eberron: Forge of the Artificer) — Replicate Magic Item ──
// Single source of truth for the whole feature. Each tier unlocks at `level`,
// raising known `plans` and simultaneously-active `items`, and adding a block
// of replicable item plans. Derived accessors below read this table, so adding
// a tier or item only requires touching this array.
const _ARTIFICER_REPLICATE_TIERS = [
  {
    level: 2,
    plans: 4,
    items: 2,
    pool: [
      'Alchemy Jug',
      'Bag of Holding',
      'Cap of Water Breathing',
      _REPLICATE_BUCKET_LABEL['common-any'],
      'Goggles of Night',
      'Manifold Tool',
      _REPLICATE_BUCKET_LABEL['repeating-shot'],
      _REPLICATE_BUCKET_LABEL['returning-weapon'],
      'Rope of Climbing',
      'Sending Stones',
      'Shield +1',
      'Wand of Magic Detection',
      'Wand of Secrets',
      'Wand of the War Mage +1',
      _REPLICATE_BUCKET_LABEL['weapon-plus-1'],
      'Wraps of Unarmed Power +1',
    ],
  },
  {
    level: 6,
    plans: 5,
    items: 3,
    pool: [
      _REPLICATE_BUCKET_LABEL['armor-plus-1'],
      'Boots of Elvenkind',
      'Boots of the Winding Path',
      'Cloak of Elvenkind',
      'Cloak of the Manta Ray',
      'Dazzling Weapon',
      'Eyes of Charming',
      'Eyes of Minute Seeing',
      'Gloves of Thievery',
      'Helm of Awareness',
      'Lantern of Revealing',
      'Mind Sharpener',
      'Necklace of Adaptation',
      'Pipes of Haunting',
      'Repulsion Shield',
      'Ring of Swimming',
      'Ring of Water Walking',
      'Sentinel Shield',
      'Spell-Refueling Ring',
      'Wand of Magic Missiles',
      'Wand of Web',
      'Weapon of Warning',
    ],
  },
  {
    level: 10,
    plans: 6,
    items: 4,
    pool: [
      'Armor of Resistance',
      'Dagger of Venom',
      'Elven Chain',
      'Ring of Feather Falling',
      'Ring of Jumping',
      'Ring of Mind Shielding',
      'Shield +2',
      'Wand of the War Mage +2',
      _REPLICATE_BUCKET_LABEL['weapon-plus-2'],
      'Wraps of Unarmed Power +2',
      _REPLICATE_BUCKET_LABEL['uncommon-wondrous'],
    ],
  },
  {
    level: 14,
    plans: 7,
    items: 5,
    pool: [
      _REPLICATE_BUCKET_LABEL['armor-plus-2'],
      'Arrow-Catching Shield',
      'Flame Tongue',
      _REPLICATE_BUCKET_LABEL['rare-wondrous'],
      'Ring of Free Action',
      'Ring of Protection',
      'Ring of the Ram',
    ],
  },
  {
    level: 18,
    plans: 8,
    items: 6,
    pool: [],
  },
];

function _artificerReplicateTier(level) {
  let current = { plans: 0, items: 0 };
  for (const tier of _ARTIFICER_REPLICATE_TIERS) {
    if (level >= tier.level) current = tier;
  }
  return current;
}

function _artificerPlansKnownAtLevel(level) {
  return level < 2 ? 0 : _artificerReplicateTier(level).plans;
}

// EFA Replicate Magic Item: "Magic Items" column (active items at once).
function _artificerActiveItemsAtLevel(level) {
  return level < 2 ? 0 : _artificerReplicateTier(level).items;
}

function _artificerPlanPoolForLevel(level) {
  const pool = [];
  for (const tier of _ARTIFICER_REPLICATE_TIERS) {
    if (level >= tier.level) pool.push(...tier.pool);
  }
  return [...new Set(pool)];
}

registerClassAdapter("Artificer", function (cls, lv, specs) {
  if (lv >= 2) {
    specs.push({
      key: 'artificer_replicate_magic_item_plans',
      label: 'Replicate Magic Item (Plans Known)',
      type: 'replicate_magic_item',
      from: _artificerPlanPoolForLevel(lv),
      count: _artificerPlansKnownAtLevel(lv),
      level: 2
    });
  }

  // Lv 4/8/12/16 feat slots are the generic `feat_asi_lvN` ones injected from
  // the class's Ability Score Improvement features, like every other class.
  if (lv >= 19) {
    specs.push({
      key: 'artificer_epic_boon',
      label: 'Epic Boon / General Feat',
      type: 'feat_cat',
      categories: ['EB', 'G'],
      count: 1,
      level: 19
    });
  }
});

// EFA Tinker's Magic item list (created with Tinker's Tools, vanish at Long Rest).
const _TINKER_MAGIC_ITEMS = [
  'Ball Bearings', 'Basket', 'Bedroll', 'Bell', 'Blanket', 'Block and Tackle',
  'Glass Bottle', 'Bucket', 'Caltrops', 'Candle', 'Crowbar', 'Flask',
  'Grappling Hook', 'Hunting Trap', 'Jug', 'Lamp', 'Manacles', 'Net', 'Oil',
  'Paper', 'Parchment', 'Pole', 'Pouch', 'Rope', 'Sack', 'Shovel',
  'Iron Spikes', 'String', 'Tinderbox', 'Torch', 'Vial',
];

registerClassSheetActions("Artificer", [
  {
    "name": "Tinker's Magic",
    "cat": "action",
    "minLevel": 1,
    // Description resolves from the official EFA feature entries (auto-lookup by
    // name) and renders in the card's collapsible disclosure above the create panel.
    detailType: 'createdItems',
    detail: () => ({
      flag: 'tinker',
      tagLabel: "Tinker's Magic",
      items: _TINKER_MAGIC_ITEMS,
      maxAbility: 'int',
      minMax: 1,
      searchable: true,
      maxHeight: 280,
      emptyHint: 'No items available.',
    }),
  },
  {
    "name": "Replicate Magic Item",
    "cat": "action",
    "minLevel": 2,
    // Description resolves from the official EFA feature entries (auto-lookup by
    // name) and shows in the card's collapsible disclosure above the create panel.
    detailType: 'createdItems',
    detail: ({ action, character }) => {
      const lv = Number(action?.ownerLevel || primaryClassLevel(character));
      const plans = collectReplicatePlanChoices(character);
      const baseMax = _artificerActiveItemsAtLevel(lv);
      const improvedArmorer = hasImprovedArmorer(character);
      return {
        flag: 'replicated',
        tagLabel: 'Replicated Items',
        items: plans,
        itemLabel: replicateChoiceLabel,
        resolveItem: (plan, itemsDb) => resolveReplicateChoice(plan, itemsDb)?.item || null,
        requireResolvedItem: true,
        max: baseMax + (improvedArmorer ? 1 : 0),
        maxPerItem: 1,
        canAddItem: improvedArmorer
          ? ({ resolvedItem, inventory }) => {
              if (isReplicateArmorItem(resolvedItem)) return true;
              const activeNonArmor = (inventory || []).reduce((sum, item) => (
                Array.isArray(item?.flags)
                && item.flags.includes('replicated')
                && !isReplicateArmorItem(item)
                  ? sum + Math.max(1, Number(item.qty || 1))
                  : sum
              ), 0);
              return activeNonArmor < baseMax;
            }
          : null,
        emptyHint: 'No plans chosen yet — pick them in the character builder.',
      };
    }
  },
  {
    "name": "Magic Item Tinker",
    "cat": "action",
    "minLevel": 6,
    detailType: 'magicItemTinker',
  },
  {
    "name": "Flash of Genius",
    "cat": "reaction",
    "resKey": "flash_genius",
    "minLevel": 7
  },
  {
    "name": "Spell-Storing Item",
    "cat": "action",
    "minLevel": 11
  }
]);
registerClassSheetResources("Artificer", [
  {
    key: MAGIC_ITEM_TINKER_DRAIN_RESOURCE,
    name: "Drain Magic Item",
    recharge: "LR",
    max: 1,
    minLevel: 6,
  },
  {
    key: MAGIC_ITEM_TINKER_TRANSMUTE_RESOURCE,
    name: "Transmute Magic Item",
    recharge: "LR",
    max: 1,
    minLevel: 6,
  },
  {
    "key": "flash_genius",
    "name": "Flash of Genius",
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1
  }
]);
registerClassSheetEffects("Artificer", [
  { type: "attunementSlots", value: 4, minLevel: 10, note: "Magic Item Adept." },
  { type: "attunementSlots", value: 5, minLevel: 14, note: "Magic Item Savant." },
  { type: "attunementSlots", value: 6, minLevel: 18, note: "Magic Item Master." },
]);
registerClassSheetChoiceMeta("Artificer", {
  sectionTitle: "Artificer Choices",
  labels: {
    artificer_replicate_magic_item_plans: "Replicate Magic Item Plans",
    armorer_model: "Armor Model",
    alchemist_bonus_tool: "Tools of the Trade (Alchemist)",
    armorer_bonus_tool: "Tools of the Trade (Armorer)",
    artillerist_bonus_tool: "Tools of the Trade (Artillerist)",
    battlesmith_bonus_tool: "Tools of the Trade (Battle Smith)",
    cartographer_bonus_tool: "Tools of the Trade (Cartographer)",
  },
  isChoiceKey: (key) => {
    const k = String(key || "");
    if (/^artificer_feat_lv\d+$/i.test(k)) return false;
    if (/^(artificer_|alchemist_|armorer_|artillerist_|battlesmith_|cartographer_)/i.test(k)) return true;
    if (/^auto_(primary|ec\d+)_feat_/i.test(k)) return true;
    return false;
  },
  getLabel: (key) => {
    const k = String(key || "");
    if (/^auto_(primary|ec\d+)_feat_/i.test(k)) {
      let s = k.replace(/^auto_(primary|ec\d+)_feat_/i, "");
      s = s.replace(/_skill_\d+$/i, " Skill Proficiency");
      s = s.replace(/_lang_\d+$/i, " Language");
      s = s.replace(/_tool_\d+$/i, " Tool Proficiency");
      s = s.replace(/_stl_\d+_\d+$/i, " Proficiency Choice");
      s = s.replace(/_weaponProficiencies_\d+$/i, " Weapon Proficiency");
      s = s.replace(/_armorProficiencies_\d+$/i, " Armor Proficiency");
      s = s.replace(/_opt_\d+$/i, " Option");
      return titleCase(s).trim();
    }
    return titleCase(k.replace(/^.*?_/, "")).trim();
  },
  normalizeChoiceValue: (value, key) => {
    const k = String(key || "");
    const raw = stripSource(stripMarkup(value));
    if (!raw) return "";
    if (baseChoiceKey(k) === "artificer_replicate_magic_item_plans") {
      return replicateChoiceLabel(raw);
    }
    if (k === "armorer_model" || /^auto_(primary|ec\d+)_feat_.*_opt_\d+$/i.test(k)) {
      const nk = matchKey(raw);
      if (nk === "dreadnaught" || nk.includes("dreadnought")) return "Dreadnought";
      if (nk.includes("guardian")) return "Guardian";
      if (nk.includes("infiltrator")) return "Infiltrator";
    }
    return raw;
  },
});

}
