// Live rules text for the Senses panel, sourced from 5etools (same approach as
// weapon mastery / spells) so descriptions stay current instead of hardcoded.
//
// Two lookups, loaded once and cached:
//   - by sense type  (senses.json): generic senses — Blindsight, Darkvision,
//     Tremorsense, Truesight (PHB + XPHB; highest-priority source wins).
//   - by feature name (optionalfeatures.json + feats.json): senses granted by a
//     named feature — e.g. Devil's Sight (Eldritch Invocation), Telepathy feats.
//
// The Senses panel resolves a row's description by sense type first, then by the
// originating feature's name, then falls back to the raw effect note.

const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/';
const SOURCES = {
  senses: 'senses.json',
  optionalFeatures: 'optionalfeatures.json',
  feats: 'feats.json',
};

// Higher rank wins when the same name exists in multiple sources.
const SOURCE_RANK = { XPHB: 3, PHB: 2, MM: 1 };

const _byType = new Map(); // compactKey(sense name) -> { entries, rank }
const _byFeature = new Map(); // compactKey(feature name) -> { entries, rank }
let _loadPromise = null;

function compactKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function fetchJson(file) {
  const response = await fetch(BASE + file);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response.json();
}

// Insert into a lookup keeping the entry whose source ranks highest.
function upsert(map, name, source, entries) {
  if (!name || !Array.isArray(entries) || !entries.length) return;
  const rank = SOURCE_RANK[source] || 0;
  const key = compactKey(name);
  const existing = map.get(key);
  if (!existing || rank > existing.rank) map.set(key, { entries, rank });
}

export async function loadSenseDescriptions() {
  if (_byType.size > 0 || _byFeature.size > 0) return;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    const [senses, optionalFeatures, feats] = await Promise.allSettled([
      fetchJson(SOURCES.senses),
      fetchJson(SOURCES.optionalFeatures),
      fetchJson(SOURCES.feats),
    ]);
    if (senses.status === 'fulfilled') {
      (senses.value?.sense || []).forEach((s) => upsert(_byType, s.name, s.source, s.entries));
    }
    if (optionalFeatures.status === 'fulfilled') {
      (optionalFeatures.value?.optionalfeature || []).forEach((f) => upsert(_byFeature, f.name, f.source, f.entries));
    }
    if (feats.status === 'fulfilled') {
      (feats.value?.feat || []).forEach((f) => upsert(_byFeature, f.name, f.source, f.entries));
    }
    // Total failure (e.g. offline): clear the cache so a later call retries
    // instead of permanently serving empty lookups.
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
