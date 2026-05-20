import { getMulticlassProficiencies } from '../../../../shared/character/multiclassProficiencies.js';
import {
  dedupeRules,
  formatRule,
  inferRuleFromLabel,
  labelToFormattedWeaponLabel,
  processStructuredWeaponProficiencies,
} from './weaponRules.js';
import {
  addFixedLabels,
  collectAdapterProfGrants,
  collectFixedFeatureProfs,
  normalizeLabel,
} from './helpers.js';

function isProficiencyChoiceKey(lowerKey) {
  return lowerKey.includes('proficiency');
}

export function resolveWeaponProficiencyRules(character, adapterGrants) {
  const rules = [];
  const sp = character?.clsSnapshot?.startingProficiencies || {};

  if (sp.weaponProficiencies) {
    processStructuredWeaponProficiencies(sp.weaponProficiencies).forEach((rule) => rules.push(rule));
  }

  (adapterGrants || collectAdapterProfGrants(character))
    .filter((grant) => grant.type === 'weapon' && grant.match && typeof grant.match === 'object')
    .forEach((grant) => rules.push(grant.match));

  return dedupeRules(rules);
}

export function collectEquipmentProficiencySets(character) {
  const sp = character?.clsSnapshot?.startingProficiencies || {};
  const armorSet = new Set();
  const weaponSet = new Set();
  const weaponMasterySet = new Set();
  const armorHidden = new Set();
  const weaponHidden = new Set();
  const masteryHidden = new Set();
  const rawWeaponLabels = new Set();

  (character?.normalizedChoices?.weaponMasteries || [])
    .map(normalizeLabel)
    .filter(Boolean)
    .forEach((v) => weaponMasterySet.add(v));

  addFixedLabels(sp.armor, armorSet);

  const weaponsNoFilter = (Array.isArray(sp.weapons) ? sp.weapons : [])
    .filter((entry) => typeof entry !== 'string' || !entry.includes('{@filter'));
  addFixedLabels(weaponsNoFilter, rawWeaponLabels);

  const adapterGrants = collectAdapterProfGrants(character);
  const explicitRules = resolveWeaponProficiencyRules(character, adapterGrants);

  (character?.extraClasses || []).forEach((extra) => {
    const gained = getMulticlassProficiencies(extra?.name, extra?.cls);
    addFixedLabels(gained.armor, armorSet);
    addFixedLabels(gained.weapons, rawWeaponLabels);
  });

  if (character?.speciesSnapshot?.armorProficiencies) addFixedLabels(character.speciesSnapshot.armorProficiencies, armorSet);
  if (character?.speciesSnapshot?.weaponProficiencies) addFixedLabels(character.speciesSnapshot.weaponProficiencies, rawWeaponLabels);
  if (character?.backgroundSnapshot?.armorProficiencies) addFixedLabels(character.backgroundSnapshot.armorProficiencies, armorSet);
  if (character?.backgroundSnapshot?.weaponProficiencies) addFixedLabels(character.backgroundSnapshot.weaponProficiencies, rawWeaponLabels);

  collectFixedFeatureProfs(character, 'armorProficiencies').forEach((v) => armorSet.add(v));
  collectFixedFeatureProfs(character, 'weaponProficiencies').forEach((v) => rawWeaponLabels.add(v));

  if (character?.choices) {
    for (const [key, val] of Object.entries(character.choices)) {
      if (!val) continue;
      const lk = key.toLowerCase();
      if (!isProficiencyChoiceKey(lk)) continue;
      const vals = Array.isArray(val) ? val : [val];
      if (lk.includes('mastery') && lk.includes('weapon')) {
        vals.forEach((v) => { const n = normalizeLabel(v); if (n) weaponMasterySet.add(n); });
        continue;
      }
      if (lk.includes('armor')) vals.forEach((v) => { const n = normalizeLabel(v); if (n) armorSet.add(n); });
      if (lk.includes('weapon')) vals.forEach((v) => { const n = normalizeLabel(v); if (n) rawWeaponLabels.add(n); });
    }
  }

  adapterGrants.forEach((grant) => {
    if (!['armor', 'weapon', 'weaponMastery'].includes(grant.type)) return;
    const vals = Array.isArray(grant.values) ? grant.values : [grant.values];
    const labels = vals.map(normalizeLabel).filter(Boolean);
    const targetSet = grant.type === 'armor' ? armorSet : grant.type === 'weaponMastery' ? weaponMasterySet : rawWeaponLabels;
    const hiddenSet = grant.type === 'armor' ? armorHidden : grant.type === 'weaponMastery' ? masteryHidden : weaponHidden;
    labels.forEach((label) => {
      targetSet.add(label);
      if (grant.display === false) {
        hiddenSet.add(grant.type === 'weapon' ? labelToFormattedWeaponLabel(label) : label);
      }
    });
  });

  // Build inferred rules from raw labels (features/multiclass/choices/species/etc).
  // Explicit rules (from clsSnapshot.weaponProficiencies + adapter.match) already
  // cover their semantics; the inference step turns label strings into rules so
  // weapon-proficiency queries can match items via weaponMatchesRule alone.
  const inferredRules = [];
  rawWeaponLabels.forEach((label) => {
    const rule = inferRuleFromLabel(label);
    if (rule) inferredRules.push(rule);
  });

  const weaponRules = dedupeRules([...explicitRules, ...inferredRules]);

  // weaponSet = display labels derived from the final rule set. Every raw label
  // already produced an inferred rule (named-weapon fallback preserves original
  // casing), so formatting the rule set yields one canonical label per rule
  // without duplicating raw and formatted variants of the same proficiency.
  weaponRules.forEach((rule) => weaponSet.add(formatRule(rule)));

  return {
    armorSet,
    weaponSet,
    weaponMasterySet,
    weaponRules,
    armorHidden,
    weaponHidden,
    masteryHidden,
    adapterGrants,
  };
}
