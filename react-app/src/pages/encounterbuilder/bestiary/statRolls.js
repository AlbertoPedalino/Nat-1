import { createContext, useContext } from 'react';

// A stat block's rollers hand their label along ("Attack Roll", "Dex Save",
// "STR Check", "Perception Check", "D20 Roll", "Damage", "HP"). The d20 tests
// among them are what advantage/disadvantage can touch; the kind decides which
// of the creature's conditions and effects apply.
//
// Returns { kind, ability } for a d20 test (kind null when the text does not
// say which: a bare {@d20}), or null for anything that is not one.

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

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

// " ADV" / " DIS" after a roller whose creature rolls that way on its own.
export function advTag(advArg) {
  if (advArg === true) return ' ADV';
  if (advArg === false) return ' DIS';
  return '';
}
