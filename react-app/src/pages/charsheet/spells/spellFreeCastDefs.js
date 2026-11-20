import { classEntities } from '../../../shared/character/progression/classLevel.js';
import { enumerateEntityGrants, enumerateSpeciesGrants, grantFreeCasts } from '../../../shared/character/spells/autoGrantedSpells.js';
import {
  mergeFreeCastsById,
  normalizeFreeCast,
  getFeatFreeCastTemplate,
} from '../../../shared/character/spells/spellFreeCasts.js';
import { collectItemAttachedSpells } from '../../../shared/character/inventory/itemAttachedSpells.js';
import { stripSource } from '../../../shared/content/nameKeys.js';
import { choiceKeyIsCantripChoice, featSpellSlotKey } from './spellChoiceKeys.js';
import { buildFeatMetaMap, collectFixedFeatSpells } from './featSpellMeta.js';
import { asArray } from '../../../shared/lists.js';

// Every free cast the character has (species, class and subclass grants, feat
// picks, fixed feat spells, items), merged by id: what a rest recovers.

export function getFreeCastDefsForCharacter(C) {
  const defs = [];
  // The same grants the spells tab lists (autoGrantedSpells.js), gated the same
  // way: a rest recovers exactly the free casts the tab shows.
  [
    ...enumerateSpeciesGrants(C),
    ...classEntities(C).flatMap((entity) => enumerateEntityGrants(entity, C)),
  ].forEach((grant) => defs.push(...grantFreeCasts(grant, C)));

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
