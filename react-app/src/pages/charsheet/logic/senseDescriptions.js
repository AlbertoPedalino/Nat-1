// Live rules text for the Senses panel. Builds two lookups from the shared
// 5etools loaders (getJson is memoized, so files already fetched elsewhere in
// the sheet — e.g. optionalfeatures via CharacterSheet — are reused, not
// re-downloaded):
//   - by sense type   (loadSenses):          Blindsight, Darkvision, Tremorsense,
//                                             Truesight (PHB + XPHB).
//   - by feature name (loadOptionalFeatures + loadFeats): senses granted by a
//                                             named feature — e.g. Devil's Sight.
//
// The Senses panel resolves a row's description by sense type first, then by the
// originating feature's name, then falls back to the raw effect note.

import { loadSenses, loadOptionalFeatures, loadFeats } from '../../charbuilder/logic/dataLoaders.js';
import { sourceRank, CORE_2024_SOURCE_PRIORITY } from '../../../shared/character/sourcePriority.js';

const _byType = new Map(); // compactKey(sense name) -> { entries, rank }
const _byFeature = new Map(); // compactKey(feature name) -> { entries, rank }
let _loadPromise = null;

function compactKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Insert into a lookup keeping the entry whose source ranks highest. Ranking is
// the shared 2024 priority (lower index = higher priority; non-2024 ranks last),
// so e.g. Darkvision picks the XPHB text over the legacy PHB one.
function upsert(map, name, source, entries) {
  if (!name || !Array.isArray(entries) || !entries.length) return;
  const rank = sourceRank(source, CORE_2024_SOURCE_PRIORITY);
  const key = compactKey(name);
  const existing = map.get(key);
  if (!existing || rank < existing.rank) map.set(key, { entries, rank });
}

export async function loadSenseDescriptions() {
  if (_byType.size > 0 || _byFeature.size > 0) return;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    const [senses, optionalFeatures, feats] = await Promise.allSettled([
      loadSenses(),
      loadOptionalFeatures(),
      loadFeats(),
    ]);
    if (senses.status === 'fulfilled') {
      senses.value.forEach((s) => upsert(_byType, s.name, s.source, s.entries));
    }
    if (optionalFeatures.status === 'fulfilled') {
      optionalFeatures.value.forEach((f) => upsert(_byFeature, f.name, f.source, f.entries));
    }
    if (feats.status === 'fulfilled') {
      feats.value.forEach((f) => upsert(_byFeature, f.name, f.source, f.entries));
    }
    // Total failure (e.g. offline): clear so a later call retries.
    if (_byType.size === 0 && _byFeature.size === 0) _loadPromise = null;
  })();
  return _loadPromise;
}

// 5etools `entries` for a generic sense type (camelCase maps to the rules name),
// or null when the sense isn't in senses.json.
export function getSenseDescriptionEntries(type) {
  return _byType.get(compactKey(type))?.entries || null;
}

// 5etools `entries` for a named feature (invocation/feat) that grants a sense,
// or null when not found.
export function getFeatureDescriptionEntries(name) {
  return _byFeature.get(compactKey(name))?.entries || null;
}
