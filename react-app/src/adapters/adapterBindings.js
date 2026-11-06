import {
  ALL_LANGUAGES,
  ALL_TOOLS,
  ARTISAN_TOOLS,
  EXOTIC_LANGUAGES,
  MUSICAL_INSTRUMENTS,
  SKILLS,
  STANDARD_LANGUAGES,
} from '../shared/content/rulesVocabulary.js';
import {
  getWeaponMasteryChoiceCount,
  getWeaponMasteryChoiceNames,
  WEAPON_MASTERY_RULES,
} from '../shared/character/combat/weaponMastery.js';
import { asArray } from '../shared/lists.js';
import { capitalize } from '../shared/ui/textCase.js';
import { KEYED_SLOTS } from './registry.js';

export function splitClassSubclass(rawKey) {
  const value = String(rawKey || '');
  const idx = value.indexOf('_');
  return idx < 0 ? [value, ''] : [value.slice(0, idx), value.slice(idx + 1)];
}

export function splitSpecies(rawKey) {
  const value = String(rawKey || '');
  const idx = value.lastIndexOf('_');
  return idx < 0 ? [value, ''] : [value.slice(0, idx), value.slice(idx + 1)];
}

// What an adapter file gets to register with: every registry method, except
// that a subclass or species register takes one raw key instead of two
// ("Wizard_Evoker", "Elf_XPHB") and splits it here; plus the vocabulary lists
// and helpers adapter files share.
export function createAdapterBindings(registry, context = {}) {
  const splitRegisters = {};
  KEYED_SLOTS.forEach((slot) => {
    if (slot.kinds.includes('Subclass')) {
      const method = `registerSubclass${slot.register}`;
      splitRegisters[method] = (rawKey, value) => registry[method](...splitClassSubclass(rawKey), value);
    }
    if (slot.kinds.includes('Species')) {
      const method = `registerSpecies${slot.register}`;
      splitRegisters[method] = (rawKey, value) => registry[method](...splitSpecies(rawKey), value);
    }
  });

  return {
    ...registry,
    ...splitRegisters,
    registerSpeciesSheetCommonChoiceMeta: (rawKey, meta = {}) => splitRegisters.registerSpeciesSheetChoiceMeta(rawKey, meta),

    _ARTISAN_TOOLS: ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS: MUSICAL_INSTRUMENTS,
    _ALL_LANGS: ALL_LANGUAGES,
    _ALL_TOOLS: ALL_TOOLS,
    allItemsDb: context.items || [],
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
    getGenericSpeciesChoiceSpecs,
  };
}

function choiceFromChoose(key, label, type, block, fallback = []) {
  const choose = block?.choose;
  if (!choose && !block?.any && !block?.anyStandard && !block?.anyExotic && !block?.anyTool && !block?.anyArtisansTool && !block?.anyMusicalInstrument) return null;
  const count = Number(choose?.count || block.any || block.anyStandard || block.anyExotic || block.anyTool || block.anyArtisansTool || block.anyMusicalInstrument || 1);
  const from = Array.isArray(choose?.from) ? choose.from.map(capitalize) : fallback.slice();
  return from.length ? { key, label, type, from, count, level: 1 } : null;
}

function getGenericSpeciesChoiceSpecs(species) {
  const specs = [];
  asArray(species?.skillProficiencies).forEach((block, index) => {
    const spec = choiceFromChoose(`species_skill_${index}`, 'Choose Skill', 'skill_choice', block, SKILLS.map((skill) => skill.name));
    if (spec) specs.push(spec);
  });
  asArray(species?.toolProficiencies).forEach((block, index) => {
    const fallback = block?.anyArtisansTool ? ARTISAN_TOOLS : block?.anyMusicalInstrument ? MUSICAL_INSTRUMENTS : ALL_TOOLS;
    const spec = choiceFromChoose(`species_tool_${index}`, 'Choose Tool Proficiency', 'generic_choice', block, fallback);
    if (spec) specs.push(spec);
  });
  asArray(species?.languageProficiencies || species?.languages).forEach((block, index) => {
    const fallback = block?.anyExotic ? EXOTIC_LANGUAGES : STANDARD_LANGUAGES;
    const spec = choiceFromChoose(`species_language_${index}`, 'Language', 'language_choice', block, fallback);
    if (spec) specs.push(spec);
  });
  if (Array.isArray(species?.size) && species.size.length > 1) {
    const sizeMap = { M: 'Medium', S: 'Small' };
    specs.push({ key: 'species_size', label: 'Size', type: 'generic_choice', from: species.size.map((size) => sizeMap[size] || size), count: 1, level: 1 });
  }
  asArray(species?.resist).forEach((block, index) => {
    const spec = choiceFromChoose(`species_resist_${index}`, 'Resistance', 'generic_choice', block, []);
    if (spec) specs.push(spec);
  });
  return specs;
}

