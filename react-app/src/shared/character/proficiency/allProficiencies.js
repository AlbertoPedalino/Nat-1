import { getMulticlassProficiencies } from '../progression/multiclassProficiencies.js';
import { getNormalizedChoices } from '../progression/choiceNormalization.js';
import {
  addFixedLabels,
  collectFixedFeatureProfs,
  normalizeLabel,
} from './proficiencyHelpers.js';
import { asArray } from '../../lists.js';


export function collectAllProficiencies(character, equipmentSets) {
  if (!equipmentSets) {
    throw new Error('collectAllProficiencies requires equipmentSets from collectEquipmentProficiencySets(character)');
  }
  const sp = character?.clsSnapshot?.startingProficiencies || {};
  const { armorSet, weaponSet, armorHidden, weaponHidden, adapterGrants } = equipmentSets;
  const toolSet = new Set();
  const langSet = new Set();

  // Picked tools and languages: the one reading of the builder's choices.
  const normalized = getNormalizedChoices(character);
  (normalized.tools || []).map(normalizeLabel).filter(Boolean).forEach((v) => toolSet.add(v));
  (normalized.languages || []).map(normalizeLabel).filter(Boolean).forEach((v) => langSet.add(v));

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

  adapterGrants.forEach((grant) => {
    if (grant.display === false) return;
    const vals = asArray(grant.values);
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
