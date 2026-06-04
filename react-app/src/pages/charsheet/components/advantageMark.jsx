import { ShieldCheck, ShieldAlert, ShieldHalf, ShieldQuestion, ShieldX } from 'lucide-react';

// Single source of truth for advantage / disadvantage visuals across
// AbilityScores, SavingThrows and Skills panels.
export const ADV_COLOR = '#70b7a6';
export const DISADV_COLOR = '#ff9800';
export const BOTH_COLOR = '#c4b393';
// Auto-fail (Paralyzed/Stunned/etc.): worse than disadvantage, so red — not the
// disadvantage amber — to read as "you cannot pass", not "rolled at a penalty".
export const AUTOFAIL_COLOR = '#e5484d';
// Situational (conditional) disadvantage — applies only in a specific case
// (e.g. Frightened while the fear source is in sight), so it is shown as a hint
// and never forced onto the roll. Muted amber to read as "maybe", not "active".
export const CONDITIONAL_COLOR = '#b9935a';

// Returns the icon + color + short label for a given adv/disadv state,
// or null when neither applies.
export function advantageVisual(hasAdv, hasDisadv) {
  if (hasAdv && hasDisadv) return { Icon: ShieldHalf, color: BOTH_COLOR, label: 'Adv+Disadv' };
  if (hasAdv) return { Icon: ShieldCheck, color: ADV_COLOR, label: 'Adv' };
  if (hasDisadv) return { Icon: ShieldAlert, color: DISADV_COLOR, label: 'Disadv' };
  return null;
}

// Visual for a situational disadvantage reminder (does not affect the roll).
export function conditionalDisadvantageVisual() {
  return { Icon: ShieldQuestion, color: CONDITIONAL_COLOR, label: 'Situational Disadv' };
}

// Visual for an auto-failed roll (e.g. STR/DEX saves while Paralyzed).
export function autoFailVisual() {
  return { Icon: ShieldX, color: AUTOFAIL_COLOR, label: 'Auto-fail' };
}
