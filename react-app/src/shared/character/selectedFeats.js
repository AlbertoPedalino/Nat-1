import { isFeatDetailKey, featSlotOrigin } from '../featChoiceKeys.js';
import { installedRegistry } from '../../adapters/index.js';
import {
  backgroundGuaranteedFeatNames,
  backgroundOriginFeat as normalizeBackgroundOriginFeat,
} from './backgroundFeatOptions.js';

const FRAMEWORK_EXACT = new Set(['feat_origin', 'species_origin_feat']);
const FRAMEWORK_PREFIXES = ['feat_'];
const FRAMEWORK_PATTERNS = [
  /^mc\d+_feat_/,
  /^feat_asi_lv\d+$/,
  /_fighting_style$/,
  /_epic_boon$/,
];

function isChoiceFeatOwnerKey(key) {
  if (!key || isFeatDetailKey(key)) return false;
  if (FRAMEWORK_EXACT.has(key)) return true;
  for (let i = 0; i < FRAMEWORK_PREFIXES.length; i++) {
    if (key.startsWith(FRAMEWORK_PREFIXES[i])) return true;
  }
  for (let i = 0; i < FRAMEWORK_PATTERNS.length; i++) {
    if (FRAMEWORK_PATTERNS[i].test(key)) return true;
  }
  const exact = typeof installedRegistry?.getFeatOwnerKeyExact === 'function'
    ? installedRegistry.getFeatOwnerKeyExact()
    : null;
  if (exact && exact.has(key)) return true;
  const prefixes = typeof installedRegistry?.getFeatOwnerKeyPrefixes === 'function'
    ? installedRegistry.getFeatOwnerKeyPrefixes()
    : [];
  for (let i = 0; i < prefixes.length; i++) {
    if (key.startsWith(prefixes[i])) return true;
  }
  const patterns = typeof installedRegistry?.getFeatOwnerKeyPatterns === 'function'
    ? installedRegistry.getFeatOwnerKeyPatterns()
    : [];
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (pattern instanceof RegExp) {
      if (pattern.test(key)) return true;
    } else if (typeof pattern === 'function') {
      if (pattern(key)) return true;
    }
  }
  return false;
}

export function backgroundOriginFeat(background) {
  return normalizeBackgroundOriginFeat(background);
}

export function backgroundFeatNames(background) {
  return backgroundGuaranteedFeatNames(background);
}

function fromChoices(character) {
  const out = [];
  const choices = character?.choices || {};
  Object.entries(choices).forEach(([key, value]) => {
    if (!value) return;
    if (!isChoiceFeatOwnerKey(key)) return;
    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (typeof entry === 'string' && entry) out.push(entry);
    });
  });
  return out;
}

function fromBackground(character) {
  const origin = backgroundOriginFeat(character?.backgroundObj || character?.backgroundSnapshot);
  return origin?.fixed ? [origin.fixed] : [];
}

function fromSpecies(character) {
  const species = character?.speciesObj || character?.speciesSnapshot;
  const feats = Array.isArray(species?.feats) ? species.feats : [];
  const out = [];
  feats.forEach((entry) => {
    if (typeof entry === 'string') { out.push(entry); return; }
    if (!entry || typeof entry !== 'object') return;
    Object.keys(entry)
      .filter((key) => key !== 'choose' && entry[key])
      .map((key) => String(key).split(';')[0].split('|')[0].trim())
      .filter(Boolean)
      .forEach((raw) => out.push(raw.replace(/\b\w/g, (char) => char.toUpperCase())));
  });
  return out;
}

const FEAT_SOURCES = [fromChoices, fromBackground, fromSpecies];

const ownedNamesCache = new WeakMap();

function cacheKey(character) {
  return [
    character.choices,
    character.backgroundObj || character.backgroundSnapshot,
    character.speciesObj || character.speciesSnapshot,
  ];
}

function sameKey(a, b) {
  return !!a && !!b
    && a[0] === b[0]
    && a[1] === b[1]
    && a[2] === b[2];
}

export function collectOwnedFeatNames(character) {
  if (!character || typeof character !== 'object') return [];
  const key = cacheKey(character);
  const entry = ownedNamesCache.get(character);
  if (entry && sameKey(entry.key, key)) return entry.value;
  const set = new Set();
  FEAT_SOURCES.forEach((source) => {
    source(character).forEach((name) => {
      if (name) set.add(name);
    });
  });
  const value = [...set];
  ownedNamesCache.set(character, { key, value });
  return value;
}

export function getChoiceSelectedFeatNames(character) {
  return [...new Set(fromChoices(character))];
}

// Which entity granted a named feat to this character: 'background' (origin
// feat), 'species', or 'feat' (free/ASI slot). Resolves by name against each
// source, then maps the owning choice-slot key through `featSlotOrigin`. Used
// for provenance-coloured tags (e.g. crafted-item flags). Returns 'feat' when
// the character does not own the feat or its origin can't be determined.
export function featOriginKind(character, featName) {
  const target = String(featName || '').trim().toLowerCase();
  if (!target || !character || typeof character !== 'object') return 'feat';

  const bgNames = backgroundFeatNames(character.backgroundObj || character.backgroundSnapshot);
  if (bgNames.some((name) => name.toLowerCase() === target)) return 'background';

  if (fromSpecies(character).some((name) => name.toLowerCase() === target)) return 'species';

  const choices = character.choices || {};
  for (const [key, value] of Object.entries(choices)) {
    if (!value || !isChoiceFeatOwnerKey(key)) continue;
    const values = Array.isArray(value) ? value : [value];
    if (values.some((entry) => typeof entry === 'string' && entry.toLowerCase() === target)) {
      return featSlotOrigin(key);
    }
  }
  return 'feat';
}
