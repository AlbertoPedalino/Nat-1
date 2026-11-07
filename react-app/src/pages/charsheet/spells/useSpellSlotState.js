import { useEffect, useState } from 'react';
import {
  getPactSlotUsed, getPactSlotUsedKey, getRegularSlotUsed, persistCreatedSlots, persistUsedSlots,
} from '../../../shared/character/spells/spellSlots.js';

// The spell tab's slot pips: a local mirror of the sheet's used and created
// slots (reset whenever the sheet's copy changes) and the click that spends,
// recovers or drops one, written back through the sheet actions.
export function useSpellSlotState(sheet, { readOnly, onUpdateSheet, onUpdateCharacter }) {
  const [slotUsed, setSlotUsed] = useState(sheet?.spellSlotUsed || {});
  const [createdSlots, setCreatedSlots] = useState(sheet?.createdSpellSlots || {});

  useEffect(() => {
    setSlotUsed(sheet?.spellSlotUsed || {});
    setCreatedSlots(sheet?.createdSpellSlots || {});
  }, [sheet?.spellSlotUsed, sheet?.createdSpellSlots]);

  const toggleSlot = (level, total, index, createdCount, kind = 'regular') => {
    // Read-only sheets must not mutate the local slotUsed/createdSlots mirror:
    // the change never reaches the server, so showing a consumed slot would lie.
    if (readOnly) return;
    const key = kind === 'pact' ? getPactSlotUsedKey(level) : String(level);
    const used = kind === 'pact'
      ? getPactSlotUsed(slotUsed, level)
      : getRegularSlotUsed(slotUsed, level);
    if (kind === 'pact') {
      const nextUsed = index < used ? Math.max(0, index) : index + 1;
      const next = { ...slotUsed, [key]: Math.max(0, Math.min(total, nextUsed)) };
      setSlotUsed(next);
      persistUsedSlots(next, onUpdateSheet, onUpdateCharacter);
      return;
    }
    if (index >= total) {
      const created = createdCount || createdSlots[level] || 0;
      if (created <= 0) return;
      const next = { ...createdSlots };
      next[level] = created - 1;
      if (next[level] <= 0) delete next[level];
      setCreatedSlots(next);
      persistCreatedSlots(next, onUpdateSheet, onUpdateCharacter);
      return;
    }
    const nextUsed = index < used ? Math.max(0, index) : index + 1;
    const next = { ...slotUsed, [key]: nextUsed };
    setSlotUsed(next);
    persistUsedSlots(next, onUpdateSheet, onUpdateCharacter);
  };

  return { slotUsed, createdSlots, toggleSlot };
}
