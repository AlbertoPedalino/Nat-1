import { isFeatDetailKey } from '../featChoiceKeys.js';
import { installedRegistry } from '../../adapters/index.js';

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

function camelToTitle(value) {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function backgroundOriginFeat(background) {
  if (!background) return null;
  if (background.feat) return { fixed: background.feat };
  const feats = Array.isArray(background.feats) ? background.feats : [];
  const first = feats[0];
  if (!first) return null;
  const keys = Object.keys(first).filter((key) => key !== 'choose');
  if (!keys.length) return null;
  const raw = String(keys[0] || '').split(';')[0].trim().split('|')[0];
  const classHint = (() => {
    const semicol = String(keys[0] || '').split(';').slice(1).map((value) => value.trim().split('|')[0]).find(Boolean);
    if (semicol) return semicol.toLowerCase().replace(/[^a-z]/g, '');
    const pipeParts = String(keys[0] || '').split('|').map((value) => value.trim()).filter(Boolean);
    if (pipeParts.length >= 3) return pipeParts[2].toLowerCase().replace(/[^a-z]/g, '');
    return null;
  })();
  return { fixed: camelToTitle(raw), classHint };
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
  const origin = backgroundOriginFeat(character?.backgroundObj);
  return origin?.fixed ? [origin.fixed] : [];
}

function fromSpecies(character) {
  const feats = Array.isArray(character?.speciesObj?.feats) ? character.speciesObj.feats : [];
  const out = [];
  feats.forEach((entry) => {
    if (typeof entry === 'string') { out.push(entry); return; }
    if (!entry || typeof entry !== 'object') return;
    Object.keys(entry)
      .filter((key) => key !== 'choose' && entry[key])
      .map((key) => String(key).split(';')[0].split('|')[0].trim())
      .filter(Boolean)
      .forEach((raw) => out.push(camelToTitle(raw)));
  });
  return out;
}

const FEAT_SOURCES = [fromChoices, fromBackground, fromSpecies];

const ownedNamesCache = new WeakMap();

function cacheKey(character) {
  return [character.choices, character.backgroundObj, character.speciesObj];
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
