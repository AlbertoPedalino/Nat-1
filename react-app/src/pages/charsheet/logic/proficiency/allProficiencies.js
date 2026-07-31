import { getMulticlassProficiencies } from '../../../../shared/character/multiclassProficiencies.js';
import {
  parseTypedProficiencyValue as parseTypedProficiencyValueShared,
  isChoicePlaceholderValue,
} from '../../../../shared/character/typedProficiencies.js';
import {
  addFixedLabels,
  collectFixedFeatureProfs,
  normalizeLabel,
} from './helpers.js';

function parseTypedProficiencyValue(value) {
  const parsed = parseTypedProficiencyValueShared(value);
  if (!parsed.kind || !parsed.label) return null;
  return { kind: parsed.kind, label: parsed.label };
}

export function collectAllProficiencies(character, equipmentSets) {
  if (!equipmentSets) {
    throw new Error('collectAllProficiencies requires equipmentSets from collectEquipmentProficiencySets(character)');
  }
  const sp = character?.clsSnapshot?.startingProficiencies || {};
  const { armorSet, weaponSet, armorHidden, weaponHidden, adapterGrants } = equipmentSets;
  const toolSet = new Set();
  const langSet = new Set();

  (character?.normalizedChoices?.tools || [])
    .map(normalizeLabel)
    .filter(Boolean)
    .forEach((v) => toolSet.add(v));
  (character?.normalizedChoices?.languages || [])
    .map(normalizeLabel)
    .filter(Boolean)
    .forEach((v) => langSet.add(v));

  addFixedLabels(sp.tools, toolSet);

  (character?.extraClasses || []).forEach((extra) => {
    const gained = getMulticlassProficiencies(extra?.name, extra?.cls);
    addFixedLabels(gained.tools, toolSet);
    addFixedLabels(gained.toolProficiencies, toolSet);
    addFixedLabels(gained.languages, langSet);
    addFixedLabels(gained.languageProficiencies, langSet);
  });

  const bg = character?.backgroundSnapshot || {};
  const species = character?.speciesSnapshot || {};
  if (species.toolProficiencies) addFixedLabels(species.toolProficiencies, toolSet);
  if (species.languageProficiencies) addFixedLabels(species.languageProficiencies, langSet);
  if (bg.toolProficiencies) addFixedLabels(bg.toolProficiencies, toolSet);
  if (bg.languageProficiencies) addFixedLabels(bg.languageProficiencies, langSet);

  collectFixedFeatureProfs(character, 'toolProficiencies').forEach((v) => toolSet.add(v));
  collectFixedFeatureProfs(character, 'languageProficiencies').forEach((v) => langSet.add(v));
  collectFixedFeatureProfs(character, 'skillToolLanguageProficiencies').forEach((v) => toolSet.add(v));

  if (character?.choices) {
    for (const [key, val] of Object.entries(character.choices)) {
      if (!val) continue;
      const lk = key.toLowerCase();
      const vals = Array.isArray(val) ? val : [val];
      vals.forEach((v) => {
        const typed = parseTypedProficiencyValue(v);
        if (typed) {
          if (typed.kind === 'tool') toolSet.add(typed.label);
          else if (typed.kind === 'language') langSet.add(typed.label);
          return;
        }
        if (isChoicePlaceholderValue(v)) return;
        if (lk.includes('tool') || lk.includes('instrument')) {
          const n = normalizeLabel(v);
          if (n) toolSet.add(n);
        }
        if (lk.includes('language')) {
          const n = normalizeLabel(v);
          if (n) langSet.add(n);
        }
      });
    }
  }

  adapterGrants.forEach((grant) => {
    if (grant.display === false) return;
    const vals = Array.isArray(grant.values) ? grant.values : [grant.values];
    vals.map(normalizeLabel).filter(Boolean).forEach((v) => {
      if (grant.type === 'tool') toolSet.add(v);
      else if (grant.type === 'language') langSet.add(v);
    });
  });

  langSet.add('Common');

  const visible = (set, hidden) => Array.from(set).filter((v) => !hidden.has(v));
  const sections = [];
  const visibleArmor = visible(armorSet, armorHidden);
  const visibleWeapons = visible(weaponSet, weaponHidden);
  if (visibleArmor.length) sections.push({ title: 'Armor', items: visibleArmor });
  if (visibleWeapons.length) sections.push({ title: 'Weapons', items: visibleWeapons });
  if (toolSet.size) sections.push({ title: 'Tools', items: Array.from(toolSet) });
  if (langSet.size) sections.push({ title: 'Languages', items: Array.from(langSet) });
  return sections;
}
