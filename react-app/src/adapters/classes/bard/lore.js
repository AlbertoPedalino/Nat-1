import { createAdapterBindings } from '../../adapterBindings.js';
import { SKILL_NAMES } from '../../../shared/content/rulesVocabulary.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Bard_Lore", function (cls, lv, specs) {
  if (lv >= 3) {
    const allSkills = SKILL_NAMES;

    [1, 2, 3].forEach(function (i) {
      specs.push({
        key: 'subclass_lore_bonus_skill_' + i,
        label: 'Bonus Proficiency ' + i + ' (Lore)',
        type: 'skill_choice',
        from: allSkills,
        count: 1,
        level: 3,
        candidateSource: 'proficientSkills',
        excludeAlreadyProficient: true
      });
    });
  }
  if (lv >= 6) {
    specs.push({ key: 'subclass_lore_magical_discovery_1', label: 'Magical Discoveries 1 (Lore Lv.6)', type: 'spell_choice', spellFilter: { spellLevels: [0, 1, 2, 3], classes: ['Cleric', 'Druid', 'Wizard'] }, count: 1, level: 6 });
    specs.push({ key: 'subclass_lore_magical_discovery_2', label: 'Magical Discoveries 2 (Lore Lv.6)', type: 'spell_choice', spellFilter: { spellLevels: [0, 1, 2, 3], classes: ['Cleric', 'Druid', 'Wizard'] }, count: 1, level: 6 });
  }
});

registerSubclassSheetActions("Bard_Lore", [
  { name: "Cutting Words", icon: "", cat: "reaction", uses: "With Bardic Insp.", minLevel: 3 },
  { name: "Peerless Skill", icon: "", cat: "action", uses: "With Bardic Insp.", minLevel: 14 },
]);

registerSubclassSheetEffects("Bard_Lore", [

  { type: "skillProficiency", count: 3, minLevel: 3, note: "Bonus Proficiencies." },
  { type: "reactionPenalty", minLevel: 3, note: "Cutting Words: subtract Bardic Inspiration die from enemy roll/damage." },
  { type: "selfInspiration", minLevel: 14, note: "Peerless Skill." },
]);

}

