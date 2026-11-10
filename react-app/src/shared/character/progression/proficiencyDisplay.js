import { titleCase } from '../../ui/textCase.js';
import { matchKey, uniqueLabels } from '../../content/nameKeys.js';
import { DAMAGE_TYPES } from '../../content/rulesVocabulary.js';
import { compareText } from '../../lists.js';
import { stripMarkup } from '../../content/markupText.js';
const CANONICAL_DISPLAY_LABELS = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
  shield: 'Shield',
  shields: 'Shield',
  simple: 'Simple',
  martial: 'Martial',
  common: 'Common',
  ...Object.fromEntries(DAMAGE_TYPES.map((type) => [type.toLowerCase(), type])),
};

export function cleanProficiencyText(value) {
  return stripMarkup(value)
    .replace(/[{}]/g, '')
    .replace(/\.$/, '')
    .split('|')[0]
    .replace(/^(skill|tool|language|weapon):\s*/i, '')
    .trim();
}

export function labelKey(value) {
  return matchKey(cleanProficiencyText(value));
}

export function canonicalDisplayLabel(value) {
  const raw = cleanProficiencyText(value);
  if (!raw) return '';
  return CANONICAL_DISPLAY_LABELS[labelKey(raw)] || titleCase(String(raw || '').toLowerCase());
}

export function canonicalProficiencyLabel(value) {
  return canonicalDisplayLabel(value);
}

function splitSource(label) {
  const match = String(label || '').match(/^(.*?)\s*(\([^)]*\))\s*$/);
  if (!match) return { base: label, source: '' };
  return { base: match[1].trim(), source: match[2].trim() };
}

function itemNameKey(item) {
  return labelKey(String(item?.name || '').replace(/,\s*\+\d+$/i, '').replace(/\s*\+\d+$/i, ''));
}

function itemWeaponCategory(item) {
  const raw = item?.weaponCategory || item?.weaponType || item?.category || item?._weaponCategory || item?.weaponGroup || '';
  const categoryKey = labelKey(raw);
  if (categoryKey.includes('simple')) return 'simple';
  if (categoryKey.includes('martial')) return 'martial';
  return '';
}

// A weapon's category from the item data (`weaponCategory`); '' when the
// item database is not at hand.
function lookupWeaponCategory(label, allItemsDb) {
  const baseKey = labelKey(splitSource(label).base);
  const item = (allItemsDb || []).find((entry) => itemNameKey(entry) === baseKey);
  return item ? itemWeaponCategory(item) : '';
}

export function uniqueDisplayLabels(values) {
  return uniqueLabels(values, canonicalDisplayLabel, { sort: true });
}

export function collapseWeaponProficiencies(items, options = {}) {
  const labels = uniqueDisplayLabels(items);
  const hasSimple = labels.some((item) => labelKey(splitSource(item).base) === 'simple');
  const hasMartial = labels.some((item) => labelKey(splitSource(item).base) === 'martial');
  const out = [];
  const seen = new Set();

  labels.forEach((label) => {
    const { base } = splitSource(label);
    const baseKey = labelKey(base);
    const category = lookupWeaponCategory(label, options.allItemsDb);
    if (hasSimple && category === 'simple' && baseKey !== 'simple') return;
    if (hasMartial && category === 'martial' && baseKey !== 'martial') return;
    if (seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    out.push(label);
  });

  return out.sort(compareText);
}
