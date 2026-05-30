import { ShieldCheck, ShieldAlert, ShieldHalf } from 'lucide-react';

// Single source of truth for advantage / disadvantage visuals across
// AbilityScores, SavingThrows and Skills panels.
export const ADV_COLOR = '#70b7a6';
export const DISADV_COLOR = '#ff9800';
export const BOTH_COLOR = '#c4b393';

// Returns the icon + color + short label for a given adv/disadv state,
// or null when neither applies.
export function advantageVisual(hasAdv, hasDisadv) {
  if (hasAdv && hasDisadv) return { Icon: ShieldHalf, color: BOTH_COLOR, label: 'Adv+Disadv' };
  if (hasAdv) return { Icon: ShieldCheck, color: ADV_COLOR, label: 'Adv' };
  if (hasDisadv) return { Icon: ShieldAlert, color: DISADV_COLOR, label: 'Disadv' };
  return null;
}
