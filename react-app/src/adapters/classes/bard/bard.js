import { createAdapterBindings } from '../../adapterBindings.js';

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
    allItemsDb,
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
registerClassAdapter("Bard", function (cls, lv, specs, ctx = {}) {
  const skills = typeof SKILLS !== 'undefined'
    ? SKILLS.map(function (s) { return s.n; })
    : ['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'];

  if (lv >= 2) {
    specs.push({
      key: 'bard_expertise_lv2',
      label: 'Expertise (Bard Lv.2)',
      type: 'expertise',
      from: skills,
      candidateSource: 'proficientSkills',
      count: 2,
      level: 2,
      requiresProficiency: true
    });
  }
  if (lv >= 9) {
    specs.push({
      key: 'bard_expertise_lv9',
      label: 'Expertise (Bard Lv.9)',
      type: 'expertise',
      from: skills,
      candidateSource: 'proficientSkills',
      count: 2,
      level: 9,
      requiresProficiency: true
    });
  }
  if (lv >= 10) {
    specs.push({
      key: 'bard_magical_secrets_lv10',
      label: 'Magical Secrets (Lv.10)',
      type: 'spell_choice',
      spellFilter: { spellLevel: null, classes: ['Bard', 'Cleric', 'Druid', 'Wizard'] },
      count: 2,
      level: 10
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'bard_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Bard", [
  { name: "Bardic Inspiration", icon: "", cat: "bonus",  uses: "CHA mod / SR", resKey: "bardic_insp",
    damageFormula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const die = lv >= 15 ? 12 : lv >= 10 ? 10 : lv >= 5 ? 8 : 6;
      return `1d${die}`;
    },
    damageKind: "utility",
    damageButtonLabel: ({ formula }) => String(formula || ""),
    rollLabelPrefix: "Bardic Inspiration",    desc: "Bonus Action: give one Bardic Inspiration die to a creature within 60 ft (not yourself). Die size: d6 (lv.1–4), d8 (lv.5–9), d10 (lv.10–14), d12 (lv.15–20). Recipient adds the die to one attack roll, ability check, or saving throw within 10 minutes. Recharge: Short Rest (lv.5+) or Long Rest." },
  { name: "Jack of All Trades", icon: "", cat: "action", uses: "Passive", minLevel: 2,
  passive: true,
    desc: "Add half your Proficiency Bonus (rounded down) to any ability check that doesn't already use your Proficiency Bonus." },
  { name: "Expertise",          icon: "", cat: "action", uses: "Passive", minLevel: 2,
  passive: true,
    desc: "Choose two skill proficiencies: double your Proficiency Bonus for those skills (lv.2). Choose two more at lv.9." },
  { name: "Font of Inspiration",icon: "", cat: "action", uses: "Spend slot → 1 BI", resKey: "bard_font_insp", minLevel: 5,
    controller: true,
    desc: "Expend one spell slot (no action required) to regain one expended use of Bardic Inspiration. Can't exceed your maximum." },
  { name: "Countercharm",       icon: "", cat: "bonus", uses: "Bonus Action", minLevel: 7,
    desc: "As a Bonus Action, start a performance that lasts until the start of your next turn. While it lasts, you and friendly creatures within 30 ft who can hear you have Immunity to the Charmed and Frightened conditions." },
  { name: "Magical Secrets",    icon: "", cat: "action", uses: "Passive", minLevel: 10,
  passive: true,
    desc: "Your prepared spell list expands to include Cleric, Druid, and Wizard spells. When you gain a Bard level that increases your prepared spells, the new prepared spells can come from the Bard, Cleric, Druid, or Wizard spell lists." },
  { name: "Superior Inspiration", icon: "", cat: "action", uses: "Passive", minLevel: 18,
  passive: true,
    desc: "When you roll Initiative and have fewer than 2 uses of Bardic Inspiration remaining, you regain uses until you have 2." },
  { name: "Words of Creation",  icon: "", cat: "action", uses: "Passive", minLevel: 20,
  passive: true,
    desc: "You learn Power Word Heal and Power Word Kill. Both are always prepared and count as Bard spells. You can cast each once per turn." },
]);

registerClassSheetResources("Bard", [
  { key: 'bardic_insp', name: 'Bardic Inspiration', icon: 'music', recharge: 'SR',
    srMinLevel: 5,
    actionName: 'Bardic Inspiration',
    max: (lv, { cha } = {}) => Math.max(1, cha ?? 0) },
  { key: 'bard_font_insp', name: 'Font of Inspiration', icon: 'refresh-ccw', recharge: 'SR',
    srMinLevel: 5,
    actionName: 'Font of Inspiration',
    max: (lv) => lv >= 5 ? 1 : 0 },
]);

registerResourceSideEffect('bard_font_insp', ({ C, resources }) => {
  const chaScore = Number(C?.finalScores?.cha ?? 10);
  const chaMod = Math.floor((chaScore - 10) / 2);
  const biMax = Math.max(1, chaMod);
  const biCur = Number(resources?.['bardic_insp'] ?? biMax);
  if (biCur >= biMax) {
    return { type: 'recover_resource', targetResourceKey: 'bardic_insp', amount: 0, label: 'Font of Inspiration' };
  }
  return {
    type: 'spend_slot_recover_resource',
    targetKey: 'bardic_insp',
    recoverAmount: 1,
    recoverMax: biMax,
    label: 'Font of Inspiration',
    note: 'Expend a spell slot to regain one use of Bardic Inspiration (no action required).',
  };
});

registerClassSheetEffects("Bard", [
  {
    type: "jackOfAllTrades",
    key: "bard_jack_of_all_trades",
    label: "Jack of All Trades",
    minLevel: 2,
    appliesTo: "abilityChecksWithoutProficiency",
    bonus: "halfProficiencyRoundedDown",
    note: "Add half your Proficiency Bonus, rounded down, to ability checks that don't already use your Proficiency Bonus.",
  },
  {
    type: "initiativeRecovery",
    key: "bard_superior_inspiration",
    label: "Superior Inspiration",
    minLevel: 18,
    resourceKey: "bardic_insp",
    floor: 2,
    note: "When you roll Initiative and have fewer than 2 uses of Bardic Inspiration, you regain uses until you have 2.",
  },
  {
    type: "spellGrant",
    key: "bard_words_of_creation",
    label: "Words of Creation",
    minLevel: 20,
    note: "Power Word Heal and Power Word Kill are always prepared. When you cast either, you can target a second creature within 10 ft of the first.",
  },
]);

registerClassSheetChoiceMeta("Bard", {
  sectionTitle: "Bard Choices",
  labels: {
    bard_instruments: "Musical Instruments",
    bard_expertise_lv2: "Expertise (Lv.2)",
    bard_expertise_lv9: "Expertise (Lv.9)",
    bard_magical_secrets_lv10: "Magical Secrets (Lv.10)",
    subclass_lore_bonus_skills: "Bonus Proficiencies (Lore)",
    subclass_lore_magical_discoveries: "Magical Discoveries (Lore)",
    bard_instrument_1: "Musical Instrument 1",
    bard_instrument_2: "Musical Instrument 2",
    bard_instrument_3: "Musical Instrument 3",
    bard_expertise_1: "Expertise 1",
    bard_expertise_2: "Expertise 2",
    bard_expertise_3: "Expertise 3",
    bard_expertise_4: "Expertise 4",
    bard_magical_secrets_1: "Magical Secrets 1",
    bard_magical_secrets_2: "Magical Secrets 2",
    subclass_lore_bonus_skill_1: "Bonus Proficiency 1 (Lore)",
    subclass_lore_bonus_skill_2: "Bonus Proficiency 2 (Lore)",
    subclass_lore_bonus_skill_3: "Bonus Proficiency 3 (Lore)",
    subclass_lore_magical_discovery_1: "Magical Discoveries 1 (Lore)",
    subclass_lore_magical_discovery_2: "Magical Discoveries 2 (Lore)",
    subclass_swords_fighting_style: "Fighting Style (Swords)",
    subclass_moon_primal_lore_skill: "Primal Lore Skill (Moon)",
    subclass_moon_primal_lore_cantrip: "Primal Lore Cantrip (Moon)",
  },
  isChoiceKey: (key) => {
    const k = String(key || "");
    if (/^bard_epic_boon$/i.test(k)) return false;
    if (/^bard_/i.test(k)) return true;
    if (/^subclass_(lore|swords|moon)_/i.test(k)) return true;
    return false;
  },
  getLabel: (key) => {
    const k = String(key || "");
    return k
      .replace(/^bard_/, "")
      .replace(/^subclass_(lore|swords|moon)_/, "")
      .replace(/_/g, " ")
      .replace(/\b[a-z]/g, c => c.toUpperCase())
      .trim();
  },
  normalizeChoiceValue: (value) => {
    return String(value || "")
      .split("|")[0]
      .replace(/\{@\w+ /g, "")
      .replace(/\}/g, "")
      .trim();
  },
});
// [SheetRuntime] END

}

