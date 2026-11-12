import { useMemo, useState } from 'react';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { getSpellSlots } from '../../../shared/character/spells/spellcasting.js';
import {
  consumeSlot,
  lowestAvailableSlotLevel,
} from '../../../shared/character/spells/spellSlots.js';

// What a feature that can be paid "with one of its uses or with a spell slot"
// spends (Wild Companion, Eldritch Cannon). The player picks a way to pay with
// CostModeToggle; when the picked way has nothing left the other one is used,
// so the button always spends something valid. The slot is the lowest one
// still open.
//
// `usesLeft` is the feature's remaining uses, `resKey` the resource they are
// counted on. Returns the way that will be paid (`cost`: 'use' | 'slot'),
// whether each way and either is open, the slot level, and `spend()`, which
// pays and answers whether it could (false: the slot could not be expended).
export function useCostMode({ character, sheet, usesLeft, resKey, onResChange }) {
  const { onUpdateCharacter, onUpdateSheet } = useSheetActions();
  const [picked, setPicked] = useState('use');
  const regularSlots = useMemo(() => getSpellSlots(character)?.regular || [], [character]);
  const slotLevel = useMemo(() => lowestAvailableSlotLevel(regularSlots, sheet), [regularSlots, sheet]);
  const canUse = usesLeft > 0;
  const canSlot = slotLevel > 0;
  const canPay = canUse || canSlot;
  const cost = picked === 'slot'
    ? (canSlot ? 'slot' : 'use')
    : (canUse ? 'use' : 'slot');

  const spend = () => {
    if (!canPay) return false;
    if (cost === 'slot') return consumeSlot(regularSlots, sheet, slotLevel, onUpdateSheet, onUpdateCharacter);
    if (typeof onResChange === 'function') onResChange(resKey, -1);
    return true;
  };

  return { cost, setCost: setPicked, usesLeft, slotLevel, canUse, canSlot, canPay, spend };
}
