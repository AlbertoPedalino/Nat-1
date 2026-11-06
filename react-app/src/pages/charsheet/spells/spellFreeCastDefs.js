import { adapterRegistry } from '../../../adapters/registry.js';
import { filterByRequiredChoice } from '../../../shared/character/progression/lineageMatch.js';
import {
  collectFreeCastsForGrant,
  mergeFreeCastsById,
  normalizeFreeCast,
  getFeatFreeCastTemplate,
} from '../../../shared/character/spells/spellFreeCasts.js';
import { collectItemAttachedSpells } from '../../../shared/character/inventory/itemAttachedSpells.js';
import { stripSource } from '../../../shared/content/nameKeys.js';
import { spellModifierEntities } from './spellModifiers.js';
import { choiceKeyIsCantripChoice, featSpellSlotKey } from './spellChoiceKeys.js';
import { buildFeatMetaMap, collectFixedFeatSpells } from './featSpellMeta.js';
import { asArray } from '../../../shared/lists.js';

// Every free cast the character has (species, class and subclass grants, feat
// picks, fixed feat spells, items), merged by id: what a rest recovers.

export function getFreeCastDefsForCharacter(C) {
  const defs = [];
  const speciesCfg = adapterRegistry.getSpeciesRuntimeConfig(C?.speciesName, C?.speciesSource)?.spellcasting || {};
  filterByRequiredChoice([
    ...(speciesCfg.alwaysKnownSpells || []),
    ...(speciesCfg.alwaysPreparedSpells || []),
  ], C).forEach((entry) => {
    if (Number(C?.level || 1) < Number(entry.minLevel || 1)) return;
    defs.push(...collectFreeCastsForGrant(entry, {
      character: C,
      ownerLevel: Number(C?.level || 1),
      source: entry.source || C?.speciesName,
      sourceType: entry.sourceType || 'species',
      spellName: entry.name,
    }));
  });

  spellModifierEntities(C).forEach(({ className, subclassShortName, level }) => {
    const cfgs = [
      { cfg: adapterRegistry.getClassRuntimeConfig(className), type: 'class', label: className },
      { cfg: adapterRegistry.getSubclassRuntimeConfig(className, subclassShortName), type: 'subclass', label: subclassShortName || className },
    ];
    cfgs.forEach(({ cfg, type, label }) => {
      const sp = cfg?.spellcasting;
      if (!sp) return;
      [...(sp.alwaysKnownSpells || []), ...(sp.alwaysPreparedSpells || [])].forEach((entry) => {
        if (Number(level || 1) < Number(entry?.minLevel || 1)) return;
        defs.push(...collectFreeCastsForGrant(entry, {
          character: C,
          ownerLevel: Number(level || 1),
          source: entry.source || label,
          sourceType: entry.sourceType || type,
          spellName: entry.name,
        }));
      });
    });
  });

  const featMeta = buildFeatMetaMap(C);
  Object.entries(C?.choices || {}).forEach(([key, value]) => {
    const slotKey = featSpellSlotKey(C, key);
    const meta = slotKey ? featMeta.get(slotKey) : null;
    if (!meta) return;
    const isCantrip = choiceKeyIsCantripChoice(key);
    const tpl = getFeatFreeCastTemplate(meta.name, { isCantrip });
    if (!tpl) return;
    const values = asArray(value);
    values.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const name = stripSource(entry);
      if (!name) return;
      const fc = normalizeFreeCast(tpl, { character: C, sourceType: 'feat', source: meta.name, spellName: name });
      if (fc) defs.push(fc);
    });
  });
  collectFixedFeatSpells(C).forEach((grant) => {
    defs.push(...(grant.freeCasts || []));
  });

  // Item-attached spells with daily/limited uses (Cloak of the Bat, etc.).
  collectItemAttachedSpells(C).forEach((grant) => {
    if (!grant.freeCastTemplate) return;
    const fc = normalizeFreeCast(grant.freeCastTemplate, {
      character: C,
      sourceType: 'item',
      source: grant.itemName,
      spellName: grant.name,
    });
    if (fc) defs.push(fc);
  });

  return mergeFreeCastsById(defs);
}
