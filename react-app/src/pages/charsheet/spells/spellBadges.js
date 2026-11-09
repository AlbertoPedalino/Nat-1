import { ACTION_COLORS } from '../../../shared/ui/entityColors.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { SRC_COLOR } from './spellSourceDisplay.js';
import { spellCastUnit } from '../../../shared/character/spells/spellMeta.js';

// The small badges on a spell row: its preparation-status chip and its
// casting-time badge (A / BA / RE).

const STATUS_CHIP_CONFIG = {
  ritual_spellbook: { label: 'Ritual Book', color: SRC_COLOR.ritual },
  at_will: { label: 'At Will', color: SRC_COLOR.choice },
  mystic_arcanum: { label: 'M. Arcanum', color: SRC_COLOR.arcanum },
  granted: { label: 'Granted', color: SRC_COLOR.granted },
  known: { label: 'Known', color: SRC_COLOR.ritual },
};

export function getSpellStatusChips(entry) {
  const chips = [];
  if (entry.originType === 'item') return chips;
  const state = entry.preparationState;
  if (!state || !STATUS_CHIP_CONFIG[state]) return chips;
  if (entry.sourceInfo?.kind === 'ritualBook') return chips;
  if (entry.sourceInfo?.kind === 'atWill') return chips;
  if ((entry.originType === 'feat' || entry.originType === 'species') && state === 'granted') return chips;
  const cfg = STATUS_CHIP_CONFIG[state];
  chips.push({ key: state, label: cfg.label, color: cfg.color, bg: uiAlpha(cfg.color, OPACITY.soft) });
  return chips;
}

export function getCastBadge(spell) {
  const unit = spellCastUnit(spell);
  if (unit === 'bonus') return { label: 'BA', color: ACTION_COLORS.bonus };
  if (unit === 'reaction') return { label: 'RE', color: ACTION_COLORS.reaction };
  if (unit === 'action' || unit === '') return { label: 'A', color: ACTION_COLORS.action };
  // A minute or more: the record's own unit ("minute", "hour").
  return { label: spell.time[0].unit, color: UI_COLORS.textSecondary };
}
