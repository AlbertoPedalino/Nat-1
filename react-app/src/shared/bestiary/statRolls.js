import { createContext, useContext } from 'react';
import { ABILITIES } from '../content/rulesVocabulary.js';

// A stat block's rollers hand their label along ("Attack Roll", "Dex Save",
// "STR Check", "Perception Check", "D20 Roll", "Damage", "HP"). The d20 tests
// among them are what advantage/disadvantage can touch; the kind decides which
// of the creature's conditions apply.
//
// Returns { kind, ability } for a d20 test (kind null when the text does not
// say which: a bare {@d20}), or null for anything that is not one.

export function d20RollKind(type) {
  const label = String(type || '').trim();
  if (/^attack roll$/i.test(label)) return { kind: 'attack', ability: null };
  const save = label.match(/^(\w+)\s+save$/i);
  if (save) {
    const ability = save[1].slice(0, 3).toLowerCase();
    return { kind: 'save', ability: ABILITIES.includes(ability) ? ability : null };
  }
  if (/\scheck$/i.test(label)) return { kind: 'check', ability: null };
  if (/^d20 roll$/i.test(label)) return { kind: null, ability: null };
  return null;
}

// The open stat block's `sourcesFor(type)`: the unfolded { adv, disadv } of
// the combatant it belongs to for that roll, or null when it is not a d20
// test. Absent outside a stat block, where rollers stay plain buttons.
export const StatRollContext = createContext(null);

export function useStatRollSources() {
  return useContext(StatRollContext);
}

// " ADV" / " DIS" after a roller whose creature rolls that way on its own;
// " DIS?" when only a situational disadvantage may apply (the sheet's tag).
export function advTag(advArg, situational = []) {
  if (advArg === true) return ' ADV';
  if (advArg === false) return ' DIS';
  return situational?.length ? ' DIS?' : '';
}

// The roller's tooltip for those situational disadvantages, or ''.
export function situationalNote(situational = []) {
  return situational?.length
    ? `Situational disadvantage: ${situational.map((c) => `${c.source} (${c.note})`).join('; ')}`
    : '';
}
