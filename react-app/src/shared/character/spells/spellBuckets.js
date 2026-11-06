import { matchKey } from '../../content/nameKeys.js';
import { normalizeWizardBook } from './wizardBook.js';

// A class entry's own spell picks (its "bucket": the character for the primary
// class, an extraClasses entry otherwise): selectedCantrips, selectedSpells
// { level: names }, and a Wizard's wizardSpellbook { level: names }. The
// builder and the sheet edit them through these. Names compare loosely
// (matchKey). The `with…` functions return only the fields they change.

const sameSpell = (a, b) => matchKey(a) === matchKey(b);

function pickedAt(bucket, level) {
  if (Number(level) === 0) return bucket?.selectedCantrips || [];
  const list = bucket?.selectedSpells?.[String(level)];
  return Array.isArray(list) ? list : [];
}

function copySpellsByLevel(selectedSpells) {
  return Object.fromEntries(
    Object.entries(selectedSpells || {}).map(([level, names]) => [level, Array.isArray(names) ? [...names] : []]),
  );
}

export function bucketCounts(bucket) {
  return {
    cantrips: (bucket?.selectedCantrips || []).length,
    spells: Object.values(bucket?.selectedSpells || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
  };
}

export function hasPickedSpell(bucket, level, name) {
  return pickedAt(bucket, level).some((entry) => sameSpell(entry, name));
}

export function withSpellPicked(bucket, level, name) {
  if (hasPickedSpell(bucket, level, name)) return {};
  if (Number(level) === 0) return { selectedCantrips: [...(bucket?.selectedCantrips || []), name] };
  const selectedSpells = copySpellsByLevel(bucket?.selectedSpells);
  const key = String(level);
  selectedSpells[key] = [...(selectedSpells[key] || []), name];
  return { selectedSpells };
}

export function withoutSpellPicked(bucket, level, name) {
  if (Number(level) === 0) {
    return { selectedCantrips: (bucket?.selectedCantrips || []).filter((entry) => !sameSpell(entry, name)) };
  }
  const selectedSpells = copySpellsByLevel(bucket?.selectedSpells);
  const key = String(level);
  selectedSpells[key] = (selectedSpells[key] || []).filter((entry) => !sameSpell(entry, name));
  if (!selectedSpells[key].length) delete selectedSpells[key];
  return { selectedSpells };
}

export function wizardBookLevel(bucket, level) {
  return normalizeWizardBook(bucket?.wizardSpellbook)[Number(level || 0)] || [];
}

export function wizardBookSize(bucket) {
  return Object.values(normalizeWizardBook(bucket?.wizardSpellbook)).reduce((sum, list) => sum + list.length, 0);
}

export function isInWizardBook(bucket, name, level) {
  return wizardBookLevel(bucket, level).some((entry) => sameSpell(entry, name));
}

// Adds a spell to the Wizard's spellbook, or takes it out — and then it is no
// longer prepared either.
export function withWizardBookToggled(bucket, level, name) {
  const wizardSpellbook = normalizeWizardBook(bucket?.wizardSpellbook);
  const current = wizardSpellbook[level] || [];
  const has = current.some((entry) => sameSpell(entry, name));
  wizardSpellbook[level] = has ? current.filter((entry) => !sameSpell(entry, name)) : [...current, name];
  return has ? { wizardSpellbook, ...withoutSpellPicked(bucket, level, name) } : { wizardSpellbook };
}
