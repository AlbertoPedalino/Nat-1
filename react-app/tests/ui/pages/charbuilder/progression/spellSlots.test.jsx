import { beforeAll, describe, expect, it } from 'vitest';
import { loadClassAdapters, loadCoreAdapters } from '../../../../../src/adapters/index.js';
import { getSpellSlots } from '../../../../../src/shared/character/spells/spellcasting.js';
import { activeClassCharacter } from '../../../../../src/pages/charbuilder/state/activeClass.js';

const extra = (name, level, subclassShortName = '') => ({ name, level, subclassShortName });

// The builder's character shape: `cls` objects and `extraClasses` with `name`.
describe('getSpellSlots for a builder character', () => {
  beforeAll(async () => {
    await loadCoreAdapters();
    await loadClassAdapters(['Artificer', 'Wizard', 'Paladin', 'Fighter', 'Warlock']);
  });

  it('uses the multiclass table when two classes have Spellcasting', () => {
    const character = { className: 'Artificer', classLevel: 3, level: 4, extraClasses: [extra('Wizard', 1)] };
    // Artificer 3 (ceil 3/2 = 2) + Wizard 1 = caster level 3 -> 4/2 slots.
    expect(getSpellSlots(character).regular.slice(0, 2)).toEqual([4, 2]);
  });

  it('uses the single class table when only one class has Spellcasting', () => {
    const character = { className: 'Paladin', classLevel: 3, level: 8, extraClasses: [extra('Fighter', 5)] };
    expect(getSpellSlots(character).regular[0]).toBe(3);
  });

  it('keeps Pact Magic separate and reads it from an extra Warlock class', () => {
    const character = { className: 'Paladin', classLevel: 3, level: 5, extraClasses: [extra('Warlock', 2)] };
    const result = getSpellSlots(character);
    expect(result.regular[0]).toBe(3);
    expect(result.pact).toMatchObject({ level: 1, count: 2 });
  });

  it('shows the active class tab on its own', () => {
    const character = {
      className: 'Paladin', classLevel: 3, level: 5, activeClassTab: 1, extraClasses: [extra('Warlock', 2)],
    };
    const result = getSpellSlots(activeClassCharacter(character));
    expect(result.regular.every((count) => !count)).toBe(true);
    expect(result.pact).toMatchObject({ level: 1, count: 2 });
  });
});
