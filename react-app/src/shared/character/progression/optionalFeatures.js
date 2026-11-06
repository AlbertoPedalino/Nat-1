import { matchKey } from '../../content/nameKeys.js';
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
