import { enumerateFixedAdditionalSpells } from '../../../shared/character/spells/additionalSpellGrants.js';
import { normalizeFreeCast } from '../../../shared/character/spells/spellFreeCasts.js';
import { lowerKey } from '../../../shared/content/nameKeys.js';
import {
  choiceSpellSlotKey,
  choiceValue,
  findFeatName,
  isFeatLikeSlotKey,
  ownerClassFromChoiceKey,
} from './spellChoiceKeys.js';
import { abilityKey } from '../../../shared/content/rulesVocabulary.js';
import { featSlotTone } from './spellSourceDisplay.js';

// The character's feats as spell grantors: which feat sits in each feat slot
// (with its chosen spellcasting ability and stored snapshot), and the fixed
// spells those feats grant.

// slotKey → { name, ability, snapshot } for every owned feat with a snapshot.
// Feats whose slot cannot be found get a `feat_snapshot_<index>` key.
export function buildFeatMetaMap(C) {
  const map = new Map();
  const choices = C?.choices || {};
  const snapshots = Array.isArray(C?.allFeatSnapshots) ? C.allFeatSnapshots : [];
  const snapshotByName = new Map(snapshots.map((feat) => [lowerKey(feat?.name), feat]));
  const addMeta = (slotKey, name) => {
    const snapshot = snapshotByName.get(lowerKey(name));
    if (!slotKey || !snapshot || map.has(slotKey)) return;
    const abilityChoiceKey = `${slotKey}_spell_ability`;
    const ability = abilityKey(
      choiceValue(choices[abilityChoiceKey])
      || choiceValue(choices[`${slotKey}_asi`])
      || choiceValue(choices[`${slotKey}_first_asi`]),
    );
    map.set(slotKey, { name: snapshot.name, ability, snapshot });
  };

  Object.entries(choices).forEach(([key, value]) => {
    if (!isFeatLikeSlotKey(C, key)) return;
    const selected = choiceValue(value);
    if (selected) addMeta(key, selected);
  });
  Object.entries(C?.normalizedChoices?.feats?.byKey || {}).forEach(([key, value]) => {
    addMeta(key, value);
  });
  Object.keys(choices).forEach((key) => {
    const slotKey = choiceSpellSlotKey(key);
    if (!slotKey || !isFeatLikeSlotKey(C, slotKey)) return;
    addMeta(slotKey, findFeatName(C, slotKey));
  });

  const mappedNames = new Set([...map.values()].map((meta) => lowerKey(meta.name)));
  snapshots.forEach((snapshot, index) => {
    if (!snapshot?.name || mappedNames.has(lowerKey(snapshot.name))) return;
    map.set(`feat_snapshot_${index}`, { name: snapshot.name, ability: null, snapshot });
  });
  return map;
}

// The spells each feat grants outright (its `additionalSpells` without a
// choice), reached at the character's level, with their free casts.
export function collectFixedFeatSpells(C) {
  const out = [];
  buildFeatMetaMap(C).forEach((meta, slotKey) => {
    const grants = enumerateFixedAdditionalSpells(meta.snapshot?.additionalSpells, {
      entryIndex: C?.choices?.[`${slotKey}_entry`],
      chosenAbility: meta.ability,
      spellOverrides: meta.snapshot?.spellGrantOverrides,
      defaultCanAlsoUseSlots: true,
    });
    grants.forEach((grant) => {
      if (Number(C?.level || 1) < Number(grant.minLevel || 1)) return;
      const freeCasts = grant.freeCast
        ? [normalizeFreeCast(grant.freeCast, {
            character: C,
            sourceType: 'feat',
            source: meta.name,
            spellName: grant.name,
          })].filter(Boolean)
        : [];
      out.push({
        name: grant.name,
        source: {
          label: meta.name,
          color: featSlotTone(slotKey),
          originType: 'feat',
          originLabel: meta.name,
        },
        ownerClassName: ownerClassFromChoiceKey(C, slotKey),
        spellcastingAbility: abilityKey(grant.ability || meta.ability),
        freeCasts,
        spellOverrides: grant.spellOverrides,
        modifiers: grant.modifiers,
      });
    });
  });
  return out;
}
