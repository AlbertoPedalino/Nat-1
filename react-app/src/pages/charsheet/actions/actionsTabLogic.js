import {
  classEntities,
  primaryClassLevel,
} from '../../../shared/character/progression/classLevel.js';
import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { adapterEntryApplies } from '../../../shared/character/progression/choiceUtils.js';
import {
  featDescriptionEntries,
  featNamedEntries,
} from '../../../shared/character/progression/featDescription.js';
import { parseBeastActions } from '../../../shared/character/forms/beasts.js';
import { getActiveWildShape } from '../../../shared/character/forms/wildShapeForm.js';
import { alpha } from '@mui/material';
import {
  ACTION_COLORS,
  CHIP_TONES,
  ENTITY_COLORS,
  ITEM_ATTUNEMENT,
} from '../../../shared/ui/entityColors.js';
import {
  getActionRollers,
  resolveActionRollers,
} from '../../../shared/character/dice/rollers.js';
import { ownedFeatNames } from '../../../shared/character/progression/selectedFeats.js';
import { matchKey } from '../../../shared/content/nameKeys.js';

export { getActionRollers } from '../../../shared/character/dice/rollers.js';

export const FILTERS = ['all', 'action', 'bonus', 'reaction', 'special'];
// Weapon/unarmed attacks get a red left-bar so attacks stand apart from other
// Actions at a glance; the rest follow the shared action-economy colours.
export const CAT_COLORS = { ...ACTION_COLORS, attack: '#de675f' };
// 'special' = features used with no action or on a trigger (Lengthened Strike,
// Umbral Form, Portal Step…), shown in the "Other" section.
const EXECUTABLE_CATS = new Set(['attack', 'action', 'bonus', 'reaction', 'special']);
export const SECTION_DEFS = [
  { key: 'action', title: 'Actions', cats: ['action', 'attack'] },
  { key: 'bonus', title: 'Bonus Actions', cats: ['bonus'] },
  { key: 'reaction', title: 'Reactions', cats: ['reaction'] },
  { key: 'special', title: 'Other', cats: ['special'] },
];

// Action-tab tags render as MiniBadges — the same primitive the spell tab uses —
// so a tag reads identically across both tabs. Each is keyed by a semantic tone:
// status/fact tones from CHIP_TONES, source tones from an entity-kind colour
// (Wild Shape = class). bg follows the spell-tab convention of a 0.16 tint.
const TAG_TONES = {
  mastery:    CHIP_TONES.mastery,    // active weapon mastery
  noprof:     CHIP_TONES.negative,   // warning: non-proficient
  slot:       CHIP_TONES.info,       // neutral fact: weapon hand
  inlinePill: CHIP_TONES.info,       // neutral fact: range/DC/etc.
  wildShape:  ENTITY_COLORS.class,   // source: form-granted (class colour)
  weaponNote: ENTITY_COLORS.feat,    // source: feat rule reminder (e.g. GWM)
  itemProperty: ITEM_ATTUNEMENT,     // source: rule an item plan adds (Repeating Shot)
};

// A MiniBadge descriptor ({ key, label, color, bg }) for a semantic tone.
function tagBadge(key, tone, label) {
  const color = TAG_TONES[tone];
  return { key, label, color, bg: alpha(color, 0.16) };
}

export function buildActionTags(action, C) {
  const tags = [];
  const ownerLevel = action.ownerLevel ?? primaryClassLevel(C);

  if (action._wildShapeTag) {
    tags.push(tagBadge('wildshape', 'wildShape', 'Wild Shape'));
  }
  if (action._weaponMastery) {
    tags.push(tagBadge('mastery', 'mastery', action._weaponMastery));
  }
  if (action._itemProperty) {
    tags.push(tagBadge('item-property', 'itemProperty', action._itemProperty.tag));
  }
  // One tag per feat: its rules on this weapon share it, and each is spelled
  // out in the expanded card.
  const noteTags = new Set();
  (action._weaponNotes || []).forEach((note) => {
    if (!note.tag || noteTags.has(note.tag)) return;
    noteTags.add(note.tag);
    tags.push(tagBadge(`note-${note.key}`, 'weaponNote', note.tag));
  });
  if (action._notProficient) {
    tags.push(tagBadge('noprof', 'noprof', 'No Prof'));
  }
  if (action._weaponSlot) {
    tags.push(tagBadge('slot', 'slot', action._weaponSlot));
  }

  // Convention: an adapter's `inlinePills` are for facts the action's resource
  // bar can't show (range, duration, save DC, THP amount, a chosen damage type,
  // etc.). Never add a pill that just restates the action's own resource-bar
  // value — e.g. a "Pool = level×5 HP" pill on an action whose resKey already
  // tracks that pool. That's redundant; let the bar own the number.
  const pills = typeof action.inlinePills === 'function'
    ? action.inlinePills({ character: C, ownerLevel })
    : (Array.isArray(action.inlinePills) ? action.inlinePills : []);
  pills.forEach((pill, idx) => {
    const label = `${pill.label || ''}${pill.value != null ? ` ${pill.value}` : ''}`.trim();
    if (label) {
      tags.push(tagBadge(`pill-${idx}`, 'inlinePill', label));
    }
  });

  return { ...action, tags };
}

// Single source of truth lives in restResources (handles string formulas like
// 'proficiencyBonus' + function form). Re-exported so ActionsTab builds its
// resource-max map from the same resolver instead of a divergent copy.
export { normalizeResourceMax } from '../resources/restResources.js';

function actionDedupeKey(item) {
  return [
    matchKey(item.name || item.key || ''),
    matchKey(item.resKey || ''),
    matchKey(item.cat || ''),
    String(item.minLevel || ''),
  ].join('|');
}

function actionSpecificityScore(item) {
  let score = 0;
  if (!item?._runtimeFallback) score += 100;
  if (item?.desc) score += 10;
  if (getActionRollers(item).length || item?.attackBonus != null) score += 5;
  if (item?.ownerName && !/^(runtime|feat)$/i.test(String(item.ownerName))) score += 1;
  return score;
}

function uniqBySignature(items) {
  const byKey = new Map();

  items.forEach((item) => {
    const key = actionDedupeKey(item);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, item);
      return;
    }

    // Prefer live registry data over serialized adapterRuntime fallback.
    if (actionSpecificityScore(item) > actionSpecificityScore(existing)) {
      byKey.set(key, item);
    }
  });

  return [...byKey.values()];
}

function isExecutableAction(action) {
  const cat = String(action?.cat || '').toLowerCase();
  if (!EXECUTABLE_CATS.has(cat)) return false;
  // Adapters no longer register passive cards; older saves' adapterRuntime may.
  if (action.passive) return false;
  return true;
}

export function resolveActionFormulas(action, C) {
  if (!action) return action;
  const ownerLv = action.ownerLevel ?? primaryClassLevel(C);
  const ctx = { character: C, ownerLevel: ownerLv };
  const patch = {};

  const rollers = getActionRollers(action);
  if (rollers.length) {
    patch.rollers = resolveActionRollers(action, ctx);
  }
  if (typeof action.attackBonus === 'function') {
    const resolved = action.attackBonus(ctx);
    if (Number.isFinite(resolved)) patch.attackBonus = resolved;
  }
  if (Object.keys(patch).length) return { ...action, ...patch };

  return action;
}

// Normalize feature names so lookups survive minor adapter/data drift:
//   "Action Surge (One Use)" → "actionsurge"
//   "Maneuvers: Trip Attack" → "maneuverstripattack" (full) + "tripattack" (tail)
function nameKey(value) {
  return String(value || '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '').trim();
}

function nameKeyCandidates(value) {
  const raw = String(value || '');
  const candidates = new Set();
  const full = nameKey(raw);
  if (full) candidates.add(full);
  const colonParts = raw.split(':').map((s) => s.trim()).filter(Boolean);
  if (colonParts.length > 1) {
    colonParts.forEach((part) => {
      const key = nameKey(part);
      if (key) candidates.add(key);
    });
  }
  return Array.from(candidates);
}

const _featureKeyConflicts = typeof Set === 'function' ? new Set() : null;
function reportKeyConflict(scope, key, existingName, incomingName) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
  if (!_featureKeyConflicts) return;
  const cacheKey = `${scope}|${key}`;
  if (_featureKeyConflicts.has(cacheKey)) return;
  _featureKeyConflicts.add(cacheKey);
  // eslint-disable-next-line no-console
  console.warn(`[actions] Feature-name collision in ${scope}: "${existingName}" and "${incomingName}" both normalize to "${key}". Keeping first.`);
}

function collectNamedEntries(entries, scope) {
  const map = new Map();
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node !== 'object') return;
    if (node.name && Array.isArray(node.entries)) {
      const key = nameKey(node.name);
      if (key) {
        const existing = map.get(key);
        if (!existing) {
          map.set(key, Object.assign(node.entries.slice(), { _name: node.name }));
        } else if (existing._name !== node.name) {
          reportKeyConflict(scope, key, existing._name, node.name);
        }
      }
    }
    if (Array.isArray(node.entries)) walk(node.entries);
    if (Array.isArray(node.items)) walk(node.items);
  };
  walk(entries);
  return map;
}

function buildFeatureMapFromRecords(records, scope) {
  const map = new Map();
  const indexNamedNode = (node) => {
    if (!node || typeof node !== 'object') return;
    const entriesArr = Array.isArray(node.entries)
      ? node.entries
      : (Array.isArray(node.items) ? node.items : null);
    if (node.name && entriesArr) {
      const key = nameKey(node.name);
      if (key) {
        const existing = map.get(key);
        if (!existing) {
          map.set(key, Object.assign(entriesArr.slice(), { _name: node.name }));
        } else if (existing._name !== node.name) {
          reportKeyConflict(scope, key, existing._name, node.name);
        }
      }
    }
    if (Array.isArray(node.entries)) node.entries.forEach(indexNamedNode);
    if (Array.isArray(node.items)) node.items.forEach(indexNamedNode);
  };
  (records || []).forEach((feature) => {
    if (!feature?.name || !Array.isArray(feature.entries)) return;
    indexNamedNode(feature);
  });
  return map;
}

const _missingDescWarned = typeof Set === 'function' ? new Set() : null;
function warnMissingDescription(action, source) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
  if (!_missingDescWarned) return;
  const key = `${source || ''}|${action?.name || ''}`;
  if (_missingDescWarned.has(key)) return;
  _missingDescWarned.add(key);
  // eslint-disable-next-line no-console
  console.warn(`[actions] No description for "${action?.name}" (source: ${source || 'unknown'}). Add a matching 5etools feature entry or set entryName.`);
}

/**
 * Action card descriptions come solely from `action.entries`, auto-resolved
 * from character snapshots (XPHB / XDMG / EFA / FRAiF / FRHoF) via the
 * feature-name maps built below.
 *
 * A feat action may set `entryName` to show only that named benefit of the feat
 * (Great Weapon Master → "Hew") instead of the whole feat description.
 *
 * Adapters carry no description text. Characters saved before that may still
 * hold `desc` / `descOverride` in adapterRuntime; they are dropped below and
 * never rendered. When the snapshot lookup fails (and the action isn't
 * flagged `noDescription`), a dev-mode warning is emitted so the missing
 * feature mapping can be fixed.
 */
export function collectAdapterActions(C, sheet) {
  const out = [];
  const featSnapshotByName = new Map();
  (C?.allFeatSnapshots || []).forEach((feat) => {
    if (!feat?.name) return;
    const key = nameKey(feat.name);
    if (!key) return;
    const existing = featSnapshotByName.get(key);
    if (!existing) featSnapshotByName.set(key, feat);
    else if (existing.name !== feat.name) reportKeyConflict('feats', key, existing.name, feat.name);
  });
  const classFeatureByName = buildFeatureMapFromRecords(C?.allClassFeatures, 'class features');
  const subclassFeatureByName = buildFeatureMapFromRecords(C?.allSubFeatures, 'subclass features');
  const extraFeatureMaps = (C?.extraClasses || []).flatMap((extra, idx) => [
    buildFeatureMapFromRecords(extra?.allClassFeatures, `extra class features [${idx}]`),
    buildFeatureMapFromRecords(extra?.allSubFeatures, `extra subclass features [${idx}]`),
  ]);
  const speciesFeatureByName = collectNamedEntries(C?.speciesSnapshot?.entries || [], 'species features');
  const backgroundFeatureByName = collectNamedEntries(C?.backgroundSnapshot?.entries || [], 'background features');
  const optionalFeatureByName = new Map();
  (C?.optionalFeatureEntries || []).forEach((f) => {
    if (f?.name && Array.isArray(f.entries)) optionalFeatureByName.set(nameKey(f.name), f.entries);
  });

  const lookupByName = (key) => {
    if (!key) return null;
    if (classFeatureByName.has(key)) return classFeatureByName.get(key);
    if (subclassFeatureByName.has(key)) return subclassFeatureByName.get(key);
    for (const map of extraFeatureMaps) if (map.has(key)) return map.get(key);
    if (speciesFeatureByName.has(key)) return speciesFeatureByName.get(key);
    if (backgroundFeatureByName.has(key)) return backgroundFeatureByName.get(key);
    if (optionalFeatureByName.has(key)) return optionalFeatureByName.get(key);
    return null;
  };

  const resolveOfficialEntries = (action, source) => {
    if (action.entries) return action.entries;
    const ownerCandidates = nameKeyCandidates(action.ownerName || source);
    for (const candidate of ownerCandidates) {
      const feat = featSnapshotByName.get(candidate);
      if (feat) {
        const entries = (action.entryName && featNamedEntries(feat, action.entryName)) || featDescriptionEntries(feat);
        if (entries.length) return entries;
      }
    }
    const actionCandidates = nameKeyCandidates(action.name);
    for (const candidate of actionCandidates) {
      const entries = lookupByName(candidate);
      if (entries) return entries;
    }
    return null;
  };

  const pushFiltered = (arr, source, ownerLevel = C?.level ?? 1) => {
    (arr || []).forEach(a => {
      if (!a || !a.name) return;
      const lv = Number(a.ownerLevel ?? ownerLevel ?? C?.level ?? 1);
      if (a.minLevel && lv < Number(a.minLevel)) return;
      if (!adapterEntryApplies(a, C, sheet)) return;
      if (!isExecutableAction(a)) return;
      const officialEntries = resolveOfficialEntries(a, source);
      if (!officialEntries && !a.noDescription) {
        warnMissingDescription(a, source);
      }
      const { desc: _legacyDesc, descOverride: _legacyOverride, ...rest } = a;
      out.push({
        ...rest,
        ownerLevel: lv,
        ownerName: a.ownerName || source,
        _source: a.ownerName || source,
        entries: officialEntries || null,
      });
    });
  };

  // Prefer live registry data so function properties such as condition/max/formula survive
  // after the character has been serialized to localStorage.
  classEntities(C).forEach((entity) => {
    pushFiltered(installedRegistry.getClassSheetActions(entity.className), entity.ownerName, entity.level);
    if (entity.subclassShortName) {
      pushFiltered(
        installedRegistry.getSubclassSheetActions(entity.className, entity.subclassShortName),
        `${entity.subclassShortName} (${entity.className})`,
        entity.level,
      );
    }
  });
  if (C?.speciesName) {
    pushFiltered(installedRegistry.getSpeciesSheetActions(C.speciesName, C.speciesSource), C.speciesName, C.level || 1);
  }
  ownedFeatNames(C).forEach((featName) => {
    pushFiltered(installedRegistry.getFeatSheetActions(featName), featName, C.level || 1);
  });

  // Fallback for older exported characters that already contain adapterRuntime.
  // Serialized adapterRuntime loses function properties such as `condition`, so use it
  // only if the live registry produced nothing.
  if (!out.length) {
    const runtime = C?.adapterRuntime || {};
    pushFiltered((runtime.classActions || []).map((a) => ({ ...a, _runtimeFallback: true })), C?.className || '', primaryClassLevel(C));
    pushFiltered((runtime.subclassActions || []).map((a) => ({ ...a, _runtimeFallback: true })), C?.subclassShortName ? `${C.subclassShortName} (${C.className})` : '', primaryClassLevel(C));
    pushFiltered((runtime.speciesActions || []).map((a) => ({ ...a, _runtimeFallback: true })), C?.speciesName || '', C?.level || 1);
    pushFiltered((runtime.featActions || []).map((a) => ({ ...a, _runtimeFallback: true })), 'Feat', C?.level || 1);
  }

  return uniqBySignature(out);
}

// Beast attacks/actions while Wild Shaped → action cards. Reads the active form
// snapshot on the character (no beast DB needed here): attacks become rollable
// attack cards (beast's own to-hit + damage), other actions become info cards.
export function makeWildShapeActions(C) {
  const active = getActiveWildShape(C);
  if (!active?.beast) return [];
  const beast = active.beast;
  const beastName = beast.name;
  // Every form-granted action/attack/bonus/reaction shares the section list with
  // the Druid's own, so each carries a "Wild Shape" tag to mark its source.
  const toCard = (a, cat) => {
    const rollers = (a.damage || []).map((formula, i) => ({
      kind: 'damage',
      formula,
      label: `Damage ${formula}`,
      key: `wildshape-dmg-${i}`,
    }));
    return {
      name: a.name,
      cat,
      uses: 'Wild Shape',
      _source: `Wild Shape (${beastName})`,
      _colorBarCat: a.isAttack ? 'attack' : undefined,
      _wildShapeTag: true,
      ...(a.attackBonus != null ? { attackBonus: a.attackBonus } : {}),
      ...(rollers.length ? { rollers } : {}),
      rollLabelPrefix: `${beastName}: ${a.name}`,
      entries: a.text ? [a.text] : null,
      noDescription: !a.text,
    };
  };
  return [
    ...parseBeastActions(beast.actions).map((a) => toCard(a, a.isAttack ? 'attack' : 'action')),
    ...parseBeastActions(beast.bonusActions).map((a) => toCard(a, 'bonus')),
    ...parseBeastActions(beast.reactions).map((a) => toCard(a, 'reaction')),
  ];
}
