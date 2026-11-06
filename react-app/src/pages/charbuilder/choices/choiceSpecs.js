import { adapterRegistry } from '../../../adapters/registry.js';
import { getPrimaryClassLevel } from '../progression/calculations.js';
import { backgroundOriginFeat } from '../../../shared/character/progression/selectedFeats.js';
import { getMulticlassChoiceSpecs } from '../../../shared/character/progression/multiclassProficiencies.js';
import {
  ALL_LANGUAGES,
  ALL_TOOLS,
  ARTISAN_TOOLS,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
  SKILL_NAMES,
  STANDARD_LANGUAGES,
} from '../../../shared/content/rulesVocabulary.js';
import { getLanguageOptions } from '../../../shared/character/progression/languages.js';
import { filterByRequiredChoice } from '../../../shared/character/progression/lineageMatch.js';
import { asArray } from '../../../shared/lists.js';
import {
  specSan,
  specUniq,
  specPush,
  choiceFromBlock,
} from './choiceSpecHelpers.js';

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
      const from = choose.from || SKILL_NAMES;
      specPush(out, { key: `${baseKey}_skill_${bi}`, label: `${fname} — Skill`, type: 'skill_choice', count, level: feature.level || 1, from });
    });

    (feature.languageProficiencies || []).forEach((block, bi) => {
      const choose = block?.choose || {};
      const count = block?.anyStandard || block?.anyExotic || choose.count || 0;
      if (!count) return;
      let from = choose.from || [];
      if (!from.length) from = block?.anyExotic ? ALL_LANGUAGES : STANDARD_LANGUAGES;
      specPush(out, { key: `${baseKey}_lang_${bi}`, label: `${fname} — Language`, type: 'language_choice', count, level: feature.level || 1, from });
    });

    (feature.toolProficiencies || []).forEach((block, bi) => {
      const choose = block?.choose || {};
      const count = block?.anyTool || block?.anyArtisansTool || block?.anyMusicalInstrument || block?.anyGamingSet || block?.any || choose.count || 0;
      if (!count) return;
      let from = choose.from || [];
      if (!from.length) {
        if (block?.anyArtisansTool) from = ARTISAN_TOOLS;
        else if (block?.anyMusicalInstrument) from = MUSICAL_INSTRUMENTS;
        else if (block?.anyGamingSet) from = GAMING_SETS;
        else from = ALL_TOOLS;
      }
      specPush(out, { key: `${baseKey}_tool_${bi}`, label: `${fname} — Tool`, type: 'generic_choice', count, level: feature.level || 1, from });
    });

    collectOptionsNodes(feature.entries, []).forEach((optNode, oi) => {
      const count = optNode?.count || 1;
      const from = specUniq((optNode.entries || []).map(optionEntryLabel).filter(Boolean));
      if (!count || !from.length) return;
      const fromLc = from.map((value) => String(value).toLowerCase());
      const allSkillsLc = SKILL_NAMES.map((value) => value.toLowerCase());
      const allLangsLc = ALL_LANGUAGES.map((value) => value.toLowerCase());
      const isAllSkills = fromLc.every((value) => allSkillsLc.includes(value));
      const isAllLangs = fromLc.every((value) => allLangsLc.includes(value));
      const type = isAllSkills ? 'skill_choice' : isAllLangs ? 'language_choice' : 'generic_choice';
      specPush(out, { key: `${baseKey}_opt_${oi}`, label: `${fname} — Option`, type, count, level: feature.level || 1, from });
    });

    if (feature.expertise) {
      asArray(feature.expertise).forEach((ex, idx) => {
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
      const spec = typeof block === 'object' ? choiceFromBlock(`${options.keyPrefix}class_skill_${index}`, 'Class Skill', block, SKILL_NAMES) : null;
      if (spec) specs.push({ ...spec, type: 'skill_choice', level: 1 });
    });
    [...(prof.tools || []), ...(prof.toolProficiencies || [])].forEach((block, index) => {
      const spec = typeof block === 'object' ? choiceFromBlock(`${options.keyPrefix}class_tool_${index}`, 'Class Tool', block, ALL_TOOLS) : null;
      if (spec) specs.push({ ...spec, type: 'generic_choice', level: 1 });
    });
    (prof.languages || []).forEach((block, index) => {
      const spec = typeof block === 'object' ? choiceFromBlock(`${options.keyPrefix}class_lang_${index}`, 'Class Language', block, STANDARD_LANGUAGES) : null;
      if (spec) specs.push({ ...spec, type: 'language_choice', level: 1 });
    });
  } else {
    specs.push(...getMulticlassChoiceSpecs(options.className, options.keyPrefix, cls));
  }

  const classAdapter = adapterRegistry.getClassAdapter(options.className);
  if (typeof classAdapter === 'function') classAdapter(cls, classLevel, specs, options.context || {});

  if (options.subclassShortName) {
    const subclassAdapter = adapterRegistry.getSubclassAdapter(options.className, options.subclassShortName);
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
  const adapter = adapterRegistry.getSpeciesAdapter(character.speciesName, character.speciesSource);
  if (adapter) {
    const adapterSpecs = adapter(species);
    if (Array.isArray(adapterSpecs)) {
      return dedupSpecs(filterByRequiredChoice([...specs, ...adapterSpecs], character));
    }
  }
  (species.skillProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`species_skill_${index}`, 'Species Skill', block, SKILL_NAMES);
    if (spec) specs.push({ ...spec, type: 'skill_choice' });
  });
  (species.languageProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`species_language_${index}`, 'Species Language', block, STANDARD_LANGUAGES);
    if (spec) specs.push({ ...spec, type: 'language_choice' });
    else if (block.anyStandard) specs.push({ key: `species_language_${index}`, label: 'Species Language', type: 'language_choice', from: STANDARD_LANGUAGES, count: block.anyStandard });
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
  } else if (origin?.fixedOptions?.length || origin?.categories?.length) {
    specs.push({
      key: 'feat_origin',
      label: 'Origin Feat',
      type: 'feat_cat',
      fixedOptions: origin.fixedOptions || [],
      categories: origin.categories || [],
      count: 1,
      level: 0,
    });
  }
  (background.skillProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`bg_skill_${index}`, 'Background Skill', block, SKILL_NAMES);
    if (spec) specs.push({ ...spec, type: 'skill_choice' });
  });
  (background.toolProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`bg_tool_${index}`, 'Background Tool', block, ALL_TOOLS);
    if (spec) specs.push({ ...spec, type: 'tool_choice' });
    else if (block.anyTool) specs.push({ key: `bg_tool_${index}`, label: 'Background Tool', type: 'tool_choice', from: ALL_TOOLS, count: block.anyTool });
  });
  (background.languageProficiencies || []).forEach((block, index) => {
    const spec = choiceFromBlock(`bg_language_${index}`, 'Background Language', block, STANDARD_LANGUAGES);
    if (spec) specs.push({ ...spec, type: 'language_choice' });
    else if (block.anyStandard) specs.push({ key: `bg_language_${index}`, label: 'Background Language', type: 'language_choice', from: STANDARD_LANGUAGES, count: block.anyStandard });
  });
  return filterByRequiredChoice(specs, character);
}

