import { STATS, STAT_LABELS } from '../constants.js';
import { installedRegistry } from '../../../adapters/index.js';
import { getPrimaryClassLevel } from '../logic/calculations.js';
import { backgroundOriginFeat } from '../../../shared/character/selectedFeats.js';
import { getMulticlassChoiceSpecs } from '../../../shared/character/multiclassProficiencies.js';
import { strip5eMarkup } from '../../../shared/character/spellEntries.js';
import {
  parseTypedProficiencyValue,
  splitTypedProficiencies,
  uniqueProficiencyLabels,
} from '../../../shared/character/typedProficiencies.js';
import {
  STANDARD_LANGUAGES,
  EXOTIC_LANGUAGES,
  ALL_LANGUAGES,
  SPECIAL_LANGUAGES,
  getLanguageOptions,
} from '../../../shared/character/languages.js';
import { filterByRequiredChoice } from '../../../shared/character/lineageMatch.js';

const ALL_SKILLS = ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'];
const STD_LANGS = STANDARD_LANGUAGES;
const EXOTIC_LANGS = EXOTIC_LANGUAGES;
const ALL_LANGS = ALL_LANGUAGES;
const ARTISAN_TOOLS = ["Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools", "Cartographer's Tools", "Cobbler's Tools", "Cook's Utensils", "Glassblower's Tools", "Jeweler's Tools", "Leatherworker's Tools", "Mason's Tools", "Painter's Supplies", "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools"];
const MUSICAL = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Hand Drum', 'Horn', 'Lute', 'Lyre', 'Pan Flute', 'Shawm', 'Viol'];
const GAMING = ['Dice Set', 'Dragonchess Set', 'Playing Card Set', 'Three-Dragon Ante Set'];
const VEHICLES = ['Vehicles (Land)', 'Vehicles (Water)'];
const ALL_TOOLS = [...ARTISAN_TOOLS, ...MUSICAL, ...GAMING, ...VEHICLES, "Thieves' Tools", 'Disguise Kit', 'Forgery Kit', "Herbalism Kit", "Navigator's Tools", "Poisoner's Kit"];

function mixedSkillToolOptions() {
  return [
    ...ALL_SKILLS.map((skill) => ({
      value: `skill:${skill}`,
      label: skill,
      group: 'Skills',
      kind: 'skill',
    })),
    ...ALL_TOOLS.map((tool) => ({
      value: `tool:${tool}`,
      label: tool,
      group: 'Tools',
      kind: 'tool',
    })),
  ];
}

export function parseSkillToolChoiceValue(value) {
  const parsed = parseTypedProficiencyValue(value);
  if (parsed.kind !== 'skill' && parsed.kind !== 'tool') return null;
  if (!parsed.label) return null;
  return { kind: parsed.kind, name: parsed.label };
}

export function splitSkillToolChoiceValues(values) {
  const split = splitTypedProficiencies(values);
  return {
    skills: uniqueProficiencyLabels(split.skill),
    tools: uniqueProficiencyLabels(split.tool),
  };
}
const CHOICE_KEYS = ['choose', 'any', 'anyTool', 'anyArtisansTool', 'anyMusicalInstrument', 'anyGamingSet', 'anyStandard', 'anyExotic'];

export function fixedKeysFromBlocks(blocks, excluded = CHOICE_KEYS) {
  return (blocks || []).flatMap((block) => Object.keys(block || {}).filter((key) => !excluded.includes(key) && block[key]));
}

function specSan(value) {
  return String(value || '')
    .replace(/\{@[^}]+\}/g, (match) => match.split('|')[0].replace(/\{@\w+ /, '').replace(/\}/g, ''))
    .split('|')[0]
    .trim();
}

function specUniq(values) {
  return [...new Set((values || []).map(specSan).filter(Boolean))];
}

function specPush(out, spec) {
  const from = specUniq(spec.from || []);
  if (!from.length && !spec.options?.length) return;
  out.push({ ...spec, from });
}

function choiceFromBlock(prefix, label, block, fallbackFrom = []) {
  if (!block || typeof block !== 'object') return null;
  const choose = block.choose;
  const hasChoiceIndicator = choose || block.any || block.anyTool || block.anyArtisansTool
    || block.anyMusicalInstrument || block.anyGamingSet || block.anyStandard || block.anyExotic;
  if (!hasChoiceIndicator) return null;
  let from = choose?.from || choose?.weighted?.from || null;
  let count = Number(choose?.count || choose?.weighted?.weights?.length || 0);
  if (!from?.length) {
    if (block.anyArtisansTool) from = ARTISAN_TOOLS;
    else if (block.anyMusicalInstrument) from = MUSICAL;
    else if (block.anyGamingSet) from = GAMING;
    else if (block.anyStandard) from = STD_LANGS;
    else if (block.anyExotic) from = EXOTIC_LANGS;
    else if (block.anyTool || block.any) from = fallbackFrom;
  }
  if (!count) {
    count = Number(
      block.anyTool
      || block.anyArtisansTool
      || block.anyMusicalInstrument
      || block.anyGamingSet
      || block.anyStandard
      || block.anyExotic
      || block.any
      || 1,
    );
  }
  if (typeof from === 'string') {
    const token = from.trim();
    from = token && !/^(any|classSkillList)$/i.test(token) ? [token] : fallbackFrom;
  }
  from = specUniq(from?.length ? from : fallbackFrom);
  if (!from?.length) return null;
  return { key: prefix, label, type: 'generic_choice', from, count };
}

function choiceSpecsFromProficiencyBlocks({ blocks, slotKey, keySuffix, label, type, fallbackFrom = [] }) {
  return (blocks || []).flatMap((block, index) => {
    const spec = choiceFromBlock(`${slotKey}_${keySuffix}_${index}`, label, block, fallbackFrom);
    return spec ? [{ ...spec, type }] : [];
  });
}

function asiLevelsFromClass(cls, classFeatures) {
  const out = new Set();
  const extractRefLevel = (ref) => {
    const parts = String(ref || '').split('|');
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      const value = parseInt(parts[index], 10);
      if (Number.isFinite(value) && value >= 1 && value <= 20) return value;
    }
    return null;
  };
  const walk = (node) => {
    if (!node) return;
    if (typeof node === 'string') {
      if (!/ability score improvement/i.test(node)) return;
      const lv = extractRefLevel(node);
      if (Number.isFinite(lv)) out.add(lv);
      return;
    }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node === 'object') {
      if (/ability score improvement/i.test(String(node.name || ''))) {
        const lv = Number(node.level);
        if (Number.isFinite(lv)) out.add(lv);
      }
      if (node.classFeature) walk(node.classFeature);
      if (node.subclassFeature) walk(node.subclassFeature);
    }
  };
  walk(cls?.classFeatures || []);
  (Array.isArray(classFeatures) ? classFeatures : []).forEach((feature) => {
    if (!feature || !/ability score improvement/i.test(String(feature.name || ''))) return;
    const lv = Number(feature.level);
    if (Number.isFinite(lv) && lv >= 1 && lv <= 20) out.add(lv);
  });
  return Array.from(out).filter((value) => Number.isFinite(value) && value >= 1 && value <= 20).sort((a, b) => a - b);
}

function hasFeatSlotAtLevel(specs, level, wantedCategories) {
  const wants = Array.isArray(wantedCategories) ? wantedCategories : [];
  return (specs || []).some((spec) => {
    if (!spec || spec.type !== 'feat_cat') return false;
    if (Number(spec.level || 0) !== Number(level || 0)) return false;
    if (!wants.length) return true;
    const cats = (spec.categories || []).map((cat) => String(cat || ''));
    return wants.some((want) => cats.some((cat) => cat === want || cat.startsWith(want)));
  });
}

function injectAsiFeatSlots(specs, cls, classLevel, classFeatures) {
  const lv = Number(classLevel || 0);
  if (!lv || !cls) return;
  const asiLvls = asiLevelsFromClass(cls, classFeatures).filter((value) => value <= lv);
  asiLvls.forEach((asiLv) => {
    const isEpic = asiLv >= 19;
    const cats = isEpic ? ['EB', 'G'] : ['G'];
    if (hasFeatSlotAtLevel(specs, asiLv, cats)) return;
    specs.push({
      key: `feat_asi_lv${asiLv}`,
      label: isEpic ? 'Epic Boon / General Feat' : `Feat (Lv.${asiLv})`,
      type: 'feat_cat',
      categories: cats,
      count: 1,
      level: asiLv,
    });
  });
}

function collectOptionsNodes(entries, out = []) {
  if (!entries) return out;
  if (Array.isArray(entries)) {
    entries.forEach((entry) => collectOptionsNodes(entry, out));
    return out;
  }
  if (typeof entries === 'object') {
    if (entries.type === 'options' && Array.isArray(entries.entries) && entries.entries.length) out.push(entries);
    if (entries.entries) collectOptionsNodes(entries.entries, out);
    if (entries.items) collectOptionsNodes(entries.items, out);
  }
  return out;
}

function optionEntryLabel(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return specSan(entry);
  if (entry.type === 'refClassFeature' && entry.classFeature) return specSan(entry.classFeature);
  if (entry.type === 'refSubclassFeature' && entry.subclassFeature) return specSan(entry.subclassFeature);
  if (entry.item) return specSan(entry.item);
  if (entry.name) return specSan(entry.name);
  return '';
}

function deriveFeatureChoiceSpecs(features, maxLv, keyPrefix) {
  const out = [];
  const list = (features || []).filter((feature) => !feature?.isReprinted && (Number(feature?.level) || 0) <= maxLv);
  list.forEach((feature, fi) => {
    const fname = specSan(feature.name || `Feature_${fi}`);
    const fkey = fname.replace(/[^a-zA-Z0-9]/g, '_') || `f_${fi}`;
    const baseKey = `${keyPrefix}_feat_${fkey}`;

    (feature.skillProficiencies || []).forEach((block, bi) => {
      const choose = block?.choose || {};
      const count = block?.any || choose.count || 0;
      if (!count) return;
      const from = choose.from || ALL_SKILLS;
      specPush(out, { key: `${baseKey}_skill_${bi}`, label: `${fname} — Skill`, type: 'skill_choice', count, level: feature.level || 1, from });
    });

    (feature.languageProficiencies || []).forEach((block, bi) => {
      const choose = block?.choose || {};
      const count = block?.anyStandard || block?.anyExotic || choose.count || 0;
      if (!count) return;
      let from = choose.from || [];
      if (!from.length) from = block?.anyExotic ? ALL_LANGS : STD_LANGS;
      specPush(out, { key: `${baseKey}_lang_${bi}`, label: `${fname} — Language`, type: 'language_choice', count, level: feature.level || 1, from });
    });

    (feature.toolProficiencies || []).forEach((block, bi) => {
      const choose = block?.choose || {};
      const count = block?.anyTool || block?.anyArtisansTool || block?.anyMusicalInstrument || block?.anyGamingSet || block?.any || choose.count || 0;
      if (!count) return;
      let from = choose.from || [];
      if (!from.length) {
        if (block?.anyArtisansTool) from = ARTISAN_TOOLS;
        else if (block?.anyMusicalInstrument) from = MUSICAL;
        else if (block?.anyGamingSet) from = GAMING;
        else from = ALL_TOOLS;
      }
      specPush(out, { key: `${baseKey}_tool_${bi}`, label: `${fname} — Tool`, type: 'generic_choice', count, level: feature.level || 1, from });
    });

    collectOptionsNodes(feature.entries, []).forEach((optNode, oi) => {
      const count = optNode?.count || 1;
      const from = specUniq((optNode.entries || []).map(optionEntryLabel).filter(Boolean));
      if (!count || !from.length) return;
      const fromLc = from.map((value) => String(value).toLowerCase());
      const allSkillsLc = ALL_SKILLS.map((value) => value.toLowerCase());
      const allLangsLc = ALL_LANGS.map((value) => value.toLowerCase());
      const isAllSkills = fromLc.every((value) => allSkillsLc.includes(value));
      const isAllLangs = fromLc.every((value) => allLangsLc.includes(value));
      const type = isAllSkills ? 'skill_choice' : isAllLangs ? 'language_choice' : 'generic_choice';
      specPush(out, { key: `${baseKey}_opt_${oi}`, label: `${fname} — Option`, type, count, level: feature.level || 1, from });
    });

    if (feature.expertise) {
      (Array.isArray(feature.expertise) ? feature.expertise : [feature.expertise]).forEach((ex, idx) => {
        if (ex?.choose) {
          specPush(out, {
            key: `${keyPrefix}_feat_exp_${fkey}_${idx}`,
            label: `${fname} — Expertise`,
            type: 'expertise',
            from: ex.choose.from || [],
            count: ex.choose.count || 1,
            level: feature.level || 1,
          });
        }
      });
    }
  });
  return out;
}

function dedupSpecs(specs) {
  const sorted = [...specs].sort((a, b) => (Number(a.level || 0) - Number(b.level || 0)));
  const byKey = new Set();
  const sigCount = new Map();
  const out = [];
  for (const spec of sorted) {
    if (!spec || !spec.key) continue;
    if (byKey.has(spec.key)) continue;
    const sig = [
      spec.type || '',
      spec.level || 0,
      spec.count || 1,
      JSON.stringify(specUniq(spec.from || [])),
      JSON.stringify(spec.spellFilter || {}),
    ].join('|');
    const isAuto = String(spec.key).includes('auto_');
    if (isAuto && (sigCount.get(sig) || 0) > 0) continue;
    byKey.add(spec.key);
    sigCount.set(sig, (sigCount.get(sig) || 0) + 1);
    out.push(spec);
  }
  return out;
}

function buildClassSpecs(cls, classLevel, options) {
  const specs = [];
  const prof = cls?.startingProficiencies || {};
  if (options.includeStartingProficiencies !== false) {
    (prof.skills || []).forEach((block, index) => {
      const spec = typeof block === 'object' ? choiceFromBlock(`${options.keyPrefix}class_skill_${index}`, 'Class Skill', block, ALL_SKILLS) : null;
      if (spec) specs.push({ ...spec, type: 'skill_choice', level: 1 });
    });
    [...(prof.tools || []), ...(prof.toolProficiencies || [])].forEach((block, index) => {
      const spec = typeof block === 'object' ? choiceFromBlock(`${options.keyPrefix}class_tool_${index}`, 'Class Tool', block, ALL_TOOLS) : null;
      if (spec) specs.push({ ...spec, type: 'generic_choice', level: 1 });
    });
    (prof.languages || []).forEach((block, index) => {
      const spec = typeof block === 'object' ? choiceFromBlock(`${options.keyPrefix}class_lang_${index}`, 'Class Language', block, STD_LANGS) : null;
      if (spec) specs.push({ ...spec, type: 'language_choice', level: 1 });
    });
  } else {
    specs.push(...getMulticlassChoiceSpecs(options.className, options.keyPrefix, cls));
  }

  const classAdapter = installedRegistry.getClassAdapter(options.className);
  if (typeof classAdapter === 'function') classAdapter(cls, classLevel, specs, options.context || {});

  if (options.subclassShortName) {
    const subclassAdapter = installedRegistry.getSubclassAdapter(options.className, options.subclassShortName);
    if (typeof subclassAdapter === 'function') subclassAdapter(cls, classLevel, specs, options.context || {});
  }

  injectAsiFeatSlots(specs, cls, classLevel, options.classFeatures || []);

  const allFeatures = [
    ...((options.classFeatures || []).filter((feature) => Number(feature?.level || 0) <= classLevel && !feature?.isReprinted)),
    ...(options.subclassShortName
      ? (options.subclassFeatures || []).filter((feature) => Number(feature?.level || 0) <= classLevel && !feature?.isReprinted && feature.subclassShortName === options.subclassShortName)
      : []),
  ];
  specs.push(...deriveFeatureChoiceSpecs(allFeatures, classLevel, `${options.keyPrefix}auto`));

  if (options.keyPrefix) {
    return specs.map((spec) => ({ ...spec, key: `${options.keyPrefix}${spec.key.startsWith(options.keyPrefix) ? spec.key.slice(options.keyPrefix.length) : spec.key}` }));
  }
  return specs;
}

export function classChoiceSpecs(character, context = {}) {
  const cls = character.cls;
  if (!cls) return [];
  const primaryLv = getPrimaryClassLevel(character);
  const all = [];
  const activeTab = character.activeClassTab || 0;

  // Only build specs for the active tab
  if (activeTab === 0) {
    // Primary class tab
    all.push(...buildClassSpecs(cls, primaryLv, {
      className: character.className,
      subclassShortName: character.subclassShortName,
      classFeatures: character.allFeatures || [],
      subclassFeatures: character.allSubFeatures || [],
      keyPrefix: '',
      context: { ...context, character },
    }));
  } else {
    // Multiclass tab
    const extra = character.extraClasses?.[activeTab - 1];
    if (extra?.cls) {
      const ecPrefix = `mc${activeTab - 1}_`;
      all.push(...buildClassSpecs(extra.cls, extra.level || 1, {
        className: extra.name,
        subclassShortName: extra.subclassShortName,
        classFeatures: extra.allFeatures || [],
        subclassFeatures: extra.allSubFeatures || [],
        keyPrefix: ecPrefix,
        includeStartingProficiencies: false,
        context: { ...context, character, isMulticlass: true, keyPrefix: ecPrefix },
      }));
    }
  }

  return dedupSpecs(filterByRequiredChoice(all, character));
}

export function speciesChoiceSpecs(character) {
  const species = character.speciesObj;
  if (!species) return [];
  const specs = [];
  const speciesLangFrom = getLanguageOptions({ includeCommon: false });
  specs.push({
    key: 'species_language_bonus',
    label: 'Species Languages',
    type: 'language_choice',
    from: speciesLangFrom,
    count: 2,
    level: 1,
  });
  const adapter = installedRegistry.getSpeciesAdapter(character.speciesName, character.speciesSource);
  if (adapter) {
    const adapterSpecs = adapter(species);
    if (Array.isArray(adapterSpecs)) {
      return dedupSpecs(filterByRequiredChoice([...specs, ...adapterSpecs], character));
    }
  }
  (species.skillProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`species_skill_${index}`, 'Species Skill', block, ALL_SKILLS);
    if (spec) specs.push({ ...spec, type: 'skill_choice' });
  });
  (species.languageProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`species_language_${index}`, 'Species Language', block, STD_LANGS);
    if (spec) specs.push({ ...spec, type: 'language_choice' });
    else if (block.anyStandard) specs.push({ key: `species_language_${index}`, label: 'Species Language', type: 'language_choice', from: STD_LANGS, count: block.anyStandard });
  });
  return specs;
}

export function backgroundChoiceSpecs(character) {
  const background = character.backgroundObj;
  if (!background) return [];
  const specs = [];
  const origin = backgroundOriginFeat(background);
  if (origin?.fixed) {
    specs.push({ key: 'feat_origin', label: 'Origin Feat', type: 'feat_fixed', fixed: origin.fixed, classHint: origin.classHint || null, count: 1, level: 0 });
  }
  (background.skillProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`bg_skill_${index}`, 'Background Skill', block, ALL_SKILLS);
    if (spec) specs.push({ ...spec, type: 'skill_choice' });
  });
  (background.toolProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`bg_tool_${index}`, 'Background Tool', block, ALL_TOOLS);
    if (spec) specs.push({ ...spec, type: 'tool_choice' });
    else if (block.anyTool) specs.push({ key: `bg_tool_${index}`, label: 'Background Tool', type: 'tool_choice', from: ALL_TOOLS, count: block.anyTool });
  });
  (background.languageProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`bg_language_${index}`, 'Background Language', block, STD_LANGS);
    if (spec) specs.push({ ...spec, type: 'language_choice' });
    else if (block.anyStandard) specs.push({ key: `bg_language_${index}`, label: 'Background Language', type: 'language_choice', from: STD_LANGS, count: block.anyStandard });
  });
  return filterByRequiredChoice(specs, character);
}

function parseChooseString(value) {
  const out = { level: null, classes: [], schools: [] };
  String(value || '').split('|').forEach((part) => {
    const [k, v] = part.split('=');
    if (k === 'level') out.level = Number(v);
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
        const sigKey = `${parsed.level ?? '?'}|${parsed.classes.join(',')}|${parsed.schools.join(',')}`;
        const current = grouped.get(sigKey) || { ...parsed, count: 0 };
        current.count += entry.count || 1;
        grouped.set(sigKey, current);
      });
      grouped.forEach((value, key) => {
        out.push({
          key: `${slotKey}_spell_${mode}_${chooseCounter}_${key}`,
          label: `${feat.name} - ${value.level === 0 ? 'Cantrip' : `Spell Lv.${value.level}`}${value.classes.length ? ` (${value.classes.join('/')})` : ''}`,
          type: 'spell_choice',
          count: value.count,
          spellFilter: {
            spellLevels: value.level != null ? [value.level] : undefined,
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
    const from = asiUi.from?.length ? asiUi.from : STATS;
    const modes = asiUi.modes || ['single'];
    if (modes.includes('double') || modes.includes('split')) {
      specs.push({ key: `${slotKey}_first_asi`, label: `${feat.name} Ability +1`, type: 'ability_choice', from, count: 1 });
      specs.push({ key: `${slotKey}_second_asi`, label: `${feat.name} Ability +1`, type: 'ability_choice', from, count: 1 });
    } else {
      specs.push({ key: `${slotKey}_asi`, label: `${feat.name} Ability`, type: 'ability_choice', from, count: 1 });
    }
  } else if (feat?.ability?.some((block) => block.choose)) {
    specs.push({ key: `${slotKey}_asi`, label: `${feat.name} Ability`, type: 'ability_choice', from: STATS, count: 1 });
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
  if (ui.skillProficiency) specs.push({ key: `${slotKey}_skill`, label: `${feat.name} Skill`, type: 'skill_choice', from: ALL_SKILLS, count: ui.skillProficiency.count || 1 });
  if (ui.toolProficiency) specs.push({ key: `${slotKey}_tool`, label: ui.toolProficiency.label || `${feat.name} Tool`, type: 'generic_choice', from: ui.toolProficiency.options || ALL_TOOLS, count: ui.toolProficiency.count || 1 });
  if (ui.languageProficiency) specs.push({ key: `${slotKey}_language`, label: `${feat.name} Language`, type: 'language_choice', from: STD_LANGS, count: ui.languageProficiency.count || 1 });
  if (ui.spellAbility) {
    specs.push({
      key: `${slotKey}_${ui.spellAbility.keySuffix || 'spell_ability'}`,
      label: ui.spellAbility.label || `${feat.name} Spellcasting Ability`,
      type: 'ability_choice',
      options: ui.spellAbility.options || STATS.map((stat) => ({ value: stat, label: STAT_LABELS[stat] || stat })),
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
      fallbackFrom: ALL_SKILLS,
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
      fallbackFrom: ALL_LANGS,
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
      fallbackFrom: [...ALL_SKILLS, ...ALL_TOOLS, ...ALL_LANGS],
    }));
  }

  specs.push(...additionalSpellChoices(feat, slotKey, options.entryIdx));
  return specs;
}

export function summarizeFixedProficiencies(entity) {
  const skills = fixedKeysFromBlocks(entity?.skillProficiencies || []);
  const tools = fixedKeysFromBlocks(entity?.toolProficiencies || [], ['choose', 'any', 'anyTool', 'anyArtisansTool', 'anyMusicalInstrument', 'anyGamingSet']);
  const languages = fixedKeysFromBlocks(entity?.languageProficiencies || [], ['choose', 'any', 'anyStandard']);
  return { skills, tools, languages };
}

export function optionLabel(value) {
  const parsed = parseSkillToolChoiceValue(value);
  if (parsed?.name) return parsed.name;
  const raw = strip5eMarkup(String(value || '').split('|')[0]);
  return STAT_LABELS[raw] || raw.replace(/_/g, ' ');
}
