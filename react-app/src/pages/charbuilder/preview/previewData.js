import { collectAllProficiencies } from '../../../shared/character/proficiency/allProficiencies.js';
import { collectEquipmentProficiencySets } from '../../../shared/character/proficiency/equipmentSets.js';
import { collectPreviewEffectProficiencySections } from '../../../shared/character/sheet/sheetEffects.js';
import { collectPreviewDefenseSections } from '../../../shared/character/sheet/sheetDefenses.js';
import {
  collapseWeaponProficiencies,
  uniqueDisplayLabels,
} from '../../../shared/character/progression/proficiencyDisplay.js';
import { parseTypedProficiencyValue } from '../../../shared/character/progression/typedProficiencies.js';
import { collectOwnedFeatNames } from '../../../shared/character/progression/selectedFeats.js';
import { buildPreviewSheetCharacter } from './previewSheet.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { heldProficiencyLabels } from '../../../shared/character/proficiency/heldProficiencies.js';
import { getNormalizedChoices } from '../../../shared/character/progression/choiceNormalization.js';

// What the builder preview lists: skill and other proficiencies merged from
// every source, and the feats the character holds.

function uniqueClean(values) {
  return uniqueDisplayLabels(values);
}

function collectSkillProficiencies(character) {
  const out = [];
  const pushSkill = (value) => {
    const parsed = parseTypedProficiencyValue(value);
    if (!parsed.label) return;
    if (parsed.kind && parsed.kind !== 'skill') return;
    out.push(parsed.label);
  };

  const fromSelected = Array.isArray(character.selectedSkills)
    ? character.selectedSkills
    : [
      ...(character.selectedSkills?.proficient || []),
      ...(character.selectedSkills?.expertise || []),
      ...(character.selectedSkills?.expert || []),
    ];
  fromSelected.forEach(pushSkill);
  out.push(...heldProficiencyLabels(character, 'skill'));
  const normalized = getNormalizedChoices(character);
  [...(normalized.skills || []), ...(normalized.expertise || [])].forEach(pushSkill);

  return uniqueClean(out);
}

// `allItemsDb`: the builder's item data, which knows each weapon's category, so
// a weapon covered by "Simple" or "Martial" is not listed again.
function mergePreviewSection(sections, title, items, prepend = false, allItemsDb = []) {
  const collapse = (list) => collapseWeaponProficiencies(list, { allItemsDb });
  const cleaned = title === 'Weapons' ? collapse(items) : uniqueClean(items);
  if (!cleaned.length) return;
  const existing = sections.find((section) => section.title === title);
  if (existing) {
    existing.items = title === 'Weapons' ? collapse([...existing.items, ...cleaned]) : uniqueClean([...existing.items, ...cleaned]);
    return;
  }
  const next = { title, items: cleaned };
  if (prepend) sections.unshift(next);
  else sections.push(next);
}

export function collectPreviewProficiencies(character, allItemsDb = []) {
  const sheetLike = buildPreviewSheetCharacter(character);
  const sections = collectAllProficiencies(sheetLike, collectEquipmentProficiencySets(sheetLike)).map((section) => ({
    title: section.title,
    items: section.title === 'Weapons' ? collapseWeaponProficiencies(section.items, { allItemsDb }) : uniqueClean(section.items),
  }));

  collectPreviewDefenseSections(sheetLike).forEach((section) => {
    mergePreviewSection(sections, section.title, section.items, false, allItemsDb);
  });

  collectPreviewEffectProficiencySections(sheetLike).forEach((section) => {
    if (section.title === 'Armor Training' || section.title === 'Weapon Training') return;
    mergePreviewSection(sections, section.title, section.items, false, allItemsDb);
  });

  const skillItems = collectSkillProficiencies(character);
  if (skillItems.length) mergePreviewSection(sections, 'Skills', skillItems, true);

  return sections.filter((section) => section.items.length);
}

export function collectPreviewFeats(character, feats) {
  const ownedNames = collectOwnedFeatNames(character);
  if (!ownedNames.length) return [];

  const byName = new Map();
  [
    ...(character.allFeatSnapshots || []),
    ...(feats || []),
  ].forEach((feat) => {
    const key = matchKey(feat?.name);
    if (key && !byName.has(key)) byName.set(key, feat);
  });

  return ownedNames.map((name) => {
    const feat = byName.get(matchKey(name));
    return feat ? { ...feat, name: feat.name || name } : { name, entries: [] };
  });
}
