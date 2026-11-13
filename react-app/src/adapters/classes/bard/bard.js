import { createAdapterBindings } from '../../adapterBindings.js';
import { titleCase } from '../../../shared/ui/textCase.js';
import { choiceText } from '../../../shared/content/nameKeys.js';
import { SKILL_NAMES } from '../../../shared/content/rulesVocabulary.js';

export default function install(registry, context = {}) {
  const {
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetEffects,
    registerClassSheetChoiceMeta,
    registerResourceSideEffect,
  } = createAdapterBindings(registry, context);
registerClassAdapter("Bard", function (cls, lv, specs, ctx = {}) {
  const skills = SKILL_NAMES;

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

registerClassSheetActions("Bard", [
  { name: "Bardic Inspiration", cat: "bonus",  resKey: "bardic_insp",
    rollers: [{ kind: 'bonus', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const die = lv >= 15 ? 12 : lv >= 10 ? 10 : lv >= 5 ? 8 : 6;
      return `1d${die}`;
    } }],
    rollLabelPrefix: "Bardic Inspiration" },
  { name: "Font of Inspiration",cat: "action", resKey: "bard_font_insp", minLevel: 5,
    controller: true },
  { name: "Countercharm",       cat: "bonus", minLevel: 7 },
]);

registerClassSheetResources("Bard", [
  { key: 'bardic_insp', name: 'Bardic Inspiration', recharge: 'SR',
    srMinLevel: 5,
    actionName: 'Bardic Inspiration',
    max: 'abilityMod:cha', minMax: 1 },
  { key: 'bard_font_insp', name: 'Font of Inspiration', recharge: 'SR',
    srMinLevel: 5,
    actionName: 'Font of Inspiration',
    minLevel: 5, max: 1 },
]);

registerResourceSideEffect('bard_font_insp', ({ resources, resourceMax }) => {
  const biMax = Number(resourceMax?.bardic_insp ?? 1);
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
    return titleCase(k
      .replace(/^bard_/, "")
      .replace(/^subclass_(lore|swords|moon)_/, ""))
      .trim();
  },
  normalizeChoiceValue: (value) => choiceText(value),
});

}

