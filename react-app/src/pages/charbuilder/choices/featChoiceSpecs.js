import {
  ABILITIES,
  ABILITY_ABBREVIATIONS,
  ALL_LANGUAGES,
  ALL_TOOLS,
  SKILL_NAMES,
  STANDARD_LANGUAGES,
} from '../../../shared/content/rulesVocabulary.js';
import {
  mixedSkillToolOptions,
  specPush,
  choiceSpecsFromProficiencyBlocks,
} from './choiceSpecHelpers.js';

// The choices a feat asks for in the builder: its choiceUi, ability and
// proficiency choose-blocks, and spell picks from additionalSpells.

function parseChooseString(value) {
  const out = { level: null, levels: [], classes: [], schools: [] };
  String(value || '').split('|').forEach((part) => {
    const [k, v] = part.split('=');
    if (k === 'level') {
      out.levels = String(v || '').split(';').map(Number).filter(Number.isFinite);
      out.level = out.levels.length === 1 ? out.levels[0] : null;
    }
    if (k === 'class') out.classes = String(v || '').split(';').map((s) => s.trim()).filter(Boolean);
    if (k === 'school') out.schools = String(v || '').split(';').map((s) => s.trim()).filter(Boolean);
  });
  return out;
}

function collectChooseEntries(obj) {
  const entries = [];
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (item && typeof item === 'object') {
        if (item.choose) entries.push(item);
        else entries.push(...collectChooseEntries(item));
      }
    });
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach((v) => entries.push(...collectChooseEntries(v)));
  }
  return entries;
}

function additionalSpellChoices(feat, slotKey, entryIdx) {
  const out = [];
  const additional = Array.isArray(feat?.additionalSpells) ? feat.additionalSpells : [];
  if (!additional.length) return out;
  const hasSelectedEntry = entryIdx != null && !Number.isNaN(Number(entryIdx));
  if (additional.length > 1 && !hasSelectedEntry) return out;
  const resolvedEntryIdx = hasSelectedEntry ? Number(entryIdx) : 0;
  const grant = additional[Math.min(resolvedEntryIdx, additional.length - 1)];
  if (!grant) return out;
  let chooseCounter = 0;
  ['known', 'innate', 'prepared', 'expanded'].forEach((mode) => {
    const section = grant[mode];
    if (!section || typeof section !== 'object') return;
    Object.entries(section).forEach(([scope, list]) => {
      const chooseEntries = collectChooseEntries(list);
      if (!chooseEntries.length) return;
      const grouped = new Map();
      chooseEntries.forEach((entry) => {
        if (!entry?.choose) return;
        const parsed = parseChooseString(entry.choose);
        const sigKey = `${parsed.levels.join(',') || '?'}|${parsed.classes.join(',')}|${parsed.schools.join(',')}`;
        const current = grouped.get(sigKey) || { ...parsed, count: 0 };
        current.count += entry.count || 1;
        grouped.set(sigKey, current);
      });
      grouped.forEach((value, key) => {
        out.push({
          key: `${slotKey}_spell_${mode}_${chooseCounter}_${key}`,
          label: `${feat.name} - ${value.level === 0 ? 'Cantrip' : value.level != null ? `Spell Lv.${value.level}` : `Spell Lv.${value.levels.join('/')}`}${value.classes.length ? ` (${value.classes.join('/')})` : ''}`,
          type: 'spell_choice',
          count: value.count,
          spellFilter: {
            spellLevels: value.levels.length ? value.levels : undefined,
            classes: value.classes,
            schools: value.schools.length ? value.schools : undefined,
          },
          classes: value.classes,
        });
        chooseCounter += 1;
      });
    });
  });
  return out;
}

export function featChoiceSpecs(feat, options = {}) {
  const specs = [];
  const ui = feat?.choiceUi || {};
  const slotKey = options.slotKey || `feat_${feat.name}`;
  const asiUi = ui.abilityScoreIncrease;
  if (asiUi) {
    const from = asiUi.from?.length ? asiUi.from : ABILITIES;
    const modes = asiUi.modes || ['single'];
    if (modes.includes('double') || modes.includes('split')) {
      specs.push({ key: `${slotKey}_first_asi`, label: `${feat.name} Ability +1`, type: 'ability_choice', from, count: 1 });
      specs.push({ key: `${slotKey}_second_asi`, label: `${feat.name} Ability +1`, type: 'ability_choice', from, count: 1 });
    } else {
      specs.push({ key: `${slotKey}_asi`, label: `${feat.name} Ability`, type: 'ability_choice', from, count: 1 });
    }
  } else if (feat?.ability?.some((block) => block.choose)) {
    specs.push({ key: `${slotKey}_asi`, label: `${feat.name} Ability`, type: 'ability_choice', from: ABILITIES, count: 1 });
  }
  if (ui.skillOrToolProficiency) {
    specs.push({
      key: `${slotKey}_${ui.skillOrToolProficiency.keySuffix || 'skill_tool'}`,
      label: ui.skillOrToolProficiency.label || `${feat.name} Skills or Tools`,
      type: 'skill_tool_choice',
      options: ui.skillOrToolProficiency.options || mixedSkillToolOptions(),
      from: (ui.skillOrToolProficiency.options || mixedSkillToolOptions()).map((option) => option.value || option.label).filter(Boolean),
      count: ui.skillOrToolProficiency.count || 1,
    });
  }
  if (ui.skillProficiency) specs.push({ key: `${slotKey}_skill`, label: `${feat.name} Skill`, type: 'skill_choice', from: SKILL_NAMES, count: ui.skillProficiency.count || 1 });
  if (ui.toolProficiency) specs.push({ key: `${slotKey}_tool`, label: ui.toolProficiency.label || `${feat.name} Tool`, type: 'generic_choice', from: ui.toolProficiency.options || ALL_TOOLS, count: ui.toolProficiency.count || 1 });
  if (ui.languageProficiency) specs.push({ key: `${slotKey}_language`, label: `${feat.name} Language`, type: 'language_choice', from: STANDARD_LANGUAGES, count: ui.languageProficiency.count || 1 });
  if (ui.spellAbility) {
    specs.push({
      key: `${slotKey}_${ui.spellAbility.keySuffix || 'spell_ability'}`,
      label: ui.spellAbility.label || `${feat.name} Spellcasting Ability`,
      type: 'ability_choice',
      options: ui.spellAbility.options || ABILITIES.map((stat) => ({ value: stat, label: ABILITY_ABBREVIATIONS[stat] || stat })),
      count: 1,
    });
  }
  if (ui.damageType) specs.push({ key: `${slotKey}_damage`, label: ui.damageType.label || `${feat.name} Damage Type`, type: 'generic_choice', from: ui.damageType.options || [], count: 1 });
  if (ui.weaponProficiency) specs.push({ key: `${slotKey}_weapon`, label: ui.weaponProficiency.label || `${feat.name} Weapon`, type: 'generic_choice', from: ui.weaponProficiency.options || [], count: ui.weaponProficiency.count || 1 });
  if (ui.instrumentProficiency) specs.push({ key: `${slotKey}_${ui.instrumentProficiency.keySuffix || 'instrument'}`, label: ui.instrumentProficiency.label || `${feat.name} Instrument`, type: 'generic_choice', from: ui.instrumentProficiency.instruments || ui.instrumentProficiency.options || [], count: ui.instrumentProficiency.count || 1 });
  if (ui.weaponMastery) specs.push({
    key: `${slotKey}_${ui.weaponMastery.keySuffix || 'weapon_mastery'}`,
    label: ui.weaponMastery.label || `${feat.name} Weapon Mastery`,
    type: 'generic_choice',
    from: ui.weaponMastery.weapons || ui.weaponMastery.options || [],
    count: ui.weaponMastery.count || 1,
  });

  if (!ui.skillProficiency && !ui.skillOrToolProficiency) {
    specs.push(...choiceSpecsFromProficiencyBlocks({
      blocks: feat?.skillProficiencies,
      slotKey,
      keySuffix: 'skill',
      label: `${feat.name} Skill`,
      type: 'skill_choice',
      fallbackFrom: SKILL_NAMES,
    }));
  }

  if (!ui.toolProficiency && !ui.instrumentProficiency && !ui.skillOrToolProficiency) {
    specs.push(...choiceSpecsFromProficiencyBlocks({
      blocks: feat?.toolProficiencies,
      slotKey,
      keySuffix: 'tool',
      label: `${feat.name} Tool`,
      type: 'generic_choice',
      fallbackFrom: ALL_TOOLS,
    }));
  }

  if (!ui.languageProficiency) {
    specs.push(...choiceSpecsFromProficiencyBlocks({
      blocks: feat?.languageProficiencies,
      slotKey,
      keySuffix: 'language',
      label: `${feat.name} Language`,
      type: 'language_choice',
      fallbackFrom: ALL_LANGUAGES,
    }));
  }

  if (!ui.weaponProficiency && !ui.weaponMastery) {
    specs.push(...choiceSpecsFromProficiencyBlocks({
      blocks: feat?.weaponProficiencies,
      slotKey,
      keySuffix: 'weapon',
      label: `${feat.name} Weapon`,
      type: 'generic_choice',
      fallbackFrom: [],
    }));
  }

  if (!ui.skillOrToolProficiency) {
    specs.push(...choiceSpecsFromProficiencyBlocks({
      blocks: feat?.skillToolLanguageProficiencies,
      slotKey,
      keySuffix: 'skill_tool_language',
      label: `${feat.name} Proficiency`,
      type: 'skill_tool_choice',
      fallbackFrom: [...SKILL_NAMES, ...ALL_TOOLS, ...ALL_LANGUAGES],
    }));
  }

  (Array.isArray(feat?.expertise) ? feat.expertise : (feat?.expertise ? [feat.expertise] : []))
    .forEach((block, index) => {
      if (!block || typeof block !== 'object') return;
      const choose = block.choose || {};
      const count = Number(block.anyProficientSkill || choose.count || 0);
      if (!count) return;
      specPush(specs, {
        key: `${slotKey}_expertise_${index}`,
        label: `${feat.name} Expertise`,
        type: 'expertise',
        from: choose.from || SKILL_NAMES,
        count,
        requiresProficiency: true,
      });
    });

  specs.push(...additionalSpellChoices(feat, slotKey, options.entryIdx));
  return specs;
}
