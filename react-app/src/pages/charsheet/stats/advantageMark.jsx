import { UI_COLORS } from '../../../shared/ui/colors.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

// Single source of truth for advantage / disadvantage visuals across
// AbilityScores, SavingThrows and Skills panels.
export const ADV_COLOR = UI_COLORS.secondary;
export const DISADV_COLOR = UI_COLORS.penalty;
export const BOTH_COLOR = UI_COLORS.textSecondary;
// Auto-fail (Paralyzed/Stunned/etc.): worse than disadvantage, so red — not the
// disadvantage amber — to read as "you cannot pass", not "rolled at a penalty".
export const AUTOFAIL_COLOR = UI_COLORS.dangerStrong;
// Situational (conditional) disadvantage — applies only in a specific case
// (e.g. Frightened while the fear source is in sight), so it is shown as a hint
// and never forced onto the roll. Muted amber to read as "maybe", not "active".
export const CONDITIONAL_COLOR = UI_COLORS.accentMuted;

// Returns the icon + color + short label for a given adv/disadv state,
// or null when neither applies.
export function advantageVisual(hasAdv, hasDisadv) {
  if (hasAdv && hasDisadv) return { Icon: GAME_ICONS.advantageBoth, color: BOTH_COLOR, label: 'Adv+Disadv' };
  if (hasAdv) return { Icon: GAME_ICONS.advantage, color: ADV_COLOR, label: 'Adv' };
  if (hasDisadv) return { Icon: GAME_ICONS.disadvantage, color: DISADV_COLOR, label: 'Disadv' };
  return null;
}

// Visual for a situational disadvantage reminder (does not affect the roll).
export function conditionalDisadvantageVisual() {
  return { Icon: GAME_ICONS.situational, color: CONDITIONAL_COLOR, label: 'Situational Disadv' };
}

// Visual for an auto-failed roll (e.g. STR/DEX saves while Paralyzed).
export function autoFailVisual() {
  return { Icon: GAME_ICONS.autoFail, color: AUTOFAIL_COLOR, label: 'Auto-fail' };
}
