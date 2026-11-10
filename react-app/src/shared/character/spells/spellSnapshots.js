import { matchKey } from '../../content/nameKeys.js';

// The spell record stored on the character (`C.spellSnapshots`) and the
// one-record-per-name rule for spell lists.

export function toSnapshot(spell) {
  return {
    name: spell.name,
    level: spell.level ?? 0,
    school: spell.school,
    source: spell.source,
    components: spell.components,
    duration: spell.duration,
    range: spell.range,
    time: spell.time,
    ritual: !!spell.ritual,
    concentration: !!spell.concentration,
    entries: spell.entries || [],
    entriesHigherLevel: spell.entriesHigherLevel || null,
    descriptionEntries: spell.descriptionEntries || spell.entries || [],
    higherLevelEntries: spell.higherLevelEntries || spell.entriesHigherLevel || null,
    castingTimeLabel: spell.castingTimeLabel || spell.castingTime || null,
    rangeLabel: spell.rangeLabel || spell.rangeText || null,
    componentsLabel: spell.componentsLabel || null,
    materialLabel: spell.materialLabel || null,
    durationLabel: spell.durationLabel || spell.durationText || null,
    scalingLevelDice: spell.scalingLevelDice || null,
    spellAttack: spell.spellAttack || null,
    damageInflict: spell.damageInflict || null,
  };
}

export function upsertSnapshot(snapshots, snapshot) {
  const idx = snapshots.findIndex((entry) => matchKey(entry.name) === matchKey(snapshot.name));
  if (idx >= 0) return snapshots.map((entry, index) => (index === idx ? { ...entry, ...snapshot } : entry));
  return [...snapshots, snapshot];
}

export function dedupeSpells(spells) {
  const seen = new Set();
  return (spells || []).filter((spell) => {
    const key = matchKey(spell?.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
