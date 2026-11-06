import { createAdapterBindings } from '../../adapterBindings.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetEffects,
  } = createAdapterBindings(registry, context);
  const getMod = context?.getMod;
  const getFinal = context?.getFinal;

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
  // Martial Arts: the Unarmed Strike die grows with Monk level and may use Dexterity.
  { type: "unarmedStrike", face: 6, dexterity: true, uses: "Martial Arts", minLevel: 1, note: "Martial Arts" },
  { type: "unarmedStrike", face: 8, dexterity: true, uses: "Martial Arts", minLevel: 5, note: "Martial Arts" },
  { type: "unarmedStrike", face: 10, dexterity: true, uses: "Martial Arts", minLevel: 11, note: "Martial Arts" },
  { type: "unarmedStrike", face: 12, dexterity: true, uses: "Martial Arts", minLevel: 17, note: "Martial Arts" },
]);

// [SheetRuntime] START
registerClassSheetActions("Monk", [
  {
    name: 'Uncanny Metabolism',
    icon: '',
    cat: 'special',
    uses: '1 / LR',
    resKey: 'uncanny_metabolism',
    minLevel: 2
  },
  {
    name: 'Flurry of Blows',
    icon: '',
    cat: 'bonus',
    uses: '1 Focus Point',
    resKey: 'ki',
    minLevel: 2,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const die = lv >= 17 ? 12 : lv >= 11 ? 10 : lv >= 5 ? 8 : 6;
      return `2d${die}`;
    } }]
  },
  {
    name: 'Patient Defense',
    icon: '',
    cat: 'bonus',
    uses: 'Free / 1 Focus Point',
    resKey: 'ki',
    minLevel: 2
  },
  {
    name: 'Step of the Wind',
    icon: '',
    cat: 'bonus',
    uses: 'Free / 1 Focus Point',
    resKey: 'ki',
    minLevel: 2
  },
  {
    name: 'Deflect Attacks',
    icon: '',
    cat: 'reaction',
    uses: 'Free / 1 FP redirect',
    resKey: 'ki',
    minLevel: 3,
    rollers: [{ kind: 'utility', formula: ({ ownerLevel, character }) => {
      const lv = Number(ownerLevel || 1);
      const dex = typeof getMod === 'function' && typeof getFinal === 'function'
        ? Number(getMod(getFinal(character, 'dex')) || 0)
        : 0;
      const total = dex + lv;
      return withModifier('1d10', total);
    }, label: ({ formula }) => `${String(formula || '')} reduce`, title: 'Reduction' }],
    rollLabelPrefix: 'Deflect Attacks'
  },
  {
    name: 'Stunning Strike',
    icon: '',
    cat: 'special',
    uses: '1 Focus Point',
    resKey: 'ki',
    minLevel: 5
  },
  {
    name: 'Disciplined Survivor',
    icon: '',
    cat: 'special',
    uses: '1 Focus Point',
    resKey: 'ki',
    minLevel: 14
  },
  {
    name: 'Superior Defense',
    icon: '',
    cat: 'special',
    uses: '3 Focus Points',
    resKey: 'ki',
    minLevel: 18
  }
]);
registerClassSheetResources("Monk", [
  {
    key: 'ki',
    name: 'Focus Points',
    icon: 'orbit',
    recharge: 'SR',
    max: (lv) => lv,
    pool: true,
    track: 'used'
  },
  {
    key: 'uncanny_metabolism',
    name: 'Uncanny Metabolism',
    icon: 'zap',
    recharge: 'LR',
    minLevel: 2,
    max: () => 1
  }
]);
// [SheetRuntime] END

}

