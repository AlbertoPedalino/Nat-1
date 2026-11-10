import { isRitualSpell } from '../../../shared/character/spells/spellTags.js';
import { normalizeWizardBook } from '../../../shared/character/spells/wizardBook.js';
import { matchKey } from '../../../shared/content/nameKeys.js';

// A wizard's spellbook: its stored shape, and the ritual spells in it that the
// wizard can cast as rituals without having them prepared.

// The ritual spells in a wizard bucket's spellbook (the main class or an
// extra class) that are not already among its selected spells of that level.
export function wizardRitualBookSpells(bucket, spellIndex) {
  const out = [];
  const selectedCantrips = bucket?.selectedCantrips || [];
  const selectedSpells = bucket?.selectedSpells || {};
  Object.entries(normalizeWizardBook(bucket?.wizardSpellbook)).forEach(([level, names]) => {
    const spellLevel = Number(level || 0);
    const selectedAtLevel = spellLevel === 0 ? selectedCantrips : (selectedSpells[spellLevel] || selectedSpells[String(spellLevel)] || []);
    (names || []).forEach((name) => {
      if (!name) return;
      if ((selectedAtLevel || []).some((entry) => matchKey(entry) === matchKey(name))) return;
      const full = spellIndex.get(matchKey(name));
      if (!isRitualSpell(full)) return;
      out.push({ name, level: spellLevel });
    });
  });
  return out;
}
