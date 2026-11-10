import { matchKey, stripSource } from '../../content/nameKeys.js';
import { CORE_2024_SOURCE_PRIORITY, sourceRank } from '../../content/sourcePriority.js';
import { compareText } from '../../lists.js';
// Shared resolver for live optional-feature descriptions loaded from
// optionalfeatures.json (see loadOptionalFeatures). Used by both the builder
// (ClassStep) and the character sheet (FeaturesTab) so live 2024 entries render
// from a single source instead of hardcoded text.

// Build a lookup `(name) => entries[] | null` over a loaded optional-feature list.
// When `featureType` is provided (e.g. 'EI' = Eldritch Invocation) only features of
// that type are matched; pass null to match by name across all types. Names are
// matched case/punctuation-insensitively; the first feature for a name wins.
export function buildOptionalFeatureEntryLookup(optionalFeatures, featureType = null) {
  const wantType = featureType ? String(featureType).toLowerCase() : null;
  const index = new Map();
  (optionalFeatures || []).forEach((feature) => {
    if (!feature?.name || !Array.isArray(feature.entries) || !feature.entries.length) return;
    if (wantType) {
      const types = Array.isArray(feature.featureType)
        ? feature.featureType
        : (feature.featureType ? [feature.featureType] : []);
      if (!types.some((t) => String(t).toLowerCase() === wantType)) return;
    }
    const key = matchKey(feature.name);
    if (!index.has(key)) index.set(key, feature.entries);
  });
  return (name) => index.get(matchKey(name)) || null;
}

function featureTypes(feature) {
  return (Array.isArray(feature?.featureType) ? feature.featureType : [feature?.featureType])
    .filter(Boolean)
    .map((type) => String(type).toLowerCase());
}

// The options a class feature offers, from the loaded optional features of one
// `featureType` ('MV:B' Battle Master maneuvers, 'MM' Metamagic, 'AS' Arcane
// Shots, 'EI' Eldritch Invocations), each once (the highest-priority source),
// by name: { name, minLevel, prereqs } — the class level and the other options
// its 5etools prerequisite asks for.
export function optionalFeatureOptions(optionalFeatures, featureType) {
  const wantType = String(featureType || '').toLowerCase();
  const byName = new Map();
  (optionalFeatures || []).forEach((feature) => {
    if (!feature?.name || !featureTypes(feature).includes(wantType)) return;
    const key = matchKey(feature.name);
    const held = byName.get(key);
    if (held && sourceRank(held.source, CORE_2024_SOURCE_PRIORITY) <= sourceRank(feature.source, CORE_2024_SOURCE_PRIORITY)) return;
    byName.set(key, feature);
  });
  return [...byName.values()].map((feature) => {
    const prerequisites = Array.isArray(feature.prerequisite) ? feature.prerequisite : [];
    const minLevel = Math.max(1, ...prerequisites.map((p) => Number(p?.level?.level || 1)));
    const prereqs = prerequisites.flatMap((p) => (p?.optionalfeature || []).map((ref) => stripSource(ref)));
    return { name: feature.name, minLevel, prereqs };
  }).sort((a, b) => compareText(a.name, b.name));
}
