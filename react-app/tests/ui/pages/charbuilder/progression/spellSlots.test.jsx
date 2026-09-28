import { describe, expect, it } from 'vitest';
import { getSpellSlots } from '../../../../../src/pages/charbuilder/progression/calculations.js';

const extra = (name, level, subclassShortName = '') => ({ name, level, subclassShortName });

describe('getSpellSlots', () => {
  it('uses the multiclass table when two classes have Spellcasting', () => {
    const character = { className: 'Artificer', classLevel: 3, level: 4, extraClasses: [extra('Wizard', 1)] };
    // Artificer 3 (ceil 3/2 = 2) + Wizard 1 = caster level 3 -> 4/2 slots.
    expect(getSpellSlots(character).slots.slice(0, 2)).toEqual([4, 2]);
  });

  it('uses the single class table when only one class has Spellcasting', () => {
    const character = { className: 'Paladin', classLevel: 3, level: 8, extraClasses: [extra('Fighter', 5)] };
    expect(getSpellSlots(character).slots[0]).toBe(3);
  });

  it('keeps Pact Magic separate and reads it from an extra Warlock class', () => {
    const character = { className: 'Paladin', classLevel: 3, level: 5, extraClasses: [extra('Warlock', 2)] };
    const result = getSpellSlots(character);
    expect(result.slots[0]).toBe(3);
    expect(result.pact).toMatchObject({ level: 1, slots: 2 });
  });
});
