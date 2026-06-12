import { createAdapterBindings } from '../../adapterBindings.js';
import {
  REPLICATE_BUCKETS,
  replicateChoiceLabel,
  resolveReplicateChoice,
} from '../../../shared/character/replicateMagicItem.js';

const _REPLICATE_BUCKET_LABEL = Object.fromEntries(REPLICATE_BUCKETS.map((b) => [b.id, b.label]));

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    _GAMING_SETS,
    _VEHICLE_TOOLS,
    _STD_LANGS,
    _EXOTIC_LANGS,
    _ALL_LANGS,
    _ALL_TOOLS,
    registerClassAdapter,
    getClassAdapter,
    registerSubclassAdapter,
    getSubclassAdapter,
    registerSpeciesAdapter,
    getSpeciesAdapter,
    registerFeatAdapter,
    getFeatAdapter,
    registerClassSheetActions,
    getClassSheetActions,
    registerSubclassSheetActions,
    getSubclassSheetActions,
    registerSpeciesSheetActions,
    getSpeciesSheetActions,
    registerFeatSheetActions,
    getFeatSheetActions,
    registerClassSheetResources,
    getClassSheetResources,
    registerSubclassSheetResources,
    getSubclassSheetResources,
    registerSpeciesSheetResources,
    getSpeciesSheetResources,
    registerFeatSheetResources,
    getFeatSheetResources,
    registerClassSheetEffects,
    getClassSheetEffects,
    registerSubclassSheetEffects,
    getSubclassSheetEffects,
    registerSpeciesSheetEffects,
    getSpeciesSheetEffects,
    registerFeatSheetEffects,
    getFeatSheetEffects,
    registerClassRuntimeConfig,
    getClassRuntimeConfig,
    registerSubclassRuntimeConfig,
    getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig,
    getSpeciesRuntimeConfig,
    registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta,
    getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta,
    getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta,
    registerSubclassSheetCommonChoiceMeta,
    registerSpeciesSheetCommonChoiceMeta,
    registerItemFlagDef,
    getItemFlagDef,
    getAllItemFlagDefs,
    registerWeaponAbilityOverride,
    getWeaponAbilityOverrides,
    registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter,
    getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter,
    getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies,
    getClassSheetProficiencies,
    registerSubclassSheetProficiencies,
    getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies,
    getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers,
    getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers,
    getSpeciesSheetSpellModifiers,
    registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus,
    getSpeciesSheetHpBonus,
    registerClassAtWillSpells,
    getClassAtWillSpells,
    registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants,
    registerResourceSideEffect,
    getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider,
    registerGlobalClassAdapter,
    getGlobalClassAdapters,
    registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter,
    getGlobalFeatAdapters,
    registerGlobalSpellAdapter,
    getGlobalSpellAdapters,
    registerGlobalItemAdapter,
    getGlobalItemAdapters,
    registerCantripData,
    getCantripData,
    registerCantripDataModifier,
    getCantripDataModifiers,
    registerSpellData,
    getSpellData,
    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
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
      type: 'generic_choice',
      from: _artificerPlanPoolForLevel(lv),
      count: _artificerPlansKnownAtLevel(lv),
      level: 2
    });
  }

  [4, 8, 12, 16].forEach(function (featLv) {
    if (lv >= featLv) {
      specs.push({
        key: 'artificer_feat_lv' + featLv,
        label: 'Feat (Artificer Lv.' + featLv + ')',
        type: 'feat_cat',
        categories: ['G'],
        count: 1,
        level: featLv
      });
    }
  });

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

// [SheetRuntime] START
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
    "icon": "",
    "cat": "action",
    "uses": "INT mod / LR",
    "minLevel": 1,
    // Description (incl. Mending cantrip) lives in the Features tab; the card
    // only drives the interactive create panel.
    "entries": [],
    "noDescription": true,
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
    "icon": "",
    "cat": "action",
    "uses": "After Long Rest",
    "minLevel": 2,
    // Description lives in the Features tab — the Action card only drives the
    // interactive create/remove panel, so no rich-text entries here.
    "entries": [],
    "noDescription": true,
    detailType: 'createdItems',
    detail: ({ action, character }) => {
      const lv = Number(action?.ownerLevel || character?.classLevel || character?.level || 1);
      const choices = character?.choices || {};
      let plans = [];
      for (const [k, v] of Object.entries(choices)) {
        if (k.replace(/^mc\d+_/, '') === 'artificer_replicate_magic_item_plans') {
          plans = Array.isArray(v) ? v : (v ? [v] : []);
          break;
        }
      }
      return {
        flag: 'replicated',
        tagLabel: 'Replicated Items',
        items: plans,
        itemLabel: replicateChoiceLabel,
        resolveItem: (plan, itemsDb) => resolveReplicateChoice(plan, itemsDb)?.item || null,
        requireResolvedItem: true,
        max: _artificerActiveItemsAtLevel(lv),
        maxPerItem: 1,
        emptyHint: 'No plans chosen yet — pick them in the character builder.',
      };
    }
  },
  {
    "name": "Flash of Genius",
    "icon": "",
    "cat": "reaction",
    "uses": "INT mod / LR",
    "resKey": "flash_genius",
    "minLevel": 7,
    "desc": "When you or a creature you can see within 30 ft fails an ability check or saving throw, add your Intelligence modifier to the roll."
  },
  {
    "name": "Spell-Storing Item",
    "icon": "",
    "cat": "action",
    "uses": "1 active item",
    "minLevel": 11,
    "desc": "After a Long Rest, store one Artificer spell (level 1-3) in a weapon or spellcasting focus item so it can be cast repeatedly from that item."
  },
  {
    "name": "Soul of Artifice",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 20,
    "desc": "Cheat Death: when reduced to 0 HP, you can disintegrate replicated Uncommon or Rare magic items to remain at 20 HP per item. Magical Guidance: after a Short Rest, regain all Flash of Genius uses if you are attuned to at least one magic item."
  }
]);
registerClassSheetResources("Artificer", [
  {
    "key": "flash_genius",
    "name": "Flash of Genius",
    "icon": "brain",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0)
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
      return s.replace(/_/g, " ").replace(/\b[a-z]/g, c => c.toUpperCase()).trim();
    }
    return k.replace(/^.*?_/, "").replace(/_/g, " ").replace(/\b[a-z]/g, c => c.toUpperCase()).trim();
  },
  normalizeChoiceValue: (value, key) => {
    const k = String(key || "");
    const raw = String(value || "").split("|")[0].replace(/\{@\w+ /g, "").replace(/\}/g, "").trim();
    if (!raw) return "";
    if (k.replace(/^mc\d+_/, "") === "artificer_replicate_magic_item_plans") {
      return replicateChoiceLabel(raw);
    }
    if (k === "armorer_model" || /^auto_(primary|ec\d+)_feat_.*_opt_\d+$/i.test(k)) {
      const nk = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (nk === "dreadnaught" || nk.includes("dreadnought")) return "Dreadnought";
      if (nk.includes("guardian")) return "Guardian";
      if (nk.includes("infiltrator")) return "Infiltrator";
    }
    return raw;
  },
});
// [SheetRuntime] END

// ── Choice key filter: which char.choices keys belong to Artificer ──
registerClassChoiceKeyFilter("Artificer", function (baseKey) {
  if (/^(artificer_|alchemist_|armorer_|artillerist_|battlesmith_|cartographer_)/i.test(baseKey)) return true;
  if (/^auto_(primary|ec\d+)_feat_/i.test(baseKey)) return true;
  return false;
});

// ── Choice label provider: human-readable label for each Artificer choice key ──
const _ARTIFICER_CHOICE_LABELS = {
  artificer_replicate_magic_item_plans: 'Replicate Magic Item Plans',
  armorer_model: 'Armor Model',
  alchemist_bonus_tool: 'Tools of the Trade (Alchemist)',
  armorer_bonus_tool: 'Tools of the Trade (Armorer)',
  artillerist_bonus_tool: 'Tools of the Trade (Artillerist)',
  battlesmith_bonus_tool: 'Tools of the Trade (Battle Smith)',
  cartographer_bonus_tool: 'Tools of the Trade (Cartographer)',
};
registerClassChoiceLabelProvider("Artificer", function (baseKey) {
  if (_ARTIFICER_CHOICE_LABELS[baseKey]) return _ARTIFICER_CHOICE_LABELS[baseKey];
  const _tc = (s) => String(s || '').replace(/_/g, ' ').replace(/\b[a-z]/g, c => c.toUpperCase()).trim();
  if (/^auto_(primary|ec\d+)_feat_/i.test(baseKey)) {
    let s = baseKey.replace(/^auto_(primary|ec\d+)_feat_/i, '');
    s = s.replace(/_skill_\d+$/i, ' Skill Proficiency');
    s = s.replace(/_lang_\d+$/i, ' Language');
    s = s.replace(/_tool_\d+$/i, ' Tool Proficiency');
    s = s.replace(/_stl_\d+_\d+$/i, ' Proficiency Choice');
    s = s.replace(/_weaponProficiencies_\d+$/i, ' Weapon Proficiency');
    s = s.replace(/_armorProficiencies_\d+$/i, ' Armor Proficiency');
    s = s.replace(/_opt_\d+$/i, ' Option');
    return _tc(s);
  }
  return _tc(baseKey.replace(/^.*?_/, ''));
});

}
