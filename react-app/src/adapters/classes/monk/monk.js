import { createAdapterBindings } from '../../adapterBindings.js';
import { levelTable, MARTIAL_ARTS_DIE } from '../../classAdapterHelpers.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';
import { ABILITIES } from '../../../shared/content/rulesVocabulary.js';

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetEffects,
  } = createAdapterBindings(registry, context);

registerClassAdapter("Monk", function (cls, lv, specs) {
  if (lv >= 1) {
    specs.push({
      key: 'monk_tool_proficiency',
      label: 'Tool Proficiency (Tools or Instrument)',
      type: 'generic_choice',
      from: (_ARTISAN_TOOLS || []).concat(_MUSICAL_INSTRUMENTS || []),
      count: 1,
      level: 1
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'monk_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

registerClassSheetEffects("Monk", [
  { type: "acFormula", key: "monk_unarmored_defense", label: "Unarmored Defense", base: 10, abilities: ["dex", "wis"], allowShield: false, minLevel: 1, requiresNoArmor: true },
  { type: "speed", value: (level) => level >= 18 ? 30 : level >= 14 ? 25 : level >= 10 ? 20 : level >= 6 ? 15 : 10,
    minLevel: 2, requiredArmor: { body: false, shield: false }, note: "Unarmored Movement" },
  { type: "saveProficiency", abilities: ABILITIES, minLevel: 14, note: "Disciplined Survivor" },
  // Martial Arts: the Unarmed Strike die grows with Monk level and may use Dexterity.
  ...MARTIAL_ARTS_DIE.map(([minLevel, face]) => (
    { type: "unarmedStrike", face, dexterity: true, minLevel, note: "Martial Arts" }
  )),
]);

registerClassSheetActions("Monk", [
  {
    name: 'Uncanny Metabolism',
    cat: 'special',
    resKey: 'uncanny_metabolism',
    minLevel: 2
  },
  {
    name: 'Flurry of Blows',
    cat: 'bonus',
    resKey: 'ki',
    minLevel: 2,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => `2d${levelTable(ownerLevel, MARTIAL_ARTS_DIE)}` }]
  },
  {
    name: 'Patient Defense',
    cat: 'bonus',
    resKey: 'ki',
    minLevel: 2
  },
  {
    name: 'Step of the Wind',
    cat: 'bonus',
    resKey: 'ki',
    minLevel: 2
  },
  {
    name: 'Deflect Attacks',
    cat: 'reaction',
    resKey: 'ki',
    minLevel: 3,
    rollers: [{ kind: 'utility', formula: ({ ownerLevel, character }) => {
      const lv = Number(ownerLevel || 1);
      const dex = Number(finalAbilityModifier(character, 'dex') || 0);
      const total = dex + lv;
      return withModifier('1d10', total);
    }, label: ({ formula }) => `${String(formula || '')} reduce`, title: 'Reduction' }],
    rollLabelPrefix: 'Deflect Attacks'
  },
  {
    name: 'Stunning Strike',
    cat: 'special',
    resKey: 'ki',
    minLevel: 5
  },
  {
    name: 'Disciplined Survivor',
    cat: 'special',
    resKey: 'ki',
    minLevel: 14
  },
  {
    name: 'Superior Defense',
    cat: 'special',
    resKey: 'ki',
    minLevel: 18
  }
]);
registerClassSheetResources("Monk", [
  {
    key: 'ki',
    name: 'Focus Points',
    recharge: 'SR',
    max: (lv) => lv,
    pool: true,
    track: 'used'
  },
  {
    key: 'uncanny_metabolism',
    name: 'Uncanny Metabolism',
    recharge: 'LR',
    minLevel: 2,
    max: () => 1
  }
]);

}

