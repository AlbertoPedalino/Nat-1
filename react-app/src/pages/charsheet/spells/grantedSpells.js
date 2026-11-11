import { adapterRegistry } from '../../../adapters/registry.js';
import { isGrantUnlocked } from '../../../shared/character/spells/spellGrants.js';
import {
  enumerateAutoGrantedSpells,
  grantSourceLabel,
} from '../../../shared/character/spells/autoGrantedSpells.js';
import {
  collectFreeCastsForGrant,
  mergeFreeCastsById,
  normalizeFreeCast,
  getFeatFreeCastTemplate,
} from '../../../shared/character/spells/spellFreeCasts.js';
import { isWarlockModifierCantripChoiceKey } from '../../../shared/character/progression/warlockUtils.js';
import { matchKey, stripSource } from '../../../shared/content/nameKeys.js';
import { SRC_COLOR, featSlotTone, unionSpellSources } from './spellSourceDisplay.js';
import {
  choiceKeyIsCantripChoice,
  choiceSpellSlotKey,
  featSpellSlotKey,
  ownerClassFromChoiceKey,
  sourceFromChoiceKey,
  speciesChoiceKeyMatchesActiveLineage,
} from './spellChoiceKeys.js';
import { getChoiceSpellAbility } from './spellAbility.js';
import { buildFeatMetaMap } from './featSpellMeta.js';
import { ABILITIES } from '../../../shared/content/rulesVocabulary.js';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';
import { asArray } from '../../../shared/lists.js';
import { titleCase } from '../../../shared/ui/textCase.js';

// Spells the character has through a grant rather than its class list, each
// with its source tag: at-will invocations, auto-granted spells (class,
// subclass, species) and spells picked in builder choices (feats, species,
// invocations). Fixed feat spells: featSpellMeta.js. Items and scrolls:
// shared/character/inventory/.

// Spells cast at will, without a slot or a limit: those of picked optional
// features (invocations), from their data.
export function collectAtWillSpells(C) {
  return enumerateAutoGrantedSpells(C)
    .filter((grant) => grant.atWill)
    .map((grant) => ({
      name: titleCase(grant.name),
      source: { label: grant.explicitSource || 'At Will', color: SRC_COLOR.choice, kind: 'atWill', originType: 'invocation', originLabel: grant.explicitSource || 'At Will' },
    }));
}

export function collectAutoGrantedSpells(C) {
  // Single shared entry point: class runtime config + subclass-feature text +
  // species, all gated & level-filtered. Project each canonical record into the
  // sheet's source-object shape (branching only on species vs class origin).
  const runtimeOut = enumerateAutoGrantedSpells(C).filter((r) => !r.atWill).map((r) => {
    if (r.origin === 'species') {
      const srcLabel = grantSourceLabel(r, C?.speciesName || 'Species');
      const sourceType = r.sourceType || 'species';
      return {
        name: r.name,
        level: Number(r.level ?? 0),
        source: { label: srcLabel, color: SRC_COLOR.species, originType: 'species', originLabel: C?.speciesName || 'Species' },
        ownerClassName: null,
        spellcastingAbility: r.ability,
        freeCasts: collectFreeCastsForGrant(r.entry, { character: C, ownerLevel: r.ownerLevel, source: srcLabel, sourceType, spellName: r.name }),
        spellOverrides: r.entry?.spellOverrides || null,
        modifiers: r.entry?.modifiers || [],
      };
    }
    const srcLabel = grantSourceLabel(r);
    const sourceType = r.sourceType || (r.explicitSource ? 'auto_granted' : (r.subclassShortName ? 'subclass' : 'class'));
    return {
      name: r.name,
      level: Number(r.level ?? 0),
      source: { label: srcLabel, color: SRC_COLOR[sourceType] || SRC_COLOR.granted, originType: sourceType, originLabel: srcLabel },
      ownerClassName: r.ownerClassName,
      ownerSubclassShortName: r.subclassShortName,
      spellcastingAbility: r.ability,
      freeCasts: collectFreeCastsForGrant(r.entry, { character: C, ownerLevel: r.ownerLevel, source: srcLabel, sourceType, spellName: r.name }),
      spellOverrides: r.entry?.spellOverrides || null,
      modifiers: r.entry?.modifiers || [],
    };
  });

  // Collapse same-named grants to one entry, but accumulate every contributing
  // source (and their free casts) so a spell granted by multiple origins — e.g.
  // a Forest Gnome Druid's Speak with Animals — keeps all its source tags.
  const runtimeByName = new Map();
  runtimeOut.forEach((entry) => {
    const key = matchKey(entry.name);
    if (!key) return;
    const existing = runtimeByName.get(key);
    if (existing) {
      existing.sources = unionSpellSources(existing.sources, [entry.source]);
      if (entry.freeCasts?.length) existing.freeCasts = mergeFreeCastsById(existing.freeCasts || [], entry.freeCasts);
      existing.spellcastingAbility = existing.spellcastingAbility || entry.spellcastingAbility;
      existing.ownerClassName = existing.ownerClassName || entry.ownerClassName;
      existing.ownerSubclassShortName = existing.ownerSubclassShortName || entry.ownerSubclassShortName;
      existing.spellOverrides = { ...(existing.spellOverrides || {}), ...(entry.spellOverrides || {}) };
      existing.modifiers = [...(existing.modifiers || []), ...(entry.modifiers || [])];
    } else {
      runtimeByName.set(key, { ...entry, sources: [entry.source] });
    }
  });

  (C?.autoGrantedSpells || []).forEach((entry) => {
    if (!entry?.name) return;
    const key = matchKey(entry.name);
    if (runtimeByName.has(key)) return;
    // Check invocation requirement from runtime config before falling back to saved data
    const ownerClass = entry.ownerClassName || C?.className;
    const cfg = ownerClass ? adapterRegistry.getClassRuntimeConfig(ownerClass)?.spellcasting : null;
    const allCfgSpells = [...(cfg?.alwaysKnownSpells || []), ...(cfg?.alwaysPreparedSpells || [])];
    const cfgEntry = allCfgSpells.find((s) => matchKey(s?.name || '') === key);
    if (cfgEntry && !isGrantUnlocked(cfgEntry, C)) return;
    const fallbackSource = { label: entry.source || 'Auto', color: SRC_COLOR[entry.sourceType] || SRC_COLOR.granted, originType: entry.sourceType || 'auto_granted', originLabel: entry.source || 'Auto' };
    runtimeByName.set(key, {
      name: entry.name,
      level: Number(entry.level ?? 0),
      source: fallbackSource,
      sources: [fallbackSource],
      ownerClassName: ownerClass,
      spellcastingAbility: entry.spellcastingAbility || entry.ability || null,
    });
  });

  return [...runtimeByName.values()];
}

export function collectChoiceSpells(C, spellIndex) {
  const featMetaMap = buildFeatMetaMap(C);
  const out = [];
  Object.entries(C?.choices || {}).forEach(([key, value]) => {
    const cleanKey = baseChoiceKey(key);
    if (isWarlockModifierCantripChoiceKey(cleanKey)) return;
    if (!speciesChoiceKeyMatchesActiveLineage(C, cleanKey)) return;
    const values = asArray(value);
    values.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const name = stripSource(entry);
      if (!name) return;
      // A picked spell is a value that names one, or one under a spell slot
      // key of the builder's own form; a key that merely says "spell" is not.
      if (!spellIndex.has(matchKey(name)) && !choiceSpellSlotKey(key)) return;
      if (ABILITIES.includes(matchKey(name))) return;
      const slotKey = featSpellSlotKey(C, key);
      const meta = slotKey ? featMetaMap.get(slotKey) : null;
      const ownerClassName = ownerClassFromChoiceKey(C, key);
      const spellLevelInfo = spellIndex.get(matchKey(name));
      const isCantrip = Number(spellLevelInfo?.level || 0) === 0 || choiceKeyIsCantripChoice(key);
      if (meta) {
        const featTpl = getFeatFreeCastTemplate(meta.name, { isCantrip });
        const freeCasts = featTpl
          ? [normalizeFreeCast(featTpl, { character: C, sourceType: 'feat', source: meta.name, spellName: name })].filter(Boolean)
          : [];
        out.push({
          name,
          source: { label: meta.name, color: featSlotTone(slotKey || key), originType: 'feat', originLabel: meta.name },
          spellcastingAbility: meta.ability,
          ownerClassName,
          freeCasts,
        });
      } else {
        out.push({
          name,
          source: sourceFromChoiceKey(C, key),
          spellcastingAbility: getChoiceSpellAbility(C, key),
          ownerClassName,
        });
      }
    });
  });
  return out;
}
