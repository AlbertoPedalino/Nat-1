// Beast statblock helpers for Druid Wild Shape.
//
// 5etools bestiary records are verbose and shaped differently from our sheet
// model. `normalizeBeast` projects a raw record into a compact, stable shape
// consumed by the builder picker, the sheet form resolver, and the stat-override
// layer. Keep this the single source of truth for beast parsing so the builder
// and the sheet can never disagree on a form's numbers.

import { isAllowedSource, BEAST_ALLOWED_SOURCES } from './sourcePriority.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

// Known Beast forms by Druid level (XPHB 2024 "Beast Shapes" table): 4 at lv.2,
// 6 at lv.4, 8 at lv.8. You may swap one known form per Long Rest.
export function wildShapeKnownFormsLimit(druidLevel) {
  const lv = Number(druidLevel || 0);
  if (lv >= 8) return 8;
  if (lv >= 4) return 6;
  if (lv >= 2) return 4;
  return 0;
}

const norm = (value) => String(value || '').split('|')[0].trim();

// CR may be a string ('1/4'), a number, or an object ({ cr: '1/4', ... }).
export function parseCr(cr) {
  const raw = cr && typeof cr === 'object' ? cr.cr : cr;
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (text.includes('/')) {
    const [num, den] = text.split('/').map(Number);
    return den ? num / den : null;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function formatCr(crNum) {
  if (crNum == null) return '—';
  if (crNum === 0.125) return '1/8';
  if (crNum === 0.25) return '1/4';
  if (crNum === 0.5) return '1/2';
  return String(crNum);
}

// Wild Shape max CR by Druid level (XPHB 2024): 1/4 at lv.2, 1/2 at lv.4, 1 at lv.8.
export function wildShapeMaxCr(druidLevel) {
  const lv = Number(druidLevel || 0);
  if (lv >= 8) return 1;
  if (lv >= 4) return 0.5;
  if (lv >= 2) return 0.25;
  return 0;
}

function isBeastType(raw) {
  const t = raw?.type;
  const typeStr = t && typeof t === 'object' ? t.type : t;
  return String(typeStr || '').toLowerCase() === 'beast';
}

// Swarms aren't a single creature, so they're never a valid Wild Shape form.
// 5etools marks them with a `swarmSize` on the type object; the name is a
// belt-and-braces fallback ("Swarm of Bats" pre-2024, "Bat Swarm" in XMM).
function isSwarm(raw) {
  const t = raw?.type;
  if (t && typeof t === 'object' && t.swarmSize) return true;
  return /\bswarm\b/i.test(String(raw?.name || ''));
}

export function recordIsBeast(raw) {
  return Boolean(raw?.name) && isBeastType(raw) && !isSwarm(raw);
}

function firstAc(raw) {
  const ac = Array.isArray(raw?.ac) ? raw.ac[0] : raw?.ac;
  if (ac == null) return { value: null, from: '' };
  if (typeof ac === 'number') return { value: ac, from: '' };
  return { value: Number(ac.ac) || null, from: Array.isArray(ac.from) ? ac.from.map(norm).join(', ') : '' };
}

function normalizeSpeed(raw) {
  const speed = raw?.speed;
  if (!speed || typeof speed !== 'object') {
    return { walk: typeof speed === 'number' ? speed : 0 };
  }
  const out = {};
  ['walk', 'fly', 'swim', 'climb', 'burrow'].forEach((mode) => {
    const v = speed[mode];
    if (v == null) return;
    const n = typeof v === 'object' ? Number(v.number) : Number(v);
    if (Number.isFinite(n)) out[mode] = n;
  });
  if (speed.canHover || (typeof speed.fly === 'object' && speed.fly?.condition?.includes('hover'))) out.hover = true;
  return out;
}

function normalizeSize(raw) {
  const SIZE = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' };
  const s = Array.isArray(raw?.size) ? raw.size[0] : raw?.size;
  return SIZE[s] || s || '';
}

// Beast stat blocks list saving throws as signed totals, e.g.
// `"save": { "con": "+5", "wis": "+3" }`. Project them to a numeric map; the
// value is the form's *final* save bonus (it already bakes in the beast's own
// ability modifier and proficiency), so consumers use it verbatim.
// Project a 5etools `{ key: "+5" }` map (saves, skills) into a numeric map.
// `keyFor` normalizes/filters each key (returns '' to drop it); values are the
// stat block's final signed bonuses, kept verbatim.
function parseSignedBonusMap(obj, keyFor) {
  const out = {};
  if (obj && typeof obj === 'object') {
    Object.entries(obj).forEach(([k, v]) => {
      const key = keyFor(k);
      if (!key) return;
      const n = Number(String(v).replace(/[^0-9+-]/g, ''));
      if (Number.isFinite(n)) out[key] = n;
    });
  }
  return out;
}

// Saves keyed by ability ("con"); skills by a letters-only name ("animalhandling")
// so they match our SKILLS entries under the same normalization.
const normalizeSaves = (raw) => parseSignedBonusMap(raw?.save, (k) => {
  const key = String(k).toLowerCase();
  return ABILITIES.includes(key) ? key : '';
});
const normalizeSkills = (raw) => parseSignedBonusMap(raw?.skill, (k) => String(k).toLowerCase().replace(/[^a-z]/g, ''));

// Project a raw 5etools beast into the compact sheet shape.
export function normalizeBeast(raw) {
  if (!recordIsBeast(raw)) return null;
  // Only beasts from supported 2024 sources (XMM + the core manuals) may be
  // assumed; this guards against bestiary files carrying disallowed reprints.
  if (!isAllowedSource(raw.source, BEAST_ALLOWED_SOURCES)) return null;
  const crNum = parseCr(raw.cr);
  const ac = firstAc(raw);
  const abilities = {};
  ABILITIES.forEach((key) => { abilities[key] = Number(raw[key] ?? 10); });
  const hp = raw.hp || {};
  return {
    name: String(raw.name),
    source: String(raw.source || ''),
    size: normalizeSize(raw),
    crNum,
    cr: formatCr(crNum),
    ac: ac.value,
    acFrom: ac.from,
    hp: { average: Number(hp.average) || 0, formula: String(hp.formula || '') },
    abilities,
    // Final saving-throw / skill bonuses the form lists (e.g. { con: 5 } /
    // { perception: 5 }). RAW 2024: while transformed you use these when higher
    // than your own — see getSaveBonus / getSkillBonus.
    saves: normalizeSaves(raw),
    skills: normalizeSkills(raw),
    speed: normalizeSpeed(raw),
    senses: Array.isArray(raw.senses) ? raw.senses.map(norm) : [],
    passivePerception: Number(raw.passive) || null,
    actions: Array.isArray(raw.action) ? raw.action : [],
    bonusActions: Array.isArray(raw.bonus) ? raw.bonus : [],
    reactions: Array.isArray(raw.reaction) ? raw.reaction : [],
    traits: Array.isArray(raw.trait) ? raw.trait : [],
  };
}

// 5e.tools bestiary page URL for a beast. Mirrors the encounter builder's slug
// (UrlUtil.getSluggedHash of `${name}_${source}`): lowercase, strip diacritics,
// drop non-word chars, spaces/underscores → hyphens.
export function beast5eToolsUrl(name, source) {
  if (!name || !source) return null;
  const slug = `${name}_${source}`
    .trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w ]+/g, '')
    .replace(/[ _]+/g, '-');
  return `https://5e.tools/bestiary/${slug}.html`;
}

// Stable reference string for a chosen form, mirroring the item-choice scheme.
export function beastRefValue(beast) {
  if (!beast?.name) return '';
  return `${beast.name}|${beast.source || ''}`;
}

export function parseBeastRef(value) {
  const [name, source = ''] = String(value || '').split('|');
  return name ? { name: name.trim(), source: source.trim() } : null;
}

export function findBeast(beastsDb, ref) {
  const parsed = typeof ref === 'string' ? parseBeastRef(ref) : ref;
  if (!parsed?.name) return null;
  const wantName = parsed.name.toLowerCase();
  const wantSource = String(parsed.source || '').toLowerCase();
  return (beastsDb || []).find((b) => (
    b.name.toLowerCase() === wantName
    && (!wantSource || String(b.source || '').toLowerCase() === wantSource)
  )) || null;
}

// Whether a form has a Flying Speed (gated until Druid level 8, RAW 2024).
export function beastHasFlySpeed(beast) {
  return Number(beast?.speed?.fly) > 0;
}

// Beasts a Druid of `druidLevel` may assume: CR ≤ cap, no swarms (already
// excluded at normalize time), and no Fly Speed before level 8. Sorted by CR
// then name.
export function eligibleBeasts(beastsDb, druidLevel) {
  const cap = wildShapeMaxCr(druidLevel);
  const allowFly = Number(druidLevel || 0) >= 8;
  return (beastsDb || [])
    .filter((b) => b.crNum != null && b.crNum <= cap && (allowFly || !beastHasFlySpeed(b)))
    .sort((a, b) => (a.crNum - b.crNum) || a.name.localeCompare(b.name));
}

// Find Familiar (XPHB 2024) eligible forms — used by the Druid's Wild Companion.
// The spell's familiar takes the form of "another Beast that has a Challenge
// Rating of 0" (the named Bat/Cat/Owl/… are all CR 0). Swarms are already
// excluded at normalize time. Sorted by name.
export function findFamiliarBeasts(beastsDb) {
  return (beastsDb || [])
    .filter((b) => b.crNum === 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Beast actions → rollable attack cards ────────────────────────────────────
// 5etools action prose carries inline tags: {@hit 5}, {@damage 1d8 + 3},
// {@atkr m}, {@h}, … `parseBeastActions` extracts the attack bonus + damage
// formulas and a clean description so the sheet can render real attack cards.

const HIT_RE = /\{@hit\s+(-?\d+)\}/i;
const DAMAGE_RE = /\{@(?:damage|dice)\s+([^}]+)\}/gi;

// "{@atkr m}" / "{@atkr m,r}" → "Melee Attack Roll:" / "Melee or Ranged Attack Roll:".
function formatAtkRoll(code) {
  const words = String(code).split(',')
    .map((p) => p.trim().toLowerCase())
    .map((p) => (p === 'm' ? 'Melee' : p === 'r' ? 'Ranged' : p))
    .filter(Boolean);
  return `${words.join(' or ')} Attack Roll:`;
}

function stripTags(text) {
  return String(text || '')
    // Attack-roll tags first, so they read as prose instead of bare "m 4".
    .replace(/\{@atkr?\s+([^}]*)\}/gi, (_m, p) => formatAtkRoll(p))
    .replace(/\{@hit\s+(-?\d+)\}/gi, (_m, n) => (Number(n) >= 0 ? `+${n}` : String(n)))
    .replace(/\{@h\}/gi, 'Hit: ')
    // Generic tags: keep the display text, drop any pipe-delimited metadata.
    .replace(/\{@\w+\s+([^}|]+)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@\w+\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

export function parseBeastActions(actions) {
  return (actions || []).map((action) => {
    const text = Array.isArray(action?.entries)
      ? action.entries.filter((e) => typeof e === 'string').join(' ')
      : '';
    const hit = text.match(HIT_RE);
    const damage = [...text.matchAll(DAMAGE_RE)].map((m) => m[1].replace(/\s+/g, ''));
    return {
      name: String(action?.name || 'Attack'),
      attackBonus: hit ? Number(hit[1]) : null,
      damage,
      text: stripTags(text),
      isAttack: !!hit,
    };
  });
}
